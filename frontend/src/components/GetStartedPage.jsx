import "./GetStartedPage.css";

/**
 * Intermediate screen after "Get Started" on the landing page — oriented to new organizations.
 */
export default function GetStartedPage({ onCreateAccount, onSignIn, onBackToWelcome, onJoinAsDriver }) {
  return (
    <div className="get-started">
      <div className="get-started-inner">
        <p className="get-started-eyebrow">Get started</p>
        <h1 className="get-started-title">Create your SmartFleet workspace</h1>
        <p className="get-started-lead">
          You will create a secure account with email and password (handled by Firebase Authentication), then
          register your company name so your fleet data stays isolated to your organization.
        </p>
        <ol className="get-started-steps">
          <li>
            <strong>Create account</strong> — email and password (minimum length enforced by Firebase).
          </li>
          <li>
            <strong>Register company</strong> — choose your organization name to finish onboarding.
          </li>
          <li>
            <strong>Invite your team</strong> — share your invite code from settings so dispatchers and viewers can
            join (optional).
          </li>
        </ol>
        <div className="get-started-actions">
          <button type="button" className="btn btn-primary get-started-primary" onClick={onCreateAccount}>
            Create account
          </button>
          <button type="button" className="btn btn-secondary" onClick={onSignIn}>
            Sign in instead
          </button>
          {onJoinAsDriver && (
            <button type="button" className="btn btn-secondary" onClick={onJoinAsDriver}>
              Join as driver
            </button>
          )}
        </div>
        {onBackToWelcome && (
          <button type="button" className="get-started-back" onClick={onBackToWelcome}>
            ← Back to welcome
          </button>
        )}
      </div>
    </div>
  );
}
