import { Router } from "express";
import type { DocumentData } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";
import { recalculateFleetStats } from "../fleetStats/service.js";
import type { DeliveryStatus } from "../common/types.js";

export const driverRouter = Router();

driverRouter.use((req, res, next) => {
  if (req.userRole !== "driver") {
    return res.status(403).json({ error: "Driver role required" });
  }
  if (!req.linkedDriverId) {
    return res.status(403).json({ error: "No driver profile linked to this account" });
  }
  next();
});

function vehicleJson(id: string, data: DocumentData) {
  return {
    id,
    plate: data.plate,
    model: data.model,
    status: data.status,
    location: data.location,
    speed: data.speed,
    heading: data.heading,
    fuelLevel: data.fuelLevel,
    lastUpdate: serializeTimestamp(data.lastUpdate),
  };
}

function deliveryJson(id: string, data: DocumentData, vehicle?: DocumentData & { id: string }) {
  return {
    id,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    status: data.status,
    pickup: data.pickup,
    dropoff: data.dropoff,
    pickupLabel: data.pickupLabel ?? null,
    dropoffLabel: data.dropoffLabel ?? null,
    orderNotes: data.orderNotes ?? null,
    createdAt: serializeTimestamp(data.createdAt),
    startedAt: serializeTimestamp(data.startedAt),
    completedAt: serializeTimestamp(data.completedAt),
    vehicle: vehicle ?? null,
  };
}

const STATUS_ORDER: Record<string, number> = {
  IN_PROGRESS: 0,
  PENDING: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

driverRouter.get("/me", async (req, res) => {
  try {
    const driverSnap = await db.collection("drivers").doc(req.linkedDriverId!).get();
    if (!driverSnap.exists) {
      throw new HttpError(404, "Driver profile not found");
    }
    const dr = driverSnap.data()!;
    if (dr.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    const companySnap = await db.collection("companies").doc(req.companyId!).get();
    const co = companySnap.exists ? companySnap.data()! : null;

    let vehicle = null;
    if (dr.assignedVehicleId) {
      const vSnap = await db.collection("vehicles").doc(dr.assignedVehicleId as string).get();
      if (vSnap.exists && vSnap.data()!.companyId === req.companyId) {
        vehicle = vehicleJson(vSnap.id, vSnap.data()!);
      }
    }

    return res.json({
      id: driverSnap.id,
      name: dr.name,
      phone: dr.phone,
      status: dr.status,
      license: dr.license,
      assignedVehicleId: dr.assignedVehicleId ?? null,
      companyName: co ? String(co.name ?? "") : "",
      vehicle,
    });
  } catch (e) {
    return sendError(res, e);
  }
});

driverRouter.get("/vehicle", async (req, res) => {
  try {
    const driverSnap = await db.collection("drivers").doc(req.linkedDriverId!).get();
    if (!driverSnap.exists) {
      throw new HttpError(404, "Driver profile not found");
    }
    const dr = driverSnap.data()!;
    let vehicleId = dr.assignedVehicleId as string | null | undefined;
    if (!vehicleId) {
      const active = await db
        .collection("deliveries")
        .where("driverId", "==", req.linkedDriverId!)
        .where("status", "==", "IN_PROGRESS")
        .limit(1)
        .get();
      if (!active.empty) {
        vehicleId = active.docs[0].data().vehicleId as string;
      }
    }
    if (!vehicleId) {
      return res.json(null);
    }
    const vSnap = await db.collection("vehicles").doc(vehicleId).get();
    if (!vSnap.exists || vSnap.data()!.companyId !== req.companyId) {
      return res.json(null);
    }
    return res.json(vehicleJson(vSnap.id, vSnap.data()!));
  } catch (e) {
    return sendError(res, e);
  }
});

driverRouter.get("/deliveries", async (req, res) => {
  try {
    const snap = await db
      .collection("deliveries")
      .where("driverId", "==", req.linkedDriverId!)
      .get();
    const vehicleCache = new Map<string, ReturnType<typeof vehicleJson>>();

    async function vehicleFor(id: string) {
      if (vehicleCache.has(id)) return vehicleCache.get(id)!;
      const vSnap = await db.collection("vehicles").doc(id).get();
      if (!vSnap.exists || vSnap.data()!.companyId !== req.companyId) {
        return null;
      }
      const json = vehicleJson(vSnap.id, vSnap.data()!);
      vehicleCache.set(id, json);
      return json;
    }

    const list = await Promise.all(
      snap.docs
        .filter((d) => d.data().companyId === req.companyId)
        .map(async (d) => {
          const data = d.data();
          const veh = typeof data.vehicleId === "string" ? await vehicleFor(data.vehicleId) : null;
          return deliveryJson(d.id, data, veh ?? undefined);
        })
    );

    list.sort((a, b) => {
      const sa = STATUS_ORDER[a.status as string] ?? 9;
      const sb = STATUS_ORDER[b.status as string] ?? 9;
      if (sa !== sb) return sa - sb;
      return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
    });

    return res.json(list);
  } catch (e) {
    return sendError(res, e);
  }
});

driverRouter.patch("/deliveries/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const ref = db.collection("deliveries").doc(deliveryId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Delivery not found");
    }
    const existing = snap.data()!;
    if (existing.companyId !== req.companyId || existing.driverId !== req.linkedDriverId) {
      throw new HttpError(403, "Forbidden");
    }
    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof body.status === "string") patch.status = body.status as DeliveryStatus;
    if (body.startedAt === "now") patch.startedAt = FieldValue.serverTimestamp();
    if (body.completedAt === "now") patch.completedAt = FieldValue.serverTimestamp();
    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "No valid fields to update");
    }
    await ref.update(patch);

    if (patch.status === "IN_PROGRESS") {
      await db.collection("drivers").doc(req.linkedDriverId!).update({ status: "DRIVING" });
      await db.collection("vehicles").doc(existing.vehicleId as string).update({
        activeDeliveryId: deliveryId,
        driverId: req.linkedDriverId,
        status: "ACTIVE",
      });
    }
    if (patch.status === "COMPLETED") {
      await db.collection("vehicles").doc(existing.vehicleId as string).update({
        activeDeliveryId: null,
        status: "IDLE",
      });
    }

    await recalculateFleetStats(req.companyId!);
    const updated = await ref.get();
    const vehSnap = await db.collection("vehicles").doc(updated.data()!.vehicleId as string).get();
    const veh =
      vehSnap.exists && vehSnap.data()!.companyId === req.companyId
        ? vehicleJson(vehSnap.id, vehSnap.data()!)
        : undefined;
    return res.json(deliveryJson(updated.id, updated.data()!, veh));
  } catch (e) {
    return sendError(res, e);
  }
});

/** Update assigned (or active delivery) vehicle position from the driver device. */
driverRouter.post("/location", async (req, res) => {
  try {
    const body = req.body as {
      lat?: number;
      lng?: number;
      speed?: number;
      heading?: number;
    };
    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      throw new HttpError(400, "lat and lng are required numbers");
    }

    const driverSnap = await db.collection("drivers").doc(req.linkedDriverId!).get();
    const dr = driverSnap.data()!;
    let vehicleId = dr.assignedVehicleId as string | null | undefined;
    if (!vehicleId) {
      const active = await db
        .collection("deliveries")
        .where("driverId", "==", req.linkedDriverId!)
        .where("status", "==", "IN_PROGRESS")
        .limit(1)
        .get();
      if (!active.empty) vehicleId = active.docs[0].data().vehicleId as string;
    }
    if (!vehicleId) {
      throw new HttpError(400, "No vehicle assigned for location updates");
    }

    const vehicleRef = db.collection("vehicles").doc(vehicleId);
    const vSnap = await vehicleRef.get();
    if (!vSnap.exists || vSnap.data()!.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    const v = vSnap.data()!;
    const speed = typeof body.speed === "number" ? body.speed : (v.speed as number) ?? 0;
    const heading = typeof body.heading === "number" ? body.heading : (v.heading as number) ?? 0;
    const fuel = (v.fuelLevel as number) ?? 0;

    const telRef = vehicleRef.collection("telemetry").doc();
    const batch = db.batch();
    batch.set(telRef, {
      lat: body.lat,
      lng: body.lng,
      speed,
      heading,
      fuel,
      timestamp: FieldValue.serverTimestamp(),
    });
    batch.update(vehicleRef, {
      location: { lat: body.lat, lng: body.lng },
      speed,
      heading,
      fuelLevel: fuel,
      lastUpdate: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return res.status(204).send();
  } catch (e) {
    return sendError(res, e);
  }
});
