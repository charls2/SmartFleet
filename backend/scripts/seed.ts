/**
 * Populates Firestore with demo collections matching the SmartFleet schema.
 * Run from backend/: npm run seed
 */
import "dotenv/config";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firestore.js";
import { recalculateFleetStats } from "../src/fleetStats/service.js";

const COMPANY_ID = "cmp_1";

async function main() {
  console.log(`Seeding Firestore with project (from env/credentials): ${process.env.GCLOUD_PROJECT ?? "see service account"}`);

  const companyRef = db.collection("companies").doc(COMPANY_ID);
  await companyRef.set({
    name: "Smart Logistics Inc",
    plan: "PRO",
    vehicleCount: 2,
    createdAt: FieldValue.serverTimestamp(),
  });

  const driver1 = db.collection("drivers").doc("drv_1");
  const driver2 = db.collection("drivers").doc("drv_2");
  await driver1.set({
    companyId: COMPANY_ID,
    name: "John Doe",
    phone: "+15140000000",
    license: "QC123456",
    assignedVehicleId: "veh_1",
    status: "DRIVING",
  });
  await driver2.set({
    companyId: COMPANY_ID,
    name: "Jane Smith",
    phone: "+15145550123",
    license: "QC789012",
    assignedVehicleId: null,
    status: "OFF_DUTY",
  });

  const veh1 = db.collection("vehicles").doc("veh_1");
  const veh2 = db.collection("vehicles").doc("veh_2");

  await veh1.set({
    companyId: COMPANY_ID,
    driverId: "drv_1",
    status: "ACTIVE",
    plate: "ABC123",
    model: "Ford Transit",
    year: 2022,
    location: { lat: 45.5017, lng: -73.5673 },
    speed: 42,
    heading: 120,
    fuelLevel: 63,
    lastUpdate: FieldValue.serverTimestamp(),
    activeDeliveryId: "del_1",
  });

  await veh2.set({
    companyId: COMPANY_ID,
    driverId: null,
    status: "IDLE",
    plate: "XYZ789",
    model: "Mercedes Sprinter",
    year: 2021,
    location: { lat: 45.51, lng: -73.55 },
    speed: 0,
    heading: 0,
    fuelLevel: 82,
    lastUpdate: FieldValue.serverTimestamp(),
    activeDeliveryId: null,
  });

  // Telemetry subcollection (append-only samples; small docs)
  const telCol = veh1.collection("telemetry");
  const t1 = Timestamp.fromDate(new Date(Date.now() - 120_000));
  const t2 = Timestamp.fromDate(new Date(Date.now() - 60_000));
  const t3 = Timestamp.now();

  await telCol.doc().set({
    lat: 45.5005,
    lng: -73.568,
    speed: 38,
    heading: 115,
    fuel: 64,
    timestamp: t1,
  });
  await telCol.doc().set({
    lat: 45.5017,
    lng: -73.5673,
    speed: 42,
    heading: 120,
    fuel: 63,
    timestamp: t2,
  });
  await telCol.doc().set({
    lat: 45.5025,
    lng: -73.5665,
    speed: 42,
    heading: 120,
    fuel: 63,
    timestamp: t3,
  });

  await veh2.collection("telemetry").doc().set({
    lat: 45.51,
    lng: -73.55,
    speed: 0,
    heading: 0,
    fuel: 82,
    timestamp: t3,
  });

  await db
    .collection("deliveries")
    .doc("del_1")
    .set({
      companyId: COMPANY_ID,
      vehicleId: "veh_1",
      driverId: "drv_1",
      status: "IN_PROGRESS",
      pickup: { lat: 45.5, lng: -73.57 },
      dropoff: { lat: 45.54, lng: -73.6 },
      createdAt: FieldValue.serverTimestamp(),
      startedAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });

  await db.collection("alerts").doc("alert_1").set({
    companyId: COMPANY_ID,
    vehicleId: "veh_1",
    type: "HARSH_BRAKING",
    severity: "HIGH",
    createdAt: FieldValue.serverTimestamp(),
    resolved: false,
  });

  await companyRef.update({ vehicleCount: 2 });

  await recalculateFleetStats(COMPANY_ID);

  console.log("Done. Sample tenant: x-company-id: cmp_1");
  console.log("Collections: companies, vehicles (+ telemetry sub), drivers, deliveries, alerts, fleetStats");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
