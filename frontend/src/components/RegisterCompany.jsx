import { useState } from "react";
import { joinCompany, registerCompany } from "../api.js";

export default function RegisterCompany({ onRegistered }) {
  const [mode, setMode] = useState("create");
  const [companyName, setCompanyName] = useState("");
  const [joinCompanyId, setJoinCompanyId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinRole, setJoinRole] = useState("dispatcher");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submitCreate(e) {
    e.preventDefault();
    setError(null);
    const name = companyName.trim();
    if (!name) {
      setError("Company name is required");
      return;
    }
    setBusy(true);
    try {
      await registerCompany(name);
      onRegistered?.();
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitJoin(e) {
    e.preventDefault();
    setError(null);
    const cid = joinCompanyId.trim();
    const code = joinCode.trim();
    if (!cid || !code) {
      setError("Company ID and invite code are required");
      return;
    }
    setBusy(true);
    try {
      await joinCompany(cid, code, joinRole === "viewer" ? "viewer" : "dispatcher");
      onRegistered?.();
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>{mode === "create" ? "Register your company" : "Join a company"}</h2>
        <p className="auth-sub">
          {mode === "create"
            ? "Your fleet will be scoped to this organization."
            : "Use the company ID and invite code from your admin."}
        </p>
        <div className="auth-mode-toggle">
          <button
            type="button"
            className={`btn btn-sm ${mode === "create" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("create")}
          >
            New company
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === "join" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("join")}
          >
            Join with invite
          </button>
        </div>
        {mode === "create" ? (
          <form className="auth-form" onSubmit={submitCreate}>
            <label className="auth-label">
              Company name
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Logistics"
                required
              />
            </label>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
              {busy ? "…" : "Create company & continue"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitJoin}>
            <label className="auth-label">
              Company ID
              <input
                type="text"
                value={joinCompanyId}
                onChange={(e) => setJoinCompanyId(e.target.value)}
                placeholder="Firestore document id"
                required
              />
            </label>
            <label className="auth-label">
              Invite code
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                autoComplete="off"
                required
              />
            </label>
            <label className="auth-label">
              Role
              <select value={joinRole} onChange={(e) => setJoinRole(e.target.value)}>
                <option value="dispatcher">Dispatcher</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
            </label>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
              {busy ? "…" : "Join company"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
