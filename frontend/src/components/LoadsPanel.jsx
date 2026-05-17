import { useMemo, useState } from "react";
import {
  createDelivery,
  patchDelivery,
} from "../api.js";
import { estimateEtaMinutes, haversineKm } from "../geo.js";

const DELIVERY_FILTERS = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Scheduled" },
  { id: "IN_PROGRESS", label: "In transit" },
  { id: "COMPLETED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
];

const STATUS_LABEL = {
  PENDING: "Scheduled",
  IN_PROGRESS: "In transit",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
};

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function driverName(drivers, id) {
  const d = drivers.find((x) => x.id === id);
  return d?.name ?? id;
}

function vehiclePlate(vehicles, id) {
  const v = vehicles.find((x) => x.id === id);
  return v?.plate ?? id;
}

export default function LoadsPanel({
  drivers,
  vehicles,
  deliveries,
  loading,
  canWrite,
  onChanged,
  selectedDeliveryId,
  onSelectDelivery,
  deliveryStatusFilter,
  onDeliveryStatusFilterChange,
}) {
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    vehicleId: "",
    driverId: "",
    status: "PENDING",
    pickupLat: "",
    pickupLng: "",
    dropoffLat: "",
    dropoffLng: "",
  });
  const [deliverySaving, setDeliverySaving] = useState(false);

  const filtered = useMemo(() => {
    if (!deliveryStatusFilter || deliveryStatusFilter === "all") return deliveries;
    return deliveries.filter((d) => d.status === deliveryStatusFilter);
  }, [deliveries, deliveryStatusFilter]);

  function etaForDelivery(d) {
    if (d.status !== "IN_PROGRESS" || !d.dropoff) return null;
    const veh = vehicles.find((v) => v.id === d.vehicleId);
    if (!veh?.location || typeof veh.location.lat !== "number") return null;
    const { lat: lat1, lng: lng1 } = veh.location;
    const lat2 = d.dropoff.lat;
    const lng2 = d.dropoff.lng;
    if (typeof lat2 !== "number" || typeof lng2 !== "number") return null;
    const km = haversineKm(lat1, lng1, lat2, lng2);
    let speed = typeof veh.speed === "number" ? veh.speed : 0;
    if (speed > 0 && speed < 3) speed *= 3.6;
    const mins = estimateEtaMinutes(lat1, lng1, lat2, lng2, speed > 2 ? speed : null);
    return { km: Math.round(km * 10) / 10, mins };
  }

  async function submitDelivery(e) {
    e.preventDefault();
    if (!canWrite) return;
    setDeliverySaving(true);
    try {
      const pickupLat = Number(deliveryForm.pickupLat);
      const pickupLng = Number(deliveryForm.pickupLng);
      const dropoffLat = Number(deliveryForm.dropoffLat);
      const dropoffLng = Number(deliveryForm.dropoffLng);
      if (
        !deliveryForm.vehicleId ||
        !deliveryForm.driverId ||
        !Number.isFinite(pickupLat) ||
        !Number.isFinite(pickupLng) ||
        !Number.isFinite(dropoffLat) ||
        !Number.isFinite(dropoffLng)
      ) {
        throw new Error("Vehicle, driver, and all coordinates are required");
      }
      await createDelivery({
        vehicleId: deliveryForm.vehicleId,
        driverId: deliveryForm.driverId,
        status: deliveryForm.status,
        pickup: { lat: pickupLat, lng: pickupLng },
        dropoff: { lat: dropoffLat, lng: dropoffLng },
      });
      setDeliveryModal(false);
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    } finally {
      setDeliverySaving(false);
    }
  }

  async function applyDeliveryPatch(id, patch) {
    if (!canWrite) return;
    try {
      await patchDelivery(id, patch);
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    }
  }

  async function copyTrackingLink(token) {
    if (!token) {
      window.alert("No tracking token yet. Save a new delivery or regenerate from the API.");
      return;
    }
    const url = `${window.location.origin}/track/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy tracking link", url);
      return;
    }
  }

  async function regenerateToken(id) {
    if (!canWrite) return;
    try {
      await patchDelivery(id, { issueTrackingToken: true });
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    }
  }

  return (
    <section className="panel loads-panel" aria-label="Active loads">
      <div className="panel-head panel-head-row">
        <h2>Active loads</h2>
        <div className="panel-head-actions">
          {canWrite && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setDeliveryModal(true)}>
              New delivery
            </button>
          )}
        </div>
      </div>
      <div className="loads-filter-row" role="tablist" aria-label="Filter by status">
        {DELIVERY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={deliveryStatusFilter === f.id}
            className={`loads-chip ${deliveryStatusFilter === f.id ? "loads-chip-active" : ""}`}
            onClick={() => onDeliveryStatusFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="loads-list">
        {filtered.length === 0 && !loading ? (
          <li className="loads-empty">No loads in this view.</li>
        ) : (
          filtered.map((d) => {
            const eta = etaForDelivery(d);
            const selected = d.id === selectedDeliveryId;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className={`loads-card ${selected ? "loads-card-selected" : ""}`}
                  onClick={() => onSelectDelivery(selected ? null : d.id)}
                >
                  <div className="loads-card-top">
                    <span className={`loads-status loads-status-${(d.status ?? "").toLowerCase()}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                    {eta && (
                      <span className="loads-eta" title="Rough ETA to dropoff">
                        ~{eta.mins} min · {eta.km} km
                      </span>
                    )}
                  </div>
                  <div className="loads-card-meta">
                    <span>{vehiclePlate(vehicles, d.vehicleId)}</span>
                    <span className="muted">·</span>
                    <span>{driverName(drivers, d.driverId)}</span>
                  </div>
                  <div className="loads-card-sub muted">
                    {d.status === "IN_PROGRESS" ? "En route to dropoff" : d.status === "PENDING" ? "Not started" : ""}
                  </div>
                </button>
                <div className="loads-card-actions">
                  {canWrite && d.status === "PENDING" && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => applyDeliveryPatch(d.id, { status: "IN_PROGRESS", startedAt: "now" })}
                    >
                      Start
                    </button>
                  )}
                  {canWrite && d.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => applyDeliveryPatch(d.id, { status: "COMPLETED", completedAt: "now" })}
                    >
                      Complete
                    </button>
                  )}
                  {canWrite && (d.status === "PENDING" || d.status === "IN_PROGRESS") && (
                    <button
                      type="button"
                      className="link-btn link-danger"
                      onClick={() => applyDeliveryPatch(d.id, { status: "CANCELLED" })}
                    >
                      Cancel
                    </button>
                  )}
                  {d.trackingToken && (
                    <button type="button" className="link-btn" onClick={() => copyTrackingLink(d.trackingToken)}>
                      Copy track link
                    </button>
                  )}
                  {canWrite && !d.trackingToken && (
                    <button type="button" className="link-btn" onClick={() => regenerateToken(d.id)}>
                      Issue track link
                    </button>
                  )}
                </div>
                <div className="loads-card-times muted">
                  Created {formatTime(d.createdAt)}
                  {d.startedAt && ` · Started ${formatTime(d.startedAt)}`}
                  {d.completedAt && ` · Done ${formatTime(d.completedAt)}`}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {deliveryModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => !deliverySaving && setDeliveryModal(false)}>
          <div className="modal modal-wide" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>New delivery</h3>
            <form className="vehicle-form" onSubmit={submitDelivery}>
              <label className="auth-label">
                Vehicle
                <select
                  value={deliveryForm.vehicleId}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} ({v.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Driver
                <select
                  value={deliveryForm.driverId}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, driverId: e.target.value }))}
                  required
                >
                  <option value="">Select driver</option>
                  {drivers.map((dr) => (
                    <option key={dr.id} value={dr.id}>
                      {dr.name} ({dr.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Initial status
                <select
                  value={deliveryForm.status}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <p className="form-hint">Pickup &amp; dropoff coordinates (decimal degrees)</p>
              <div className="form-row">
                <label className="auth-label">
                  Pickup lat
                  <input value={deliveryForm.pickupLat} onChange={(e) => setDeliveryForm((f) => ({ ...f, pickupLat: e.target.value }))} required />
                </label>
                <label className="auth-label">
                  Pickup lng
                  <input value={deliveryForm.pickupLng} onChange={(e) => setDeliveryForm((f) => ({ ...f, pickupLng: e.target.value }))} required />
                </label>
              </div>
              <div className="form-row">
                <label className="auth-label">
                  Dropoff lat
                  <input value={deliveryForm.dropoffLat} onChange={(e) => setDeliveryForm((f) => ({ ...f, dropoffLat: e.target.value }))} required />
                </label>
                <label className="auth-label">
                  Dropoff lng
                  <input value={deliveryForm.dropoffLng} onChange={(e) => setDeliveryForm((f) => ({ ...f, dropoffLng: e.target.value }))} required />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" disabled={deliverySaving} onClick={() => setDeliveryModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={deliverySaving}>
                  {deliverySaving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
