import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";

export const companiesRouter = Router();

companiesRouter.post("/", async (req, res) => {
  try {
    const { name, plan } = req.body as { name?: string; plan?: string };
    if (!name || typeof name !== "string") {
      throw new HttpError(400, "name is required");
    }
    const companyId = req.companyId!;
    const ref = db.collection("companies").doc(companyId);
    await ref.set({
      name,
      plan: typeof plan === "string" ? plan : "FREE",
      vehicleCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    const data = snap.data()!;
    return res.status(201).json({
      id: snap.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt),
    });
  } catch (e) {
    return sendError(res, e);
  }
});

companiesRouter.get("/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    if (req.companyId !== companyId) {
      throw new HttpError(403, "Company mismatch");
    }
    const snap = await db.collection("companies").doc(companyId).get();
    if (!snap.exists) {
      throw new HttpError(404, "Company not found");
    }
    const data = snap.data()!;
    return res.json({
      id: snap.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt),
    });
  } catch (e) {
    return sendError(res, e);
  }
});

companiesRouter.patch("/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    if (req.companyId !== companyId) {
      throw new HttpError(403, "Company mismatch");
    }
    const { name, plan, vehicleCount } = req.body as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof name === "string") patch.name = name;
    if (typeof plan === "string") patch.plan = plan;
    if (typeof vehicleCount === "number") patch.vehicleCount = vehicleCount;
    if (Object.keys(patch).length === 0) {
      throw new HttpError(400, "No valid fields to update");
    }
    await db.collection("companies").doc(companyId).set(patch, { merge: true });
    const snap = await db.collection("companies").doc(companyId).get();
    const data = snap.data()!;
    return res.json({
      id: snap.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt),
    });
  } catch (e) {
    return sendError(res, e);
  }
});
