"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../css/auth.css";

export default function SignupPage() {
  const router = useRouter();
  const { register, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register(email, name, password);
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card auth-form-card">
          <div className="auth-form-wrap">
          <span className="auth-logo" aria-hidden />
          <h1 className="auth-heading">Create your account</h1>
          <p className="auth-subtitle">
            Enter your details below to get started
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <Link href="/login" className="auth-link">
              Sign in
            </Link>
          </p>
          </div>
        </div>

        <div className="auth-card auth-promo-card">
          <div className="auth-promo-inner">
          <h2 className="auth-promo-heading">
            Your new home for energy efficiency and cost savings
          </h2>
          <p className="auth-promo-subtitle">
            Track usage, manage billing, and unlock insights—all in one place.
          </p>
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
    </div>
  );
}
