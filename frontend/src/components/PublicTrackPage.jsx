import { useEffect, useState } from "react";
import { getPublicTrack } from "../api.js";
import FleetMap from "./FleetMap.jsx";

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

const STEPS = [
  { key: "created", label: "Order placed", field: "createdAt" },
  { key: "started", label: "Out for delivery", field: "startedAt" },
  { key: "done", label: "Delivered", field: "completedAt" },
];

export default function PublicTrackPage({ token }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const d = await getPublicTrack(token);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setErr(e.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const vehiclesForMap =
    data?.vehicleLocation &&
    typeof data.vehicleLocation.lat === "number" &&
    typeof data.vehicleLocation.lng === "number"
      ? [
          {
            id: "tracked",
            plate: data.vehiclePlate ?? "Vehicle",
            model: "",
            status: data.status ?? "",
            location: data.vehicleLocation,
            lastUpdate: null,
          },
        ]
      : [];

  const highlightDelivery =
    data?.pickup &&
    data?.dropoff &&
    typeof data.pickup.lat === "number" &&
    typeof data.dropoff.lat === "number"
      ? {
          pickup: [data.pickup.lat, data.pickup.lng],
          dropoff: [data.dropoff.lat, data.dropoff.lng],
        }
      : null;

  return (
    <div className="app public-track">
      <header className="header header-auth public-track-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <h1>{data?.companyName ?? "Delivery tracking"}</h1>
            <p className="tagline">Live status · SmartFleet</p>
          </div>
        </div>
      </header>

      {loading && (
        <div className="public-track-body">
          <p className="muted">Loading…</p>
        </div>
      )}
      {err && (
        <div className="banner banner-error public-track-body" role="alert">
          {err}
        </div>
      )}
      {data && !loading && !err && (
        <div className="public-track-body">
          <section className="public-track-meta">
            <p className="public-track-status">
              Status: <strong>{String(data.status ?? "").replace(/_/g, " ")}</strong>
            </p>
            <ol className="public-timeline">
              {STEPS.map((s) => {
                const t = data[s.field];
                const done = Boolean(t);
                return (
                  <li key={s.key} className={`public-timeline-step ${done ? "public-timeline-step-done" : ""}`}>
                    <span className="public-timeline-dot" aria-hidden />
                    <div>
                      <div className="public-timeline-label">{s.label}</div>
                      <div className="muted public-timeline-time">{done ? formatTime(t) : "—"}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="public-track-map panel">
            <div className="panel-head">
              <h2>Map</h2>
            </div>
            <div className="fleet-map-shell public-track-map-shell">
              {vehiclesForMap.length > 0 || highlightDelivery ? (
                <FleetMap
                  vehicles={vehiclesForMap}
                  trailPositions={[]}
                  highlightDelivery={highlightDelivery}
                  focusVehicleId="tracked"
                />
              ) : (
                <p className="muted map-panel map-panel-empty">Location will appear when the vehicle is on the road.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
