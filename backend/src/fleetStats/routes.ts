import { Router } from "express";
import { db } from "../../config/firestore.js";
import { HttpError, sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";
import { recalculateFleetStats } from "./service.js";

export const fleetStatsRouter = Router();

fleetStatsRouter.get("/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    if (req.companyId !== companyId) {
      throw new HttpError(403, "Company mismatch");
    }
    const snap = await db.collection("fleetStats").doc(companyId).get();
    if (!snap.exists) {
      await recalculateFleetStats(companyId);
      const again = await db.collection("fleetStats").doc(companyId).get();
      const data = again.data()!;
      return res.json({
        id: again.id,
        ...data,
        updatedAt: serializeTimestamp(data.updatedAt),
      });
    }
    const data = snap.data()!;
    return res.json({
      id: snap.id,
      ...data,
      updatedAt: serializeTimestamp(data.updatedAt),
    });
  } catch (e) {
    return sendError(res, e);
  }
});

fleetStatsRouter.post("/:companyId/recalculate", async (req, res) => {
  try {
    const { companyId } = req.params;
    if (req.companyId !== companyId) {
      throw new HttpError(403, "Company mismatch");
    }
    await recalculateFleetStats(companyId);
    const snap = await db.collection("fleetStats").doc(companyId).get();
    const data = snap.data()!;
    return res.json({
      id: snap.id,
      ...data,
      updatedAt: serializeTimestamp(data.updatedAt),
    });
  } catch (e) {
    return sendError(res, e);
  }
});
