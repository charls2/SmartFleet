const AUTH_INTENT_KEY = "smartfleet_auth_intent";

/** @typedef {"fleet" | "driver"} AuthIntent */

/** @returns {AuthIntent} */
export function getAuthIntent() {
  if (typeof sessionStorage === "undefined") return "fleet";
  const v = sessionStorage.getItem(AUTH_INTENT_KEY);
  return v === "driver" ? "driver" : "fleet";
}

/** @param {AuthIntent} intent */
export function setAuthIntent(intent) {
  sessionStorage.setItem(AUTH_INTENT_KEY, intent === "driver" ? "driver" : "fleet");
}

export function clearAuthIntent() {
  sessionStorage.removeItem(AUTH_INTENT_KEY);
}
