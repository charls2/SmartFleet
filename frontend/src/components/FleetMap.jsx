import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
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

const pickupIcon = L.divIcon({
  className: "map-pin map-pin-pickup",
  html: "<span>P</span>",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const dropoffIcon = L.divIcon({
  className: "map-pin map-pin-dropoff",
  html: "<span>D</span>",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
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
 * @param {[number, number][]} [props.trailPositions]
 * @param {{ pickup: [number, number], dropoff: [number, number] } | null} [props.highlightDelivery]
 * @param {[number, number][]} [props.routePositions]
 * @param {[number, number] | null} [props.driverPosition]
 */
export default function FleetMap({
  vehicles,
  trailPositions = [],
  highlightDelivery = null,
  routePositions = [],
  driverPosition = null,
}) {
  const valid = useMemo(
    () =>
      Array.isArray(vehicles)
        ? vehicles.filter((v) => isValidCoord(v.location?.lat, v.location?.lng))
        : [],
    [vehicles]
  );
  const trailPts = useMemo(() => {
    if (!Array.isArray(trailPositions)) return [];
    return trailPositions.filter((p) => Array.isArray(p) && isValidCoord(p[0], p[1]));
  }, [trailPositions]);

  const routePts = useMemo(() => {
    if (!Array.isArray(routePositions)) return [];
    return routePositions.filter((p) => Array.isArray(p) && isValidCoord(p[0], p[1]));
  }, [routePositions]);

  const pickupPos = useMemo(() => {
    if (!highlightDelivery?.pickup) return null;
    const [lat, lng] = highlightDelivery.pickup;
    return isValidCoord(lat, lng) ? [lat, lng] : null;
  }, [highlightDelivery]);

  const dropoffPos = useMemo(() => {
    if (!highlightDelivery?.dropoff) return null;
    const [lat, lng] = highlightDelivery.dropoff;
    return isValidCoord(lat, lng) ? [lat, lng] : null;
  }, [highlightDelivery]);

  const driverPos = useMemo(() => {
    if (!driverPosition || !Array.isArray(driverPosition)) return null;
    const [lat, lng] = driverPosition;
    return isValidCoord(lat, lng) ? [lat, lng] : null;
  }, [driverPosition]);

  const points = useMemo(() => valid.map((v) => [v.location.lat, v.location.lng]), [valid]);

  const fitPoints = useMemo(() => {
    const merged = [...points, ...trailPts, ...routePts];
    if (pickupPos) merged.push(pickupPos);
    if (dropoffPos) merged.push(dropoffPos);
    if (driverPos) merged.push(driverPos);
    return merged;
  }, [points, trailPts, routePts, pickupPos, dropoffPos, driverPos]);

  const boundsKey = useMemo(
    () =>
      `${valid.map((v) => `${v.id}:${v.location.lat}:${v.location.lng}`).join("|")}|r:${routePts.length}|d:${driverPos}|p:${pickupPos}|o:${dropoffPos}`,
    [valid, routePts.length, driverPos, pickupPos, dropoffPos]
  );

  const defaultCenter = [45.5017, -73.5673];

  if (fitPoints.length === 0) {
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
        {routePts.length > 1 && (
          <Polyline positions={routePts} pathOptions={{ color: "#38bdf8", weight: 5, opacity: 0.9 }} />
        )}
        {trailPts.length > 1 && (
          <Polyline positions={trailPts} pathOptions={{ color: "#94a3b8", weight: 3, opacity: 0.6, dashArray: "6 8" }} />
        )}
        {pickupPos && (
          <Marker position={pickupPos} icon={pickupIcon}>
            <Popup>Pickup</Popup>
          </Marker>
        )}
        {dropoffPos && (
          <Marker position={dropoffPos} icon={dropoffIcon}>
            <Popup>Drop-off</Popup>
          </Marker>
        )}
        {driverPos && (
          <CircleMarker
            center={driverPos}
            radius={10}
            pathOptions={{ color: "#0ea5e9", fillColor: "#38bdf8", fillOpacity: 0.95, weight: 3 }}
          >
            <Popup>You are here</Popup>
          </CircleMarker>
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
        Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Route via OSRM
      </p>
    </div>
  );
}
