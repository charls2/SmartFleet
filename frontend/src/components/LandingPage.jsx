import "./LandingPage.css";

/**
 * Marketing welcome screen shown before sign-in (Firebase mode).
 * Copy positions SmartFleet for logistics-scale operations; does not imply customer endorsement.
 */
export default function LandingPage({ onSignIn, onGetStarted, onJoinAsDriver }) {
  return (
    <div className="landing">
      <div className="landing-hero">
        <p className="landing-eyebrow">Fleet operations platform</p>
        <h1 className="landing-title">
          Visibility and control for <span className="landing-title-accent">high-volume logistics</span>
        </h1>
        <p className="landing-lead">
          SmartFleet AI brings vehicles, drivers, deliveries, and alerts into one live dashboard—so your
          dispatch and operations teams can respond faster, with data backed by a modern API and cloud
          infrastructure.
        </p>
        <div className="landing-cta-row">
          <button type="button" className="btn btn-primary landing-cta-primary" onClick={onSignIn}>
            Sign in
          </button>
          <button type="button" className="btn btn-secondary" onClick={onGetStarted}>
            Get started
          </button>
          {onJoinAsDriver && (
            <button type="button" className="btn btn-secondary landing-cta-driver" onClick={onJoinAsDriver}>
              Join as driver
            </button>
          )}
        </div>
        <p className="landing-note">No endorsement implied — product names illustrate the class of logistics networks SmartFleet is built for.</p>
      </div>

      <section className="landing-audience" aria-labelledby="landing-audience-heading">
        <h2 id="landing-audience-heading" className="landing-section-title">
          Built for operators who run at scale
        </h2>
        <p className="landing-section-text">
          Teams behind national parcel and courier brands (e.g. networks with the reach of{" "}
          <strong>Purolator</strong>), large retail last-mile programs (similar in complexity to{" "}
          <strong>Amazon</strong>-scale delivery), and dense regional hubs (comparable to{" "}
          <strong>Intelcom</strong>-style operations) need one place to see vehicles, exceptions, and
          commitments. SmartFleet targets that operational depth—not a toy dashboard.
        </p>
      </section>

      <section className="landing-features" aria-labelledby="landing-features-heading">
        <h2 id="landing-features-heading" className="landing-section-title">
          What you get
        </h2>
        <ul className="landing-feature-grid">
          <li className="landing-feature-card">
            <span className="landing-feature-icon" aria-hidden>
              ◉
            </span>
            <h3>Live fleet map</h3>
            <p>Track vehicle positions and status on an interactive map with optional GPS history trails.</p>
          </li>
          <li className="landing-feature-card">
            <span className="landing-feature-icon" aria-hidden>
              ⚑
            </span>
            <h3>Alerts &amp; exceptions</h3>
            <p>Open and resolve operational alerts tied to vehicles so nothing gets lost in a spreadsheet.</p>
          </li>
          <li className="landing-feature-card">
            <span className="landing-feature-icon" aria-hidden>
              ◎
            </span>
            <h3>Deliveries &amp; drivers</h3>
            <p>Coordinate deliveries and driver records in line with your fleet—ready to grow with your workflow.</p>
          </li>
          <li className="landing-feature-card">
            <span className="landing-feature-icon" aria-hidden>
              ⧉
            </span>
            <h3>Tenant &amp; roles</h3>
            <p>Per-company data isolation with sign-in and role-aware access for viewers and dispatchers.</p>
          </li>
        </ul>
      </section>

      <footer className="landing-footer">
        <p className="landing-footer-text">
          SmartFleet AI · Full-stack dashboard with Firestore-backed API. Evaluate in your own environment, then
          scale with your security and compliance requirements.
        </p>
        <button type="button" className="link-like" onClick={onSignIn}>
          Continue to sign in →
        </button>
      </footer>
    </div>
  );
}
