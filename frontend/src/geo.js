/** Great-circle distance in km (WGS84 sphere). */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Rough ETA in minutes from vehicle to target using speed (km/h) or a default urban speed.
 * @param {number | null | undefined} speedKmh — if missing or tiny, uses fallbackKmh
 */
export function estimateEtaMinutes(vehicleLat, vehicleLng, targetLat, targetLng, speedKmh, fallbackKmh = 35) {
  const km = haversineKm(vehicleLat, vehicleLng, targetLat, targetLng);
  let v =
    typeof speedKmh === "number" && speedKmh > 0.5
      ? Math.min(Math.max(speedKmh, 12), 95)
      : fallbackKmh;
  if (v < 5) v = fallbackKmh;
  const hours = km / v;
  return Math.max(1, Math.round(hours * 60));
}
