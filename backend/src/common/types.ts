import type { Timestamp } from "firebase-admin/firestore";

export type FirestoreTimestamp = Timestamp | { toDate(): Date };

export interface Company {
  name: string;
  plan: string;
  vehicleCount: number;
  createdAt: FirestoreTimestamp;
}

export interface VehicleLocation {
  lat: number;
  lng: number;
}

export type VehicleStatus = "ACTIVE" | "IDLE" | "MAINTENANCE" | "OFFLINE";

export interface Vehicle {
  companyId: string;
  driverId?: string | null;
  status: VehicleStatus;
  plate: string;
  model: string;
  year?: number;
  location: VehicleLocation;
  speed: number;
  heading: number;
  fuelLevel: number;
  lastUpdate: FirestoreTimestamp;
  activeDeliveryId?: string | null;
}

export interface TelemetryPoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  fuel: number;
  timestamp: FirestoreTimestamp;
}

export type DriverStatus = "OFF_DUTY" | "DRIVING" | "ON_BREAK";

export interface Driver {
  companyId: string;
  name: string;
  phone: string;
  license: string;
  assignedVehicleId?: string | null;
  status: DriverStatus;
}

export type DeliveryStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface Delivery {
  companyId: string;
  vehicleId: string;
  driverId: string;
  status: DeliveryStatus;
  pickup: VehicleLocation;
  dropoff: VehicleLocation;
  createdAt: FirestoreTimestamp;
  startedAt?: FirestoreTimestamp | null;
  completedAt?: FirestoreTimestamp | null;
}

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface Alert {
  companyId: string;
  vehicleId: string;
  type: string;
  severity: AlertSeverity;
  createdAt: FirestoreTimestamp;
  resolved: boolean;
}

export interface FleetStats {
  activeVehicles: number;
  idleVehicles: number;
  deliveriesInProgress: number;
  alertsOpen: number;
  updatedAt: FirestoreTimestamp;
}
