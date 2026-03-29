import { FieldValue } from "firebase-admin/firestore";
import { db } from "../../config/firestore.js";

/**
 * Recomputes aggregate dashboard doc for a company (call after vehicle/delivery/alert changes).
 */
export async function recalculateFleetStats(companyId: string): Promise<void> {
  const vehiclesSnap = await db
    .collection("vehicles")
    .where("companyId", "==", companyId)
    .get();

  let activeVehicles = 0;
  let idleVehicles = 0;
  for (const d of vehiclesSnap.docs) {
    const status = d.data().status as string | undefined;
    if (status === "ACTIVE") activeVehicles++;
    else if (status === "IDLE") idleVehicles++;
  }

  const deliveriesSnap = await db
    .collection("deliveries")
    .where("companyId", "==", companyId)
    .where("status", "==", "IN_PROGRESS")
    .get();

  const alertsSnap = await db
    .collection("alerts")
    .where("companyId", "==", companyId)
    .where("resolved", "==", false)
    .get();

  await db
    .collection("fleetStats")
    .doc(companyId)
    .set(
      {
        activeVehicles,
        idleVehicles,
        deliveriesInProgress: deliveriesSnap.size,
        alertsOpen: alertsSnap.size,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}
