import { Router } from "express";
import type { DocumentData, Query } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";
import { recalculateFleetStats } from "../fleetStats/service.js";
import type { DeliveryStatus } from "../common/types.js";

export const deliveriesRouter = Router();

function toJson(id: string, data: DocumentData) {
  return {
    id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    startedAt: serializeTimestamp(data.startedAt),
    completedAt: serializeTimestamp(data.completedAt),
  };
}

deliveriesRouter.get("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const status = req.query.status as string | undefined;
    let q: Query = db.collection("deliveries").where("companyId", "==", companyId);
    if (status) {
      q = q.where("status", "==", status);
    }
    const snap = await q.get();
    return res.json(snap.docs.map((d) => toJson(d.id, d.data())));
  } catch (e) {
    return sendError(res, e);
  }
});

deliveriesRouter.post("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const body = req.body as Record<string, unknown>;
    const vehicleId = body.vehicleId;
    const driverId = body.driverId;
    const pickup = body.pickup as { lat?: number; lng?: number } | undefined;
    const dropoff = body.dropoff as { lat?: number; lng?: number } | undefined;
    if (
      typeof vehicleId !== "string" ||
      typeof driverId !== "string" ||
      typeof pickup?.lat !== "number" ||
      typeof pickup?.lng !== "number" ||
      typeof dropoff?.lat !== "number" ||
      typeof dropoff?.lng !== "number"
    ) {
      throw new HttpError(
        400,
        "vehicleId, driverId, pickup {lat,lng}, dropoff {lat,lng} are required"
      );
    }
    const ref = db.collection("deliveries").doc();
    const status = (body.status as DeliveryStatus) ?? "PENDING";
    await ref.set({
      companyId,
      vehicleId,
      driverId,
      status,
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      completedAt: null,
    });
    await recalculateFleetStats(companyId);
    const snap = await ref.get();
    return res.status(201).json(toJson(snap.id, snap.data()!));
  } catch (e) {
    return sendError(res, e);
  }
});

deliveriesRouter.get("/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const snap = await db.collection("deliveries").doc(deliveryId).get();
    if (!snap.exists) {
      throw new HttpError(404, "Delivery not found");
    }
    const data = snap.data()!;
    if (data.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    return res.json(toJson(snap.id, data));
  } catch (e) {
    return sendError(res, e);
  }
});

deliveriesRouter.patch("/:deliveryId", async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const ref = db.collection("deliveries").doc(deliveryId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Delivery not found");
    }
    const existing = snap.data()!;
    if (existing.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof body.status === "string") patch.status = body.status;
    if (body.pickup && typeof body.pickup === "object") {
      const p = body.pickup as { lat?: number; lng?: number };
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        patch.pickup = { lat: p.lat, lng: p.lng };
      }
    }
    if (body.dropoff && typeof body.dropoff === "object") {
      const p = body.dropoff as { lat?: number; lng?: number };
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        patch.dropoff = { lat: p.lat, lng: p.lng };
      }
    }
    if (body.startedAt === "now") patch.startedAt = FieldValue.serverTimestamp();
    if (body.completedAt === "now") patch.completedAt = FieldValue.serverTimestamp();
    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "No valid fields to update");
    }
    await ref.update(patch);
    await recalculateFleetStats(req.companyId!);
    const updated = await ref.get();
    return res.json(toJson(updated.id, updated.data()!));
  } catch (e) {
    return sendError(res, e);
  }
});
