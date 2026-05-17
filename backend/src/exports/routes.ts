import { Router } from "express";
import { db } from "../../config/firestore.js";
import { sendError } from "../common/errors.js";
import { serializeTimestamp } from "../common/serialize.js";

export const exportsRouter = Router();

function csvEscape(cell: string) {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/** CSV export of vehicles for analytics / reporting. */
exportsRouter.get("/vehicles.csv", async (req, res) => {
  try {
    const companyId = req.companyId!;
    const snap = await db.collection("vehicles").where("companyId", "==", companyId).get();
    const header = [
      "id",
      "plate",
      "model",
      "year",
      "status",
      "lat",
      "lng",
      "speed",
      "fuelLevel",
      "odometerMiles",
      "serviceIntervalMiles",
      "lastServiceOdometerMiles",
      "lastUpdate",
    ];
    const lines = [header.join(",")];
    for (const d of snap.docs) {
      const v = d.data();
      const loc = v.location as { lat?: number; lng?: number } | undefined;
      const lastUpdate = serializeTimestamp(v.lastUpdate);
      const row = [
        d.id,
        String(v.plate ?? ""),
        String(v.model ?? ""),
        v.year != null ? String(v.year) : "",
        String(v.status ?? ""),
        loc?.lat != null ? String(loc.lat) : "",
        loc?.lng != null ? String(loc.lng) : "",
        v.speed != null ? String(v.speed) : "",
        v.fuelLevel != null ? String(v.fuelLevel) : "",
        v.odometerMiles != null ? String(v.odometerMiles) : "",
        v.serviceIntervalMiles != null ? String(v.serviceIntervalMiles) : "",
        v.lastServiceOdometerMiles != null ? String(v.lastServiceOdometerMiles) : "",
        lastUpdate ?? "",
      ].map((c) => csvEscape(c));
      lines.push(row.join(","));
    }
    const body = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="vehicles.csv"');
    return res.send(body);
  } catch (e) {
    return sendError(res, e);
  }
});
