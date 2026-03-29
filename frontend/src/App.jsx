import { useCallback, useEffect, useState } from "react";
import {
  getAlerts,
  getCompanyId,
  getDeliveries,
  getFleetStats,
  getHealth,
  getVehicles,
  setCompanyId,
} from "./api.js";
import "./App.css";

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function App() {
  const [companyInput, setCompanyInput] = useState(getCompanyId);
  const [health, setHealth] = useState(null);
  const [healthErr, setHealthErr] = useState(null);
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const companyId = getCompanyId();

  const loadDashboard = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [s, v, d, a] = await Promise.all([
        getFleetStats(companyId),
        getVehicles(),
        getDeliveries(),
        getAlerts("open"),
      ]);
      setStats(s);
      setVehicles(Array.isArray(v) ? v : []);
      setDeliveries(Array.isArray(d) ? d : []);
      setAlerts(Array.isArray(a) ? a : []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message ?? String(e));
      setStats(null);
      setVehicles([]);
      setDeliveries([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

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

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const t = setInterval(loadDashboard, 15_000);
    return () => clearInterval(t);
  }, [loadDashboard]);

  function applyCompanyId() {
    const id = companyInput.trim();
    if (!id) return;
    setCompanyId(id);
    setCompanyInput(id);
    loadDashboard();
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
            {health
              ? `API ${health.service ?? "ok"}`
              : healthErr ?? "Checking…"}
          </div>
          <div className="company-field">
            <label htmlFor="company">Tenant</label>
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
          <button type="button" className="btn btn-primary" onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="banner banner-error" role="alert">
          <strong>Could not load data.</strong> {error}
          <span className="hint">
            {" "}
            Run the backend on port 8080, set <code>VITE_API_URL</code> if needed, and use{" "}
            <code>x-company-id</code> (try <code>cmp_1</code> after <code>npm run seed</code>).
          </span>
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
        <p className="meta-updated">Last updated {lastUpdated.toLocaleTimeString()} · auto-refresh every 15s</p>
      )}

      <div className="panels">
        <section className="panel panel-wide">
          <div className="panel-head">
            <h2>Vehicles</h2>
            <span className="panel-count">{vehicles.length} shown</span>
          </div>
          <div className="table-wrap">
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
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="panel-stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Open alerts</h2>
              <span className="panel-count">{alerts.length}</span>
            </div>
            <ul className="list">
              {alerts.length === 0 && !loading ? (
                <li className="list-empty">No open alerts.</li>
              ) : (
                alerts.map((a) => (
                  <li key={a.id} className="list-item">
                    <div className="list-item-title">{a.type}</div>
                    <div className="list-item-meta">
                      <span className={`severity severity-${(a.severity ?? "").toLowerCase()}`}>{a.severity}</span>
                      <span className="mono">veh {a.vehicleId}</span>
                      <span className="muted">{formatTime(a.createdAt)}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Deliveries</h2>
              <span className="panel-count">{deliveries.length}</span>
            </div>
            <ul className="list">
              {deliveries.length === 0 && !loading ? (
                <li className="list-empty">No deliveries.</li>
              ) : (
                deliveries.map((d) => (
                  <li key={d.id} className="list-item">
                    <div className="list-item-title">{d.status}</div>
                    <div className="list-item-meta">
                      <span className="mono">veh {d.vehicleId}</span>
                      <span className="mono">drv {d.driverId}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      </div>

      <footer className="footer">
        <code>VITE_API_URL</code> → {import.meta.env.VITE_API_URL ?? "http://localhost:8080 (default)"}
      </footer>
    </div>
  );
}
