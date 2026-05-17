/**
 * Fetch a driving route polyline via OSRM (no API key; public demo server).
 * @returns {Promise<[number, number][] | null>} [lat, lng] pairs
 */
export async function fetchDrivingRoute(waypoints) {
  const pts = waypoints.filter(
    (p) => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number"
  );
  if (pts.length < 2) return null;
  const coordStr = pts.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}

/** Open turn-by-turn directions in Google Maps (external). */
export function googleMapsDirectionsUrl(waypoints) {
  const pts = waypoints.filter((p) => p?.lat != null && p?.lng != null);
  if (pts.length === 0) return null;
  if (pts.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${pts[0].lat},${pts[0].lng}`;
  }
  const origin = pts[0];
  const dest = pts[pts.length - 1];
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}`;
  if (pts.length > 2) {
    const mid = pts.slice(1, -1).map((p) => `${p.lat},${p.lng}`).join("|");
    url += `&waypoints=${encodeURIComponent(mid)}`;
  }
  return url;
}
