import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, firebaseConfigured } from "../firebase.js";
import { getAuthIntent, setAuthIntent } from "../authIntent.js";

export default function AuthScreen({
  onBackToWelcome,
  defaultMode = "login",
  onSwitchRegistrationKind,
}) {
  const authIntent = getAuthIntent();
  const isDriver = authIntent === "driver";
  const [mode, setMode] = useState(() => (defaultMode === "register" ? "register" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!auth) return;
    setBusy(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseConfigured || !auth) {
    return (
      <div className="auth-card">
        <h2>Account sign-in unavailable</h2>
        <p className="auth-hint">
          Add Firebase web app config to <code>frontend/.env</code> (<code>VITE_FIREBASE_*</code>) or use{" "}
          <strong>tenant header</strong> mode for local development.
        </p>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        <p className="auth-sub">
          {mode === "register"
            ? isDriver
              ? "After sign-up you will link your driver profile with an invite code."
              : "After sign-up you will register your company name."
            : isDriver
              ? "Sign in to open your driver deliveries."
              : "Use your SmartFleet account."}
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label className="auth-label">
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button type="button" className="btn btn-secondary auth-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </button>
        {onSwitchRegistrationKind && (
          <button
            type="button"
            className="btn btn-secondary auth-switch"
            onClick={() => {
              setAuthIntent(isDriver ? "fleet" : "driver");
              onSwitchRegistrationKind();
            }}
          >
            {isDriver ? "Manage fleet instead (dispatcher)" : "Join as driver instead"}
          </button>
        )}
        {onBackToWelcome && (
          <button type="button" className="auth-back-welcome" onClick={onBackToWelcome}>
            ← Back to welcome
          </button>
        )}
      </div>
    </div>
  );
}
