import { Router } from "express";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import type { DriverStatus } from "../common/types.js";

export const driversRouter = Router();

driversRouter.get("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const snap = await db
      .collection("drivers")
      .where("companyId", "==", companyId)
      .get();
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.json(list);
  } catch (e) {
    return sendError(res, e);
  }
});

driversRouter.post("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const body = req.body as Record<string, unknown>;
    const name = body.name;
    const phone = body.phone;
    const license = body.license;
    if (typeof name !== "string" || typeof phone !== "string" || typeof license !== "string") {
      throw new HttpError(400, "name, phone, and license are required strings");
    }
    const ref = db.collection("drivers").doc();
    const status = (body.status as DriverStatus) ?? "OFF_DUTY";
    await ref.set({
      companyId,
      name,
      phone,
      license,
      assignedVehicleId:
        typeof body.assignedVehicleId === "string" ? body.assignedVehicleId : null,
      status,
    });
    const snap = await ref.get();
    return res.status(201).json({ id: snap.id, ...snap.data() });
  } catch (e) {
    return sendError(res, e);
  }
});

driversRouter.get("/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const snap = await db.collection("drivers").doc(driverId).get();
    if (!snap.exists) {
      throw new HttpError(404, "Driver not found");
    }
    const data = snap.data()!;
    if (data.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    return res.json({ id: snap.id, ...data });
  } catch (e) {
    return sendError(res, e);
  }
});

driversRouter.patch("/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const ref = db.collection("drivers").doc(driverId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Driver not found");
    }
    if (snap.data()!.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    const body = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "phone", "license", "assignedVehicleId", "status"] as const) {
      if (k in body) {
        if (body[k] === null && k === "assignedVehicleId") {
          patch[k] = null;
        } else if (typeof body[k] === "string") {
          patch[k] = body[k];
        }
      }
    }
    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "No valid fields to update");
    }
    await ref.update(patch);
    const updated = await ref.get();
    return res.json({ id: updated.id, ...updated.data() });
  } catch (e) {
    return sendError(res, e);
  }
});

driversRouter.delete("/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const ref = db.collection("drivers").doc(driverId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Driver not found");
    }
    if (snap.data()!.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    await ref.delete();
    return res.status(204).send();
  } catch (e) {
    return sendError(res, e);
  }
});
