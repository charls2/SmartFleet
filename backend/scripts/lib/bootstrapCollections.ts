import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Internal doc id used only to materialize collection paths in the console.
 * Omitted from normal API results because tenant queries use `companyId == …`
 * and these docs have no `companyId`.
 */
export const BOOTSTRAP_DOC_ID = "_smartfleet_bootstrap";

/**
 * Firestore has no "create empty collection" API — collections appear when the first
 * document is written. This writes minimal docs so every planned path exists:
 *
 * Root: companies, vehicles, drivers, deliveries, alerts, fleetStats
 * Sub:  vehicles/{bootstrap}/telemetry
 */
export async function ensureBootstrapCollections(db: Firestore): Promise<void> {
  const meta = {
    _smartfleetBootstrap: true,
    purpose:
      "Collection path initializer — safe to keep; not returned by company-scoped API queries",
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();

  batch.set(db.collection("companies").doc(BOOTSTRAP_DOC_ID), meta, { merge: true });
  batch.set(db.collection("drivers").doc(BOOTSTRAP_DOC_ID), meta, { merge: true });
  batch.set(db.collection("deliveries").doc(BOOTSTRAP_DOC_ID), meta, { merge: true });
  batch.set(db.collection("alerts").doc(BOOTSTRAP_DOC_ID), meta, { merge: true });
  batch.set(db.collection("fleetStats").doc(BOOTSTRAP_DOC_ID), meta, { merge: true });

  const anchorVehicle = db.collection("vehicles").doc(BOOTSTRAP_DOC_ID);
  batch.set(
    anchorVehicle,
    {
      ...meta,
      plate: "_bootstrap_",
      model: "_bootstrap_",
      status: "OFFLINE",
      location: { lat: 0, lng: 0 },
      speed: 0,
      heading: 0,
      fuelLevel: 0,
      lastUpdate: FieldValue.serverTimestamp(),
      driverId: null,
      activeDeliveryId: null,
    },
    { merge: true }
  );

  batch.set(
    anchorVehicle.collection("telemetry").doc(BOOTSTRAP_DOC_ID),
    {
      _smartfleetBootstrap: true,
      lat: 0,
      lng: 0,
      speed: 0,
      heading: 0,
      fuel: 0,
      timestamp: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}
