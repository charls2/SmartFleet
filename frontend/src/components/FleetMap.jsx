import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function FitBounds({ boundsKey, points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, boundsKey, points]);
  return null;
}

function isValidCoord(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) return false;
  return true;
}

/**
 * @param {object} props
 * @param {unknown[]} props.vehicles
 * @param {[number, number][]} [props.trailPositions] — optional GPS trail (e.g. recent telemetry)
 */
export default function FleetMap({ vehicles, trailPositions = [] }) {
  const valid = useMemo(
    () =>
      Array.isArray(vehicles)
        ? vehicles.filter((v) => isValidCoord(v.location?.lat, v.location?.lng))
        : [],
    [vehicles]
  );
  const trailPts = useMemo(() => {
    if (!Array.isArray(trailPositions)) return [];
    return trailPositions.filter(
      (p) => Array.isArray(p) && isValidCoord(p[0], p[1])
    );
  }, [trailPositions]);

  const points = useMemo(
    () => valid.map((v) => [v.location.lat, v.location.lng]),
    [valid]
  );

  const fitPoints = useMemo(() => {
    const merged = [...points, ...trailPts];
    return merged;
  }, [points, trailPts]);

  const boundsKey = useMemo(
    () =>
      `${valid.map((v) => `${v.id}:${v.location.lat}:${v.location.lng}`).join("|")}|trail:${trailPts.map((p) => `${p[0]},${p[1]}`).join(";")}`,
    [valid, trailPts]
  );

  const defaultCenter = [45.5017, -73.5673];

  if (valid.length === 0 && trailPts.length === 0) {
    return (
      <div className="map-panel map-panel-empty">
        <p className="map-empty-msg">
          No vehicle locations on the map yet. Vehicles need non-zero latitude/longitude (set when creating or
          editing a vehicle, or via telemetry). Choose a vehicle to show a recent GPS trail if data exists.
        </p>
        <div className="map-fallback" aria-hidden />
      </div>
    );
  }

  const center = fitPoints[0] ?? defaultCenter;

  return (
    <div className="map-panel map-panel-filled">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom
        className="fleet-map"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds boundsKey={boundsKey} points={fitPoints} />
        {trailPts.length > 1 && (
          <Polyline positions={trailPts} pathOptions={{ color: "#38bdf8", weight: 4, opacity: 0.85 }} />
        )}
        {valid.map((v) => (
          <Marker key={v.id} position={[v.location.lat, v.location.lng]}>
            <Popup>
              <strong>{v.plate}</strong>
              <br />
              {v.model}
              <br />
              <span className="map-popup-status">{v.status}</span>
              <br />
              <span className="muted">{formatTime(v.lastUpdate)}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="map-attribution">
        Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}
