/**
 * Ensures all collection paths exist, then populates demo data for tenant cmp_1.
 * Run from backend/: npm run seed
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../config/firestore.js";
import { recalculateFleetStats } from "../src/fleetStats/service.js";
import { ensureBootstrapCollections } from "./lib/bootstrapCollections.js";

const COMPANY_ID = "cmp_1";

async function main() {
  console.log(`Seeding Firestore with project (from env/credentials): ${process.env.GCLOUD_PROJECT ?? "see service account"}`);

  await ensureBootstrapCollections(db);

  const companyRef = db.collection("companies").doc(COMPANY_ID);
  await companyRef.set({
    name: "Smart Logistics Inc",
    plan: "PRO",
    vehicleCount: 5,
    inviteCode: "seedinvitedemo01",
    createdAt: FieldValue.serverTimestamp(),
  });

  const drivers = [
    {
      id: "drv_1",
      name: "John Doe",
      phone: "+15140000000",
      license: "QC123456",
      assignedVehicleId: "veh_1",
      status: "DRIVING",
    },
    {
      id: "drv_2",
      name: "Jane Smith",
      phone: "+15145550123",
      license: "QC789012",
      assignedVehicleId: "veh_3",
      status: "DRIVING",
    },
    {
      id: "drv_3",
      name: "Amir Khan",
      phone: "+15145550999",
      license: "QC345678",
      assignedVehicleId: "veh_4",
      status: "ON_BREAK",
    },
    {
      id: "drv_4",
      name: "Sofia Martinez",
      phone: "+15145550111",
      license: "QC901234",
      assignedVehicleId: null,
      status: "OFF_DUTY",
    },
  ] as const;

  for (const d of drivers) {
    await db.collection("drivers").doc(d.id).set({
      companyId: COMPANY_ID,
      name: d.name,
      phone: d.phone,
      license: d.license,
      assignedVehicleId: d.assignedVehicleId,
      status: d.status,
    });
  }

  const vehicles = [
    {
      id: "veh_1",
      driverId: "drv_1",
      status: "ACTIVE",
      plate: "ABC123",
      model: "Ford Transit",
      year: 2022,
      location: { lat: 45.5017, lng: -73.5673 },
      speed: 42,
      heading: 120,
      fuelLevel: 63,
      activeDeliveryId: "del_1",
    },
    {
      id: "veh_2",
      driverId: null,
      status: "IDLE",
      plate: "XYZ789",
      model: "Mercedes Sprinter",
      year: 2021,
      location: { lat: 45.51, lng: -73.55 },
      speed: 0,
      heading: 0,
      fuelLevel: 82,
      activeDeliveryId: null,
    },
    {
      id: "veh_3",
      driverId: "drv_2",
      status: "ACTIVE",
      plate: "JQK-204",
      model: "Ram ProMaster",
      year: 2020,
      location: { lat: 45.5081, lng: -73.5612 },
      speed: 36,
      heading: 88,
      fuelLevel: 47,
      activeDeliveryId: "del_2",
    },
    {
      id: "veh_4",
      driverId: "drv_3",
      status: "MAINTENANCE",
      plate: "MTL-552",
      model: "Isuzu N-Series",
      year: 2019,
      location: { lat: 45.495, lng: -73.575 },
      speed: 0,
      heading: 0,
      fuelLevel: 91,
      activeDeliveryId: null,
    },
    {
      id: "veh_5",
      driverId: null,
      status: "OFFLINE",
      plate: "OFF-001",
      model: "Ford F-150",
      year: 2018,
      location: { lat: 45.52, lng: -73.58 },
      speed: 0,
      heading: 0,
      fuelLevel: 0,
      activeDeliveryId: null,
    },
  ] as const;

  for (const v of vehicles) {
    await db.collection("vehicles").doc(v.id).set({
      companyId: COMPANY_ID,
      driverId: v.driverId,
      status: v.status,
      plate: v.plate,
      model: v.model,
      year: v.year,
      location: v.location,
      speed: v.speed,
      heading: v.heading,
      fuelLevel: v.fuelLevel,
      lastUpdate: FieldValue.serverTimestamp(),
      activeDeliveryId: v.activeDeliveryId,
    });
  }

  // Telemetry subcollection (append-only samples; small docs)
  const t1 = Timestamp.fromDate(new Date(Date.now() - 120_000));
  const t2 = Timestamp.fromDate(new Date(Date.now() - 60_000));
  const t3 = Timestamp.now();

  // veh_1 telemetry
  const veh1Ref = db.collection("vehicles").doc("veh_1");
  const veh1Tel = veh1Ref.collection("telemetry");
  await veh1Tel.doc().set({ lat: 45.5005, lng: -73.568, speed: 38, heading: 115, fuel: 64, timestamp: t1 });
  await veh1Tel.doc().set({ lat: 45.5017, lng: -73.5673, speed: 42, heading: 120, fuel: 63, timestamp: t2 });
  await veh1Tel.doc().set({ lat: 45.5025, lng: -73.5665, speed: 42, heading: 120, fuel: 63, timestamp: t3 });

  // veh_2 telemetry (idle point)
  await db
    .collection("vehicles")
    .doc("veh_2")
    .collection("telemetry")
    .doc()
    .set({ lat: 45.51, lng: -73.55, speed: 0, heading: 0, fuel: 82, timestamp: t3 });

  // veh_3 telemetry
  const veh3Tel = db.collection("vehicles").doc("veh_3").collection("telemetry");
  await veh3Tel.doc().set({ lat: 45.5078, lng: -73.562, speed: 33, heading: 86, fuel: 48, timestamp: t1 });
  await veh3Tel.doc().set({ lat: 45.5081, lng: -73.5612, speed: 36, heading: 88, fuel: 47, timestamp: t2 });
  await veh3Tel.doc().set({ lat: 45.509, lng: -73.5604, speed: 34, heading: 92, fuel: 47, timestamp: t3 });

  await db.collection("deliveries").doc("del_1").set({
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

  await db.collection("deliveries").doc("del_2").set({
    companyId: COMPANY_ID,
    vehicleId: "veh_3",
    driverId: "drv_2",
    status: "IN_PROGRESS",
    pickup: { lat: 45.507, lng: -73.564 },
    dropoff: { lat: 45.515, lng: -73.552 },
    createdAt: FieldValue.serverTimestamp(),
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
  });

  await db.collection("deliveries").doc("del_3").set({
    companyId: COMPANY_ID,
    vehicleId: "veh_2",
    driverId: "drv_4",
    status: "COMPLETED",
    pickup: { lat: 45.512, lng: -73.551 },
    dropoff: { lat: 45.499, lng: -73.59 },
    createdAt: FieldValue.serverTimestamp(),
    startedAt: FieldValue.serverTimestamp(),
    completedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("alerts").doc("alert_1").set({
    companyId: COMPANY_ID,
    vehicleId: "veh_1",
    type: "HARSH_BRAKING",
    severity: "HIGH",
    createdAt: FieldValue.serverTimestamp(),
    resolved: false,
  });

  await db.collection("alerts").doc("alert_2").set({
    companyId: COMPANY_ID,
    vehicleId: "veh_3",
    type: "SPEEDING",
    severity: "MEDIUM",
    createdAt: FieldValue.serverTimestamp(),
    resolved: false,
  });

  await db.collection("alerts").doc("alert_3").set({
    companyId: COMPANY_ID,
    vehicleId: "veh_4",
    type: "MAINTENANCE_DUE",
    severity: "LOW",
    createdAt: FieldValue.serverTimestamp(),
    resolved: true,
  });

  await companyRef.update({ vehicleCount: 5 });

  await recalculateFleetStats(COMPANY_ID);

  console.log("Done. Sample tenant: x-company-id: cmp_1");
  console.log("Collections: companies, vehicles (+ telemetry sub), drivers, deliveries, alerts, fleetStats");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
