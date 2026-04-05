import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  allowHeaderTenant,
  createVehicle,
  deleteVehicle,
  getAlerts,
  getCompanyId,
  getFleetStats,
  getHealth,
  getMe,
  getVehicleTelemetry,
  getVehicles,
  patchVehicle,
  setCompanyId,
  getDeliveries,
  getDrivers,
} from "./api.js";
import { auth, firebaseConfigured } from "./firebase.js";
import AuthScreen from "./components/AuthScreen.jsx";
import RegisterCompany from "./components/RegisterCompany.jsx";
import FleetMap from "./components/FleetMap.jsx";
import FleetOperations from "./components/FleetOperations.jsx";
import "./App.css";

const STATUSES = ["ACTIVE", "IDLE", "MAINTENANCE", "OFFLINE"];

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function emptyVehicleForm() {
  return {
    plate: "",
    model: "",
    year: "",
    status: "IDLE",
    lat: "",
    lng: "",
  };
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const [companyInput, setCompanyInput] = useState(getCompanyId);
  const [health, setHealth] = useState(null);
  const [healthErr, setHealthErr] = useState(null);
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsScope, setAlertsScope] = useState("open");
  const [trailVehicleId, setTrailVehicleId] = useState("");
  const [trailPoints, setTrailPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [vehicleModal, setVehicleModal] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);

  const companyId = (() => {
    if (profileLoading) return null;
    if (profile?.companyId) return profile.companyId;
    if (!firebaseUser && allowHeaderTenant) return getCompanyId();
    if (firebaseUser && needsRegistration) return null;
    return null;
  })();

  const canWrite = profile?.role !== "viewer";

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setProfileLoading(true);
        try {
          const me = await getMe();
          setProfile(me);
          setNeedsRegistration(false);
        } catch (e) {
          if (e.status === 404) {
            setProfile(null);
            setNeedsRegistration(true);
          } else {
            setProfile(null);
            setNeedsRegistration(false);
          }
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        setNeedsRegistration(false);
        setProfileLoading(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getHealth()
      .then((h) => {
        setHealth(h);
        setHealthErr(null);
      })
      .catch((e) => {
        setHealth(null);
        setHealthErr(e.message ?? "API unreachable");
      });
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!companyId) return;
    setError(null);
    setLoading(true);
    try {
      const [s, v, d, a, drv] = await Promise.all([
        getFleetStats(companyId),
        getVehicles(),
        getDeliveries(),
        getAlerts(),
        getDrivers(),
      ]);
      setStats(s);
      setVehicles(Array.isArray(v) ? v : []);
      setDeliveries(Array.isArray(d) ? d : []);
      setAlerts(Array.isArray(a) ? a : []);
      setDrivers(Array.isArray(drv) ? drv : []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message ?? String(e));
      setStats(null);
      setVehicles([]);
      setDeliveries([]);
      setAlerts([]);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!authReady) return;
    if (!companyId) return;
    loadDashboard();
  }, [authReady, companyId, loadDashboard]);

  useEffect(() => {
    if (!companyId) return;
    const t = setInterval(loadDashboard, 8_000);
    return () => clearInterval(t);
  }, [companyId, loadDashboard]);

  useEffect(() => {
    if (!trailVehicleId || !companyId) {
      setTrailPoints([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getVehicleTelemetry(trailVehicleId, 120);
        const pts = Array.isArray(data?.points)
          ? data.points.map((p) => [p.lat, p.lng]).filter((x) => typeof x[0] === "number" && typeof x[1] === "number")
          : [];
        if (!cancelled) setTrailPoints(pts);
      } catch {
        if (!cancelled) setTrailPoints([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trailVehicleId, companyId]);

  useEffect(() => {
    if (!mapModalOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setMapModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapModalOpen]);

  useEffect(() => {
    if (!mapModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mapModalOpen]);

  async function refreshProfile() {
    const me = await getMe();
    setProfile(me);
    setNeedsRegistration(false);
  }

  async function handleSignOut() {
    if (auth) await signOut(auth);
    setProfile(null);
    setNeedsRegistration(false);
    setStats(null);
    setVehicles([]);
    setDrivers([]);
    setDeliveries([]);
    setAlerts([]);
    setTrailVehicleId("");
    setTrailPoints([]);
    setError(null);
    setLastUpdated(null);
    setVehicleModal(null);
  }

  function applyCompanyId() {
    const id = companyInput.trim();
    if (!id) return;
    setCompanyId(id);
    setCompanyInput(id);
    loadDashboard();
  }

  function openCreateVehicle() {
    setVehicleForm(emptyVehicleForm());
    setVehicleModal("create");
  }

  function openEditVehicle(row) {
    setVehicleForm({
      plate: row.plate ?? "",
      model: row.model ?? "",
      year: row.year != null ? String(row.year) : "",
      status: row.status ?? "IDLE",
      lat: row.location?.lat != null ? String(row.location.lat) : "",
      lng: row.location?.lng != null ? String(row.location.lng) : "",
    });
    setVehicleModal({ mode: "edit", id: row.id });
  }

  async function submitVehicle(e) {
    e.preventDefault();
    setVehicleSaving(true);
    try {
      const yearNum = vehicleForm.year.trim() === "" ? null : Number(vehicleForm.year);
      const lat = vehicleForm.lat.trim() === "" ? 0 : Number(vehicleForm.lat);
      const lng = vehicleForm.lng.trim() === "" ? 0 : Number(vehicleForm.lng);
      const body = {
        plate: vehicleForm.plate.trim(),
        model: vehicleForm.model.trim(),
        status: vehicleForm.status,
        year: Number.isFinite(yearNum) ? yearNum : null,
        location: { lat: Number.isFinite(lat) ? lat : 0, lng: Number.isFinite(lng) ? lng : 0 },
      };
      if (!body.plate || !body.model) {
        throw new Error("Plate and model are required");
      }
      if (vehicleModal === "create") {
        await createVehicle(body);
      } else if (vehicleModal?.mode === "edit") {
        await patchVehicle(vehicleModal.id, body);
      }
      setVehicleModal(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setVehicleSaving(false);
    }
  }

  async function handleDeleteVehicle(id) {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await deleteVehicle(id);
      await loadDashboard();
    } catch (err) {
      setError(err.message ?? String(err));
    }
  }

  /** When Firebase web config is present, signed-out users always see login (not the header-tenant dashboard). */
  const showAuthWall = firebaseConfigured && auth && !firebaseUser;
  const showRegistration = firebaseUser && needsRegistration && !profileLoading;

  if (!authReady || (auth && profileLoading && firebaseUser)) {
    return (
      <div className="app app-center">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (showAuthWall) {
    return (
      <div className="app">
        <header className="header header-auth">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <div>
              <h1>SmartFleet AI</h1>
              <p className="tagline">Sign in to manage your fleet</p>
            </div>
          </div>
        </header>
        <AuthScreen />
      </div>
    );
  }

  if (showRegistration) {
    return (
      <div className="app">
        <header className="header header-auth">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <div>
              <h1>SmartFleet AI</h1>
              <p className="tagline">Complete your organization setup</p>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
            Log out
          </button>
        </header>
        <RegisterCompany onRegistered={refreshProfile} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>SmartFleet AI</h1>
            <p className="tagline">Live fleet overview · Firestore-backed API</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="health-pill" data-ok={health ? "true" : "false"}>
            {health ? `API ${health.service ?? "ok"}` : healthErr ?? "Checking…"}
          </div>
          {profile && (
            <div className="user-pill" title={profile.companyId}>
              <span className="user-co">
                {profile.company?.name ?? profile.companyId}
                {profile.role && <span className="user-role"> · {profile.role}</span>}
              </span>
            </div>
          )}
          {firebaseUser && auth && (
            <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
              Log out
            </button>
          )}
          {allowHeaderTenant && !firebaseUser && !firebaseConfigured && (
            <div className="company-field">
              <label htmlFor="company">Tenant (dev)</label>
              <input
                id="company"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCompanyId()}
                placeholder="cmp_1"
              />
              <button type="button" className="btn btn-secondary" onClick={applyCompanyId}>
                Apply
              </button>
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={loadDashboard} disabled={loading || !companyId}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-error" role="alert">
          <strong>Could not load data.</strong> {error}
          <span className="hint">
            {" "}
            Run the backend on port 8080, set <code>VITE_API_URL</code> if needed. With{" "}
            <code>ALLOW_HEADER_TENANT=true</code>, try <code>cmp_1</code> after <code>npm run seed</code>.
          </span>
        </div>
      )}

      {!companyId && !allowHeaderTenant && (
        <div className="banner banner-error" role="alert">
          No company context. Sign in and complete registration, or set{" "}
          <code>VITE_ALLOW_HEADER_TENANT=true</code> in <code>frontend/.env</code> for local dev with{" "}
          <code>cmp_1</code>.
        </div>
      )}

      <section className="stats-grid" aria-label="Fleet statistics">
        <article className="stat-card">
          <span className="stat-label">Active vehicles</span>
          <span className="stat-value">{stats?.activeVehicles ?? "—"}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Idle vehicles</span>
          <span className="stat-value">{stats?.idleVehicles ?? "—"}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Deliveries in progress</span>
          <span className="stat-value">{stats?.deliveriesInProgress ?? "—"}</span>
        </article>
        <article className="stat-card stat-card-warn">
          <span className="stat-label">Open alerts</span>
          <span className="stat-value">{stats?.alertsOpen ?? "—"}</span>
        </article>
      </section>

      {lastUpdated && (
        <p className="meta-updated">Last updated {lastUpdated.toLocaleTimeString()} · auto-refresh every 8s</p>
      )}

      <div className="panels">
        <div className="fleet-main">
          <section className="panel fleet-vehicles-panel">
            <div className="panel-head panel-head-row">
              <h2>Vehicles</h2>
              <div className="panel-head-actions">
                <span className="panel-count">{vehicles.length} total</span>
                {companyId && canWrite && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={openCreateVehicle}>
                    Add vehicle
                  </button>
                )}
              </div>
            </div>
            <div className="table-wrap fleet-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Speed</th>
                  <th>Fuel</th>
                  <th>Last update</th>
                  {canWrite && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={canWrite ? 8 : 7} className="empty-cell">
                      No vehicles for this tenant.
                    </td>
                  </tr>
                ) : (
                  vehicles.map((row) => (
                    <tr key={row.id}>
                      <td className="mono">{row.plate}</td>
                      <td>{row.model}</td>
                      <td>
                        <span className={`pill pill-${(row.status ?? "").toLowerCase()}`}>{row.status}</span>
                      </td>
                      <td className="mono muted">
                        {row.location
                          ? `${row.location.lat?.toFixed?.(4) ?? row.location.lat}, ${row.location.lng?.toFixed?.(4) ?? row.location.lng}`
                          : "—"}
                      </td>
                      <td>{row.speed ?? "—"}</td>
                      <td>{row.fuelLevel != null ? `${row.fuelLevel}%` : "—"}</td>
                      <td className="muted">{formatTime(row.lastUpdate)}</td>
                      <td className="table-actions">
                        {canWrite && (
                          <>
                            <button type="button" className="link-btn" onClick={() => openEditVehicle(row)}>
                              Edit
                            </button>
                            <button type="button" className="link-btn link-danger" onClick={() => handleDeleteVehicle(row.id)}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </section>

          <section className="panel fleet-map-panel" aria-label="Fleet map">
            <div className="panel-head panel-head-row">
              <h2>Fleet map</h2>
              <div className="panel-head-actions">
                <label className="map-trail-label">
                  Trail
                  <select
                    className="map-trail-select"
                    value={trailVehicleId}
                    onChange={(e) => setTrailVehicleId(e.target.value)}
                    aria-label="Show GPS trail for vehicle"
                  >
                    <option value="">Off</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="panel-count">{vehicles.filter((v) => v.location).length} on map</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setMapModalOpen(true)}
                  aria-label="Expand map to full screen"
                >
                  Expand map
                </button>
              </div>
            </div>
            <div className="fleet-map-shell">
              <FleetMap vehicles={vehicles} trailPositions={trailPoints} />
            </div>
          </section>
        </div>

        <FleetOperations
          drivers={drivers}
          vehicles={vehicles}
          deliveries={deliveries}
          alerts={alerts}
          alertsScope={alertsScope}
          onAlertsScopeChange={setAlertsScope}
          loading={loading}
          canWrite={canWrite}
          onChanged={loadDashboard}
        />
      </div>

      {vehicleModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => !vehicleSaving && setVehicleModal(null)}>
          <div
            className="modal"
            role="dialog"
            aria-labelledby="vehicle-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="vehicle-modal-title">{vehicleModal === "create" ? "Add vehicle" : "Edit vehicle"}</h3>
            <form className="vehicle-form" onSubmit={submitVehicle}>
              <label className="auth-label">
                Plate *
                <input
                  value={vehicleForm.plate}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, plate: e.target.value }))}
                  required
                />
              </label>
              <label className="auth-label">
                Model *
                <input
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
                  required
                />
              </label>
              <label className="auth-label">
                Year
                <input
                  type="number"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, year: e.target.value }))}
                />
              </label>
              <label className="auth-label">
                Status
                <select
                  value={vehicleForm.status}
                  onChange={(e) => setVehicleForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label className="auth-label">
                  Lat
                  <input
                    type="text"
                    inputMode="decimal"
                    value={vehicleForm.lat}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, lat: e.target.value }))}
                    placeholder="45.5017"
                  />
                </label>
                <label className="auth-label">
                  Lng
                  <input
                    type="text"
                    inputMode="decimal"
                    value={vehicleForm.lng}
                    onChange={(e) => setVehicleForm((f) => ({ ...f, lng: e.target.value }))}
                    placeholder="-73.5673"
                  />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" disabled={vehicleSaving} onClick={() => setVehicleModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={vehicleSaving}>
                  {vehicleSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mapModalOpen && (
        <div
          className="map-modal-backdrop"
          role="presentation"
          onClick={() => setMapModalOpen(false)}
        >
          <div
            className="map-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="map-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="map-modal-header">
              <h2 id="map-modal-title">Fleet map</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMapModalOpen(false)}
                aria-label="Close expanded map"
              >
                Close
              </button>
            </div>
            <div className="fleet-map-shell fleet-map-shell--modal">
              <FleetMap key="fleet-map-modal" vehicles={vehicles} trailPositions={trailPoints} />
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <code>VITE_API_URL</code> → {import.meta.env.VITE_API_URL ?? "http://localhost:8080 (default)"}
      </footer>
    </div>
  );
}
