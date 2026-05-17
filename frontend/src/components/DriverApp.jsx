import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import {
  getDriverDeliveries,
  getDriverMe,
  getHealth,
  patchDriverDelivery,
  postDriverLocation,
} from "../api.js";
import { auth } from "../firebase.js";
import { estimateEtaMinutes, haversineKm } from "../geo.js";
import { fetchDrivingRoute, googleMapsDirectionsUrl } from "../routing.js";
import FleetMap from "./FleetMap.jsx";

const STATUS_LABEL = {
  PENDING: "Scheduled",
  IN_PROGRESS: "In transit",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
};

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

const TIMELINE = [
  { key: "created", label: "Order placed", field: "createdAt" },
  { key: "started", label: "Out for delivery", field: "startedAt" },
  { key: "done", label: "Delivered", field: "completedAt" },
];

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function formatCoord(loc) {
  if (!loc || typeof loc.lat !== "number") return "—";
  return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
}

function etaForDelivery(delivery, driverPos) {
  if (!delivery?.dropoff || delivery.status === "COMPLETED" || delivery.status === "CANCELLED") {
    return null;
  }
  const { lat: tLat, lng: tLng } = delivery.dropoff;
  if (typeof tLat !== "number" || typeof tLng !== "number") return null;

  let lat1;
  let lng1;
  let speed = null;

  if (driverPos) {
    [lat1, lng1] = driverPos;
  } else if (delivery.vehicle?.location) {
    lat1 = delivery.vehicle.location.lat;
    lng1 = delivery.vehicle.location.lng;
    speed = delivery.vehicle.speed;
  } else {
    return null;
  }

  const km = haversineKm(lat1, lng1, tLat, tLng);
  const mins = estimateEtaMinutes(lat1, lng1, tLat, tLng, speed);
  return { km: Math.round(km * 10) / 10, mins };
}

function StopRow({ kind, label, loc }) {
  const tag = kind === "pickup" ? "P" : "D";
  const title = kind === "pickup" ? "Pickup" : "Drop-off";
  return (
    <div className="driver-stop">
      <span className={`driver-stop-tag driver-stop-tag-${kind}`}>{tag}</span>
      <StopBody title={title} label={label} loc={loc} />
    </div>
  );
}

function StopBody({ title, label, loc }) {
  return (
    <div>
      <div className="driver-stop-title">{label ?? title}</div>
      <div className="muted mono">{formatCoord(loc)}</div>
    </div>
  );
}

export default function DriverApp({ onSignOut }) {
  const [me, setMe] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("active");
  const [selectedId, setSelectedId] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [m, d] = await Promise.all([getDriverMe(), getDriverDeliveries()]);
      setMe(m);
      setDeliveries(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(e.message ?? String(e));
      setMe(null);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "done") {
      return deliveries.filter((d) => d.status === "COMPLETED" || d.status === "CANCELLED");
    }
    if (filter === "active") {
      return deliveries.filter((d) => d.status === "PENDING" || d.status === "IN_PROGRESS");
    }
    return deliveries;
  }, [deliveries, filter]);

  const selected = useMemo(() => {
    if (selectedId) {
      return deliveries.find((d) => d.id === selectedId) ?? filtered[0] ?? null;
    }
    return (
      deliveries.find((d) => d.status === "IN_PROGRESS") ??
      deliveries.find((d) => d.status === "PENDING") ??
      filtered[0] ??
      null
    );
  }, [selectedId, deliveries, filtered]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Location not supported in this browser");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        setDriverPos([pos.coords.latitude, pos.coords.longitude]);
      },
      (e) => setGeoError(e.message ?? "Location denied"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!selected?.pickup || !selected?.dropoff) {
      setRouteCoords([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRouteLoading(true);
      const waypoints = [];
      if (driverPos) waypoints.push(driverPos);
      else if (selected.vehicle?.location) {
        waypoints.push([selected.vehicle.location.lat, selected.vehicle.location.lng]);
      }
      if (selected.status === "PENDING") {
        waypoints.push([selected.pickup.lat, selected.pickup.lng]);
      }
      waypoints.push([selected.dropoff.lat, selected.dropoff.lng]);
      const unique = waypoints.filter(
        (p, i, arr) =>
          arr.findIndex((q) => Math.abs(q[0] - p[0]) < 1e-5 && Math.abs(q[1] - p[1]) < 1e-5) === i
      );
      const route = await fetchDrivingRoute(unique);
      if (!cancelled) {
        setRouteCoords(route ?? unique);
        setRouteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, driverPos]);

  useEffect(() => {
    if (!driverPos || !selected || selected.status !== "IN_PROGRESS") return;
    let cancelled = false;
    const push = async () => {
      try {
        await postDriverLocation({ lat: driverPos[0], lng: driverPos[1] });
      } catch {
        /* ignore */
      }
    };
    push();
    const t = setInterval(() => {
      if (!cancelled) push();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [driverPos, selected?.id, selected?.status]);

  const eta = selected ? etaForDelivery(selected, driverPos) : null;

  const vehiclesForMap = useMemo(() => {
    const v = selected?.vehicle ?? me?.vehicle;
    if (!v?.location) return [];
    return [
      {
        id: v.id,
        plate: v.plate ?? "Vehicle",
        model: v.model ?? "",
        status: v.status ?? "",
        location: v.location,
        lastUpdate: v.lastUpdate,
      },
    ];
  }, [selected, me]);

  const highlightDelivery = useMemo(() => {
    if (!selected?.pickup || !selected?.dropoff) return null;
    return {
      pickup: [selected.pickup.lat, selected.pickup.lng],
      dropoff: [selected.dropoff.lat, selected.dropoff.lng],
    };
  }, [selected]);

  const navUrl = useMemo(() => {
    if (!selected) return null;
    const pts = [];
    if (selected.status === "PENDING" && selected.pickup) {
      pts.push({ lat: selected.pickup.lat, lng: selected.pickup.lng });
    }
    if (selected.dropoff) {
      pts.push({ lat: selected.dropoff.lat, lng: selected.dropoff.lng });
    }
    if (driverPos && pts.length > 0) {
      pts.unshift({ lat: driverPos[0], lng: driverPos[1] });
    }
    return googleMapsDirectionsUrl(pts);
  }, [selected, driverPos]);

  async function handlePatch(id, patch) {
    try {
      await patchDriverDelivery(id, patch);
      await load();
    } catch (e) {
      window.alert(e.message ?? String(e));
    }
  }

  async function handleSignOut() {
    if (auth) await signOut(auth);
    onSignOut();
  }

  const activeCount = deliveries.filter((d) => d.status === "IN_PROGRESS" || d.status === "PENDING").length;

  return (
    <div className="app driver-app">
      <header className="header driver-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>Driver</h1>
            <p className="tagline">
              {me?.companyName ?? "SmartFleet"}
              {me?.name ? ` · ${me.name}` : ""}
              {me?.vehicle?.plate ? ` · ${me.vehicle.plate}` : ""}
              {activeCount > 0 ? ` · ${activeCount} active` : ""}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <div className="health-pill" data-ok={health ? "true" : "false"}>
            {health ? `API ${health.service ?? "ok"}` : "—"}
          </div>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleSignOut}>
            Log out
          </button>
        </div>
      </header>

      {err && (
        <div className="banner banner-error" role="alert">
          {err}
          <span className="hint">
            {" "}
            Link your Firebase user with role <code>driver</code> and <code>driverId</code> (e.g.{" "}
            <code>drv_1</code> after seed).
          </span>
        </div>
      )}

      {geoError && (
        <div className="banner banner-warn driver-geo-banner" role="status">
          {geoError} — enable location for live ETA and map position.
        </div>
      )}

      <main className="driver-layout">
        <section className="driver-map-section panel" aria-label="Route map">
          <MapHead routeLoading={routeLoading} navUrl={navUrl} />
          <div className="fleet-map-shell driver-map-shell">
            <FleetMap
              vehicles={vehiclesForMap}
              highlightDelivery={highlightDelivery}
              routePositions={routeCoords}
              driverPosition={driverPos}
            />
          </div>
        </section>

        <aside className="driver-sidebar">
          {selected && (
            <section className="driver-detail panel" aria-label="Active delivery">
              <DetailHead selected={selected} eta={eta} />
              <div className="driver-stops">
                <StopRow kind="pickup" label={selected.pickupLabel} loc={selected.pickup} />
                <StopRow kind="dropoff" label={selected.dropoffLabel} loc={selected.dropoff} />
              </div>
              {selected.orderNotes && (
                <p className="driver-notes">
                  <strong>Notes:</strong> {selected.orderNotes}
                </p>
              )}
              <ol className="driver-timeline">
                {TIMELINE.map((s) => {
                  const t = selected[s.field];
                  const done = Boolean(t);
                  return (
                    <li key={s.key} className={`driver-timeline-step ${done ? "driver-timeline-step-done" : ""}`}>
                      <span className="driver-timeline-dot" aria-hidden />
                      <div>
                        <div className="driver-timeline-label">{s.label}</div>
                        <div className="muted driver-timeline-time">{done ? formatTime(t) : "—"}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="driver-delivery-actions">
                {selected.status === "PENDING" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => handlePatch(selected.id, { status: "IN_PROGRESS", startedAt: "now" })}
                  >
                    Start route
                  </button>
                )}
                {selected.status === "IN_PROGRESS" && (
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => handlePatch(selected.id, { status: "COMPLETED", completedAt: "now" })}
                  >
                    Mark delivered
                  </button>
                )}
              </div>
            </section>
          )}

          <section className="driver-loads panel" aria-label="Delivery list">
            <h2 className="driver-section-title">My loads</h2>
            <div className="driver-filter-row" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`loads-chip ${filter === f.id ? "loads-chip-active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {loading && deliveries.length === 0 ? (
              <p className="muted">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="muted">No deliveries in this view.</p>
            ) : (
              <ul className="driver-delivery-list">
                {filtered.map((d) => {
                  const itemEta = etaForDelivery(d, driverPos);
                  const isSelected = selected?.id === d.id;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        className={`driver-delivery-card ${isSelected ? "driver-delivery-card-selected" : ""}`}
                        onClick={() => setSelectedId(d.id)}
                      >
                        <div className="driver-delivery-top">
                          <span className={`loads-status loads-status-${(d.status ?? "").toLowerCase()}`}>
                            {STATUS_LABEL[d.status] ?? d.status}
                          </span>
                          {itemEta && (
                            <span className="driver-eta-pill">~{itemEta.mins} min · {itemEta.km} km</span>
                          )}
                        </div>
                        <div className="driver-stop-preview">
                          <span className="driver-stop-tag">P</span>
                          {d.pickupLabel ?? formatCoord(d.pickup)}
                        </div>
                        <div className="driver-stop-preview">
                          <span className="driver-stop-tag driver-stop-tag-dropoff">D</span>
                          {d.dropoffLabel ?? formatCoord(d.dropoff)}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

function MapHead({ routeLoading, navUrl }) {
  return (
    <div className="panel-head panel-head-row">
      <h2>Route</h2>
      {routeLoading && <span className="muted driver-route-loading">Updating route…</span>}
      {navUrl && (
        <a className="btn btn-primary btn-sm" href={navUrl} target="_blank" rel="noopener noreferrer">
          Open in Maps
        </a>
      )}
    </div>
  );
}

function DetailHead({ selected, eta }) {
  return (
    <div className="panel-head panel-head-row driver-detail-head">
      <h2>{selected.dropoffLabel ?? "Delivery"}</h2>
      {eta && (
        <div className="driver-eta-block">
          <span className="driver-eta-big">~{eta.mins} min</span>
          <span className="muted">{eta.km} km to drop-off</span>
        </div>
      )}
    </div>
  );
}
