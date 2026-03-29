import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentData, Query } from "firebase-admin/firestore";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";
import { recalculateFleetStats } from "../fleetStats/service.js";
import type { AlertSeverity } from "../common/types.js";

export const alertsRouter = Router();

function toJson(id: string, data: DocumentData) {
  return {
    id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
  };
}

alertsRouter.get("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const resolved = req.query.resolved;
    let q: Query = db.collection("alerts").where("companyId", "==", companyId);
    if (resolved === "false" || resolved === "0") {
      q = q.where("resolved", "==", false);
    } else if (resolved === "true" || resolved === "1") {
      q = q.where("resolved", "==", true);
    }
    const snap = await q.get();
    const list = snap.docs.map((d) => toJson(d.id, d.data()));
    list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return res.json(list);
  } catch (e) {
    return sendError(res, e);
  }
});

alertsRouter.post("/", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const body = req.body as Record<string, unknown>;
    const vehicleId = body.vehicleId;
    const type = body.type;
    if (typeof vehicleId !== "string" || typeof type !== "string") {
      throw new HttpError(400, "vehicleId and type are required strings");
    }
    const severity = (body.severity as AlertSeverity) ?? "MEDIUM";
    const ref = db.collection("alerts").doc();
    await ref.set({
      companyId,
      vehicleId,
      type,
      severity,
      createdAt: FieldValue.serverTimestamp(),
      resolved: false,
    });
    await recalculateFleetStats(companyId);
    const snap = await ref.get();
    return res.status(201).json(toJson(snap.id, snap.data()!));
  } catch (e) {
    return sendError(res, e);
  }
});

alertsRouter.patch("/:alertId", async (req, res) => {
  try {
    const { alertId } = req.params;
    const ref = db.collection("alerts").doc(alertId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpError(404, "Alert not found");
    }
    const existing = snap.data()!;
    if (existing.companyId !== req.companyId) {
      throw new HttpError(403, "Forbidden");
    }
    const body = req.body as { resolved?: boolean };
    if (typeof body.resolved !== "boolean") {
      throw new HttpError(400, "resolved boolean is required");
    }
    await ref.update({ resolved: body.resolved });
    await recalculateFleetStats(req.companyId!);
    const updated = await ref.get();
    return res.json(toJson(updated.id, updated.data()!));
  } catch (e) {
    return sendError(res, e);
  }
});
