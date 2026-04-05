import { auth } from "./firebase.js";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const COMPANY_STORAGE_KEY = "smartfleet_company_id";

export function getCompanyId() {
  if (typeof window === "undefined") return "cmp_1";
  return localStorage.getItem(COMPANY_STORAGE_KEY) ?? "cmp_1";
}

export function setCompanyId(id) {
  localStorage.setItem(COMPANY_STORAGE_KEY, id);
}

/** Local dev: allow x-company-id unless explicitly disabled (set VITE_ALLOW_HEADER_TENANT=false). */
const allowHeaderTenant = import.meta.env.VITE_ALLOW_HEADER_TENANT !== "false";

async function request(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const user = auth?.currentUser ?? null;
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } else if (allowHeaderTenant) {
    const companyId = getCompanyId();
    if (companyId) headers["x-company-id"] = companyId;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const err = new Error(data?.error ?? res.statusText ?? "Request failed");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function getHealth() {
  return request("/health");
}

export function getMe() {
  return request("/auth/me");
}

export function registerCompany(companyName) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ companyName }),
  });
}

export function joinCompany(companyId, inviteCode, role) {
  return request("/auth/join", {
    method: "POST",
    body: JSON.stringify({
      companyId,
      inviteCode,
      ...(role ? { role } : {}),
    }),
  });
}

export function getFleetStats(companyId) {
  return request(`/fleetStats/${encodeURIComponent(companyId)}`);
}

export function getVehicles(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request(`/vehicles${q}`);
}

export function getVehicleTelemetry(vehicleId, limit) {
  const q = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  return request(`/vehicles/${encodeURIComponent(vehicleId)}/telemetry${q}`);
}

export function createVehicle(body) {
  return request("/vehicles", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchVehicle(vehicleId, body) {
  return request(`/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteVehicle(vehicleId) {
  return request(`/vehicles/${encodeURIComponent(vehicleId)}`, {
    method: "DELETE",
  });
}

export function getDrivers() {
  return request("/drivers");
}

export function createDriver(body) {
  return request("/drivers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchDriver(driverId, body) {
  return request(`/drivers/${encodeURIComponent(driverId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteDriver(driverId) {
  return request(`/drivers/${encodeURIComponent(driverId)}`, {
    method: "DELETE",
  });
}

export function getDeliveries(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request(`/deliveries${q}`);
}

export function createDelivery(body) {
  return request("/deliveries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchDelivery(deliveryId, body) {
  return request(`/deliveries/${encodeURIComponent(deliveryId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** Open, closed, or all alerts */
export function getAlerts(resolved) {
  if (resolved === "open") return request("/alerts?resolved=false");
  if (resolved === "closed") return request("/alerts?resolved=true");
  return request("/alerts");
}

export function createAlert(body) {
  return request("/alerts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchAlert(alertId, body) {
  return request(`/alerts/${encodeURIComponent(alertId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function postVehicleLocation(vehicleId, body) {
  return request(`/vehicles/${encodeURIComponent(vehicleId)}/location`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export { allowHeaderTenant, API_BASE };
