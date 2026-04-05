import { useState } from "react";
import {
  createAlert,
  createDelivery,
  createDriver,
  deleteDriver,
  patchAlert,
  patchDelivery,
  patchDriver,
} from "../api.js";

const DRIVER_STATUSES = ["OFF_DUTY", "DRIVING", "ON_BREAK"];
const DELIVERY_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH"];

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function FleetOperations({
  drivers,
  vehicles,
  deliveries,
  alerts,
  alertsScope,
  onAlertsScopeChange,
  loading,
  canWrite,
  onChanged,
}) {
  const [driverModal, setDriverModal] = useState(null);
  const [driverForm, setDriverForm] = useState({
    name: "",
    phone: "",
    license: "",
    status: "OFF_DUTY",
    assignedVehicleId: "",
  });
  const [driverSaving, setDriverSaving] = useState(false);

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

  const [alertModal, setAlertModal] = useState(false);
  const [alertForm, setAlertForm] = useState({
    vehicleId: "",
    type: "",
    severity: "MEDIUM",
  });
  const [alertSaving, setAlertSaving] = useState(false);

  const displayAlerts =
    alertsScope === "open"
      ? alerts.filter((a) => !a.resolved)
      : alertsScope === "closed"
        ? alerts.filter((a) => a.resolved)
        : alerts;

  function openCreateDriver() {
    setDriverForm({
      name: "",
      phone: "",
      license: "",
      status: "OFF_DUTY",
      assignedVehicleId: "",
    });
    setDriverModal("create");
  }

  function openEditDriver(row) {
    setDriverForm({
      name: row.name ?? "",
      phone: row.phone ?? "",
      license: row.license ?? "",
      status: row.status ?? "OFF_DUTY",
      assignedVehicleId: row.assignedVehicleId ?? "",
    });
    setDriverModal({ mode: "edit", id: row.id });
  }

  async function submitDriver(e) {
    e.preventDefault();
    if (!canWrite) return;
    setDriverSaving(true);
    try {
      const body = {
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim(),
        license: driverForm.license.trim(),
        status: driverForm.status,
        assignedVehicleId: driverForm.assignedVehicleId || null,
      };
      if (driverModal === "create") {
        await createDriver(body);
      } else if (driverModal?.mode === "edit") {
        await patchDriver(driverModal.id, body);
      }
      setDriverModal(null);
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    } finally {
      setDriverSaving(false);
    }
  }

  async function handleDeleteDriver(id) {
    if (!canWrite) return;
    if (!window.confirm("Delete this driver?")) return;
    try {
      await deleteDriver(id);
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    }
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

  async function patchDeliveryStatus(id, patch) {
    if (!canWrite) return;
    try {
      await patchDelivery(id, patch);
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    }
  }

  async function submitAlert(e) {
    e.preventDefault();
    if (!canWrite) return;
    setAlertSaving(true);
    try {
      if (!alertForm.vehicleId || !alertForm.type.trim()) {
        throw new Error("Vehicle and alert type are required");
      }
      await createAlert({
        vehicleId: alertForm.vehicleId,
        type: alertForm.type.trim(),
        severity: alertForm.severity,
      });
      setAlertModal(false);
      setAlertForm({ vehicleId: "", type: "", severity: "MEDIUM" });
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    } finally {
      setAlertSaving(false);
    }
  }

  async function resolveAlert(id, resolved) {
    if (!canWrite) return;
    try {
      await patchAlert(id, { resolved });
      await onChanged();
    } catch (err) {
      window.alert(err.message ?? String(err));
    }
  }

  return (
    <div className="operations-grid">
      <section className="panel operations-panel">
        <div className="panel-head panel-head-row">
          <h2>Drivers</h2>
          {canWrite && (
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreateDriver}>
              Add driver
            </button>
          )}
        </div>
        <div className="table-wrap operations-table-wrap">
          <table className="data-table data-table-compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Vehicle</th>
                {canWrite && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 && !loading ? (
                <tr>
                  <td colSpan={canWrite ? 5 : 4} className="empty-cell">
                    No drivers yet.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td className="mono muted">{d.phone}</td>
                    <td>
                      <span className="pill">{d.status}</span>
                    </td>
                    <td className="mono muted">{d.assignedVehicleId ?? "—"}</td>
                    {canWrite && (
                      <td className="table-actions">
                        <button type="button" className="link-btn" onClick={() => openEditDriver(d)}>
                          Edit
                        </button>
                        <button type="button" className="link-btn link-danger" onClick={() => handleDeleteDriver(d.id)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel operations-panel">
        <div className="panel-head panel-head-row">
          <h2>Alerts</h2>
          <div className="panel-head-actions">
            <select
              className="scope-select"
              value={alertsScope}
              onChange={(e) => onAlertsScopeChange(e.target.value)}
              aria-label="Alert filter"
            >
              <option value="open">Open</option>
              <option value="closed">Resolved</option>
              <option value="all">All</option>
            </select>
            {canWrite && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAlertModal(true)}>
                New alert
              </button>
            )}
          </div>
        </div>
        <ul className="list list-ops">
          {displayAlerts.length === 0 && !loading ? (
            <li className="list-empty">No alerts in this view.</li>
          ) : (
            displayAlerts.map((a) => (
              <li key={a.id} className="list-item">
                <div className="list-item-title">
                  {a.type}{" "}
                  {a.resolved ? (
                    <span className="pill pill-idle">resolved</span>
                  ) : (
                    <span className="pill pill-active">open</span>
                  )}
                </div>
                <div className="list-item-meta">
                  <span className={`severity severity-${(a.severity ?? "").toLowerCase()}`}>{a.severity}</span>
                  <span className="mono">veh {a.vehicleId}</span>
                  <span className="muted">{formatTime(a.createdAt)}</span>
                  {canWrite && !a.resolved && (
                    <button type="button" className="link-btn" onClick={() => resolveAlert(a.id, true)}>
                      Resolve
                    </button>
                  )}
                  {canWrite && a.resolved && (
                    <button type="button" className="link-btn" onClick={() => resolveAlert(a.id, false)}>
                      Reopen
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="panel operations-panel">
        <div className="panel-head panel-head-row">
          <h2>Deliveries</h2>
          {canWrite && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setDeliveryModal(true)}>
              New delivery
            </button>
          )}
        </div>
        <ul className="list list-ops">
          {deliveries.length === 0 && !loading ? (
            <li className="list-empty">No deliveries.</li>
          ) : (
            deliveries.map((d) => (
              <li key={d.id} className="list-item">
                <div className="list-item-title">
                  <span className="pill">{d.status}</span>
                </div>
                <div className="list-item-meta">
                  <span className="mono">veh {d.vehicleId}</span>
                  <span className="mono">drv {d.driverId}</span>
                  {canWrite && d.status === "PENDING" && (
                    <button type="button" className="link-btn" onClick={() => patchDeliveryStatus(d.id, { status: "IN_PROGRESS", startedAt: "now" })}>
                      Start
                    </button>
                  )}
                  {canWrite && d.status === "IN_PROGRESS" && (
                    <button type="button" className="link-btn" onClick={() => patchDeliveryStatus(d.id, { status: "COMPLETED", completedAt: "now" })}>
                      Complete
                    </button>
                  )}
                  {canWrite && (d.status === "PENDING" || d.status === "IN_PROGRESS") && (
                    <button type="button" className="link-btn link-danger" onClick={() => patchDeliveryStatus(d.id, { status: "CANCELLED" })}>
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {driverModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => !driverSaving && setDriverModal(null)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{driverModal === "create" ? "Add driver" : "Edit driver"}</h3>
            <form className="vehicle-form" onSubmit={submitDriver}>
              <label className="auth-label">
                Name *
                <input value={driverForm.name} onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))} required />
              </label>
              <label className="auth-label">
                Phone *
                <input value={driverForm.phone} onChange={(e) => setDriverForm((f) => ({ ...f, phone: e.target.value }))} required />
              </label>
              <label className="auth-label">
                License *
                <input value={driverForm.license} onChange={(e) => setDriverForm((f) => ({ ...f, license: e.target.value }))} required />
              </label>
              <label className="auth-label">
                Status
                <select value={driverForm.status} onChange={(e) => setDriverForm((f) => ({ ...f, status: e.target.value }))}>
                  {DRIVER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Assigned vehicle ID
                <input
                  value={driverForm.assignedVehicleId}
                  onChange={(e) => setDriverForm((f) => ({ ...f, assignedVehicleId: e.target.value }))}
                  placeholder="veh_1"
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" disabled={driverSaving} onClick={() => setDriverModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={driverSaving}>
                  {driverSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
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
                  {DELIVERY_STATUSES.map((s) => (
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

      {alertModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => !alertSaving && setAlertModal(false)}>
          <div className="modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>New alert</h3>
            <form className="vehicle-form" onSubmit={submitAlert}>
              <label className="auth-label">
                Vehicle
                <select
                  value={alertForm.vehicleId}
                  onChange={(e) => setAlertForm((f) => ({ ...f, vehicleId: e.target.value }))}
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate}
                    </option>
                  ))}
                </select>
              </label>
              <label className="auth-label">
                Type *
                <input value={alertForm.type} onChange={(e) => setAlertForm((f) => ({ ...f, type: e.target.value }))} placeholder="Low fuel" required />
              </label>
              <label className="auth-label">
                Severity
                <select value={alertForm.severity} onChange={(e) => setAlertForm((f) => ({ ...f, severity: e.target.value }))}>
                  {ALERT_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" disabled={alertSaving} onClick={() => setAlertModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={alertSaving}>
                  {alertSaving ? "Saving…" : "Create alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
