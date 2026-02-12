import Link from "next/link";
import "../css/auth.css";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your account",
};

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card auth-form-card">
          <div className="auth-form-wrap">
          <span className="auth-logo" aria-hidden />
          <h1 className="auth-heading">Welcome back</h1>
          <p className="auth-subtitle">
            Enter your account details below to continue
          </p>

          <form className="auth-form" action="#" method="post">
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="auth-options">
              <label className="auth-remember">
                <input type="checkbox" name="remember" value="30" />
                Remember for 30 days
              </label>
              <Link href="#" className="auth-link">
                Forgot password?
              </Link>
            </div>

            <Link href="/dashboard" className="auth-btn-primary" style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
              Sign in
            </Link>
            <button type="button" className="auth-btn-secondary">
              Sign in with one-time code
            </button>
          </form>

          <p className="auth-footer">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="auth-link">
              Sign up
            </Link>
          </p>
          </div>
        </div>

        <div className="auth-card auth-promo-card">
          <h2 className="auth-promo-heading">
            Your new home for energy efficiency and costs savings
          </h2>
          <div className="auth-trust-badge">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v2.25a3 3 0 003 3h10.5a3 3 0 003-3v-2.25a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zM3.75 9V6.75a8.25 8.25 0 1116.5 0V9v1.5a4.5 4.5 0 00-4.5 4.5v2.25a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V15a4.5 4.5 0 00-4.5-4.5V9z"
                clipRule="evenodd"
              />
            </svg>
            Trusted by thousands of customers
          </div>

          <div className="auth-mockups">
            <div className="auth-mockup-phone">
              <div className="auth-mockup-tabs">
                <span className="auth-mockup-tab active">Usage</span>
                <span className="auth-mockup-tab">Billing</span>
                <span className="auth-mockup-tab">Services</span>
              </div>
              <div style={{ height: 40, background: "#eee", borderRadius: 8 }} />
            </div>
            <div className="auth-mockup-chart">
              <div className="auth-mockup-chart-title">Usage over time</div>
              <div className="auth-chart-bars">
                <div className="auth-chart-bar purple" />
                <div className="auth-chart-bar purple" />
                <div className="auth-chart-bar purple" />
                <div className="auth-chart-bar purple" />
                <div className="auth-chart-bar green" />
                <div className="auth-chart-bar green" />
                <div className="auth-chart-bar green" />
                <div className="auth-chart-bar green" />
              </div>
              <div className="auth-chart-labels">
                <span>Nov 15</span>
                <span>Dec 15</span>
                <span>Jan 15</span>
                <span>Feb 15</span>
              </div>
              <div className="auth-chart-legend">
                <span className="electricity">• Electricity -15.3%</span>
                <span className="gas">• Gas -32%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
