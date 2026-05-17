import { Router } from "express";
import { db } from "../../config/firestore.js";
import { sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";

export const publicRouter = Router();

/** Unauthenticated customer tracking (share link). */
publicRouter.get("/track/:token", async (req, res) => {
  try {
    const token = req.params.token;
    if (typeof token !== "string" || token.length < 16) {
      return res.status(400).json({ error: "Invalid tracking token" });
    }
    const snap = await db
      .collection("deliveries")
      .where("trackingToken", "==", token)
      .limit(1)
      .get();
    if (snap.empty) {
      return res.status(404).json({ error: "Delivery not found" });
    }
    const doc = snap.docs[0];
    const d = doc.data()!;
    const companySnap = await db.collection("companies").doc(d.companyId as string).get();
    const companyName = companySnap.exists ? String(companySnap.data()!.name ?? "Fleet") : "Fleet";

    const vehicleSnap = await db.collection("vehicles").doc(d.vehicleId as string).get();
    let vehiclePlate: string | null = null;
    let vehicleLocation: { lat: number; lng: number } | null = null;
    let vehicleSpeed: number | null = null;
    if (vehicleSnap.exists) {
      const v = vehicleSnap.data()!;
      vehiclePlate = typeof v.plate === "string" ? v.plate : null;
      const loc = v.location as { lat?: number; lng?: number } | undefined;
      if (typeof loc?.lat === "number" && typeof loc?.lng === "number") {
        vehicleLocation = { lat: loc.lat, lng: loc.lng };
      }
      if (typeof v.speed === "number") vehicleSpeed = v.speed;
    }

    return res.json({
      deliveryId: doc.id,
      companyName,
      status: d.status,
      pickup: d.pickup,
      dropoff: d.dropoff,
      vehiclePlate,
      vehicleLocation,
      vehicleSpeed,
      startedAt: serializeTimestamp(d.startedAt),
      completedAt: serializeTimestamp(d.completedAt),
      createdAt: serializeTimestamp(d.createdAt),
    });
  } catch (e) {
    return sendError(res, e);
  }
});
