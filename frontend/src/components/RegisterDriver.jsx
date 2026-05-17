import { useState } from "react";
import { getJoinDrivers, joinCompany } from "../api.js";
import { clearAuthIntent, setAuthIntent } from "../authIntent.js";

export default function RegisterDriver({ onRegistered, onSwitchToFleet }) {
  const [companyId, setCompanyId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  async function loadDrivers() {
    setError(null);
    const cid = companyId.trim();
    const code = inviteCode.trim();
    if (!cid || !code) {
      setError("Enter company ID and invite code first");
      return;
    }
    setLoadingDrivers(true);
    setDrivers([]);
    setDriverId("");
    setCompanyName("");
    try {
      const data = await getJoinDrivers(cid, code);
      setCompanyName(data.companyName ?? "");
      const list = Array.isArray(data.drivers) ? data.drivers : [];
      setDrivers(list);
      if (list.length === 1) {
        setDriverId(list[0].id);
      }
      if (list.length === 0) {
        setError("No driver profiles available to claim. Ask your dispatcher to add you or free an existing link.");
      }
    } catch (err) {
      setError(err.message ?? String(err));
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const cid = companyId.trim();
    const code = inviteCode.trim();
    if (!cid || !code || !driverId) {
      setError("Company ID, invite code, and driver profile are required");
      return;
    }
    setBusy(true);
    try {
      await joinCompany(cid, code, "driver", driverId);
      clearAuthIntent();
      onRegistered?.();
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSwitchToFleet() {
    setAuthIntent("fleet");
    onSwitchToFleet?.();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Join as driver</h2>
        <p className="auth-sub">
          Link your account to a driver profile at your company. Your dispatcher shares the company ID and invite
          code.
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-label">
            Company ID
            <input
              type="text"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="cmp_1"
              required
            />
          </label>
          <label className="auth-label">
            Invite code
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoComplete="off"
              placeholder="From your dispatcher"
              required
            />
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={loadDrivers}
            disabled={loadingDrivers || busy}
          >
            {loadingDrivers ? "Loading drivers…" : "Find my profile"}
          </button>
          {companyName && (
            <p className="auth-hint">
              Company: <strong>{companyName}</strong>
            </p>
          )}
          {drivers.length > 0 && (
            <label className="auth-label">
              Your driver profile
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
                <option value="">Select your name</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.assignedVehicleId ? " · vehicle assigned" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={busy || !driverId || drivers.length === 0}
          >
            {busy ? "…" : "Join & open driver app"}
          </button>
        </form>
        <p className="auth-hint auth-hint-dev">
          Local demo after <code>npm run seed</code>: company <code>cmp_1</code>, invite{" "}
          <code>seedinvitedemo01</code>, then pick e.g. John Doe.
        </p>
        {onSwitchToFleet && (
          <button type="button" className="btn btn-secondary auth-switch" onClick={handleSwitchToFleet}>
            Manage fleet instead (dispatcher / owner)
          </button>
        )}
      </div>
    </div>
  );
}
