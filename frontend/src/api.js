const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const COMPANY_STORAGE_KEY = "smartfleet_company_id";

export function getCompanyId() {
  if (typeof window === "undefined") return "cmp_1";
  return localStorage.getItem(COMPANY_STORAGE_KEY) ?? "cmp_1";
}

export function setCompanyId(id) {
  localStorage.setItem(COMPANY_STORAGE_KEY, id);
}

async function request(path, options = {}) {
  const companyId = getCompanyId();
  const headers = {
    Accept: "application/json",
    ...options.headers,
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (companyId) {
    headers["x-company-id"] = companyId;
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

export function getFleetStats(companyId) {
  return request(`/fleetStats/${encodeURIComponent(companyId)}`);
}

export function getVehicles(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request(`/vehicles${q}`);
}

export function getDeliveries(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request(`/deliveries${q}`);
}

export function getAlerts(resolved) {
  if (resolved === "open") return request("/alerts?resolved=false");
  if (resolved === "closed") return request("/alerts?resolved=true");
  return request("/alerts");
}

export function postVehicleLocation(vehicleId, body) {
  return request(`/vehicles/${encodeURIComponent(vehicleId)}/location`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
