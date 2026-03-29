import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";
import { recalculateFleetStats } from "../fleetStats/service.js";
import type { DocumentData, Query } from "firebase-admin/firestore";
import type { VehicleStatus } from "../common/types.js";

export const vehiclesRouter = Router();

function vehicleToJson(id: string, data: DocumentData) {
  return {
    id,
    ...data,
    lastUpdate: serializeTimestamp(data.lastUpdate),
  };
}

vehiclesRouter.get("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const status = req.query.status as string | undefined;
    let q: Query = db.collection("vehicles").where("companyId", "==", companyId);
    if (status) {
      q = q.where("status", "==", status);
    }
    const snap = await q.get();
    const list = snap.docs.map((d) => vehicleToJson(d.id, d.data()));
    return res.json(list);
  } catch (e) {
    return sendError(res, e);
  }
});

vehiclesRouter.post("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const body = req.body as Record<string, unknown>;
    const plate = body.plate;
    const model = body.model;
    if (typeof plate !== "string" || typeof model !== "string") {
      throw new HttpError(400, "plate and model are required strings");
    }
    const ref = db.collection("vehicles").doc();
    const status = (body.status as VehicleStatus) ?? "IDLE";
    const location = body.location as { lat?: number; lng?: number } | undefined;
    const lat = typeof location?.lat === "number" ? location.lat : 0;
    const lng = typeof location?.lng === "number" ? location.lng : 0;

    await ref.set({
      companyId,
      driverId: typeof body.driverId === "string" ? body.driverId : null,
      status,
      plate,
      model,
      year: typeof body.year === "number" ? body.year : null,
      location: { lat, lng },
      speed: typeof body.speed === "number" ? body.speed : 0,
      heading: typeof body.heading === "number" ? body.heading : 0,
      fuelLevel: typeof body.fuelLevel === "number" ? body.fuelLevel : 0,
      lastUpdate: FieldValue.serverTimestamp(),
      activeDeliveryId:
        typeof body.activeDeliveryId === "string" ? body.activeDeliveryId : null,
    });

    await recalculateFleetStats(companyId);

    const snap = await ref.get();
    return res.status(201).json(vehicleToJson(snap.id, snap.data()!));
  } catch (e) {
    return sendError(res, e);
  }
});

vehiclesRouter.get("/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const ref = db.collection("vehicles").doc(vehicleId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Vehicle not found");
    }
    const data = snap.data()!;
    if (data.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    return res.json(vehicleToJson(snap.id, data));
  } catch (e) {
    return sendError(res, e);
  }
});

vehiclesRouter.patch("/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const ref = db.collection("vehicles").doc(vehicleId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Vehicle not found");
    }
    const existing = snap.data()!;
    if (existing.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }

    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const keys = [
      "driverId",
      "status",
      "plate",
      "model",
      "year",
      "speed",
      "heading",
      "fuelLevel",
      "activeDeliveryId",
    ] as const;
    for (const k of keys) {
      if (k in body) {
        if (k === "year" && typeof body.year === "number") patch.year = body.year;
        else if (k === "year" && body.year === null) patch.year = null;
        else if (typeof body[k] === "string" || typeof body[k] === "number") {
          patch[k] = body[k];
        } else if (body[k] === null && (k === "driverId" || k === "activeDeliveryId")) {
          patch[k] = null;
        }
      }
    }
    if (body.location && typeof body.location === "object") {
      const loc = body.location as { lat?: number; lng?: number };
      if (typeof loc.lat === "number" && typeof loc.lng === "number") {
        patch.location = { lat: loc.lat, lng: loc.lng };
      }
    }
    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "No valid fields to update");
    }
    patch.lastUpdate = FieldValue.serverTimestamp();

    await ref.update(patch);
    await recalculateFleetStats(req.companyId!);

    const updated = await ref.get();
    return res.json(vehicleToJson(updated.id, updated.data()!));
  } catch (e) {
    return sendError(res, e);
  }
});

/** Telemetry: append subcollection + update hot vehicle doc */
vehiclesRouter.post("/:vehicleId/location", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicleRef = db.collection("vehicles").doc(vehicleId);
    const vSnap = await vehicleRef.get();
    if (!vSnap.exists) {
      throw new HttpError(404, "Vehicle not found");
    }
    const v = vSnap.data()!;
    if (v.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }

    const body = req.body as {
      lat?: number;
      lng?: number;
      speed?: number;
      heading?: number;
      fuel?: number;
    };
    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      throw new HttpError(400, "lat and lng are required numbers");
    }
    const speed = typeof body.speed === "number" ? body.speed : v.speed ?? 0;
    const heading = typeof body.heading === "number" ? body.heading : v.heading ?? 0;
    const fuel = typeof body.fuel === "number" ? body.fuel : v.fuelLevel ?? 0;

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

vehiclesRouter.delete("/:vehicleId", async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const ref = db.collection("vehicles").doc(vehicleId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Vehicle not found");
    }
    if (snap.data()!.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    await ref.delete();
    await recalculateFleetStats(req.companyId!);
    return res.status(204).send();
  } catch (e) {
    return sendError(res, e);
  }
});
