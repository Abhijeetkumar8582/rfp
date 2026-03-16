"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { decodeInviteTokenPayload, validateInvite, completeInvite } from "../../lib/api";
import "../css/auth.css";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { refreshUser } = useAuth();

  const [info, setInfo] = useState(null);
  const [validating, setValidating] = useState(!!token);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateToken = useCallback(async () => {
    if (!token) {
      setInvalidLink(true);
      setValidating(false);
      return;
    }
    // Show email/name from JWT payload immediately (no verification — display only)
    const payload = decodeInviteTokenPayload(token);
    if (payload) setInfo({ email: payload.email, name: payload.name });
    setValidating(true);
    setInvalidLink(false);
    try {
      const data = await validateInvite(token);
      setInfo({ email: data.email, name: data.name });
    } catch {
      setInvalidLink(true);
    } finally {
      setValidating(false);
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await completeInvite({ token, new_password: password });
      refreshUser();
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Could not set password");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-form-card">
            <div className="auth-form-wrap">
              <p className="auth-subtitle">Checking your link…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (invalidLink || !token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-form-card">
            <div className="auth-form-wrap">
              <Image
                src="/kizaheaderlogo.png"
                alt="Logo"
                width={120}
                height={120}
                className="auth-logo auth-logo-img"
                priority
                unoptimized
              />
              <h1 className="auth-heading">Invalid or expired link</h1>
              <p className="auth-subtitle">
                This set-password link is missing, invalid, or has already been used. Request a new invite if needed.
              </p>
              <Link href="/login" className="auth-btn-primary" style={{ display: "inline-block", textAlign: "center", marginTop: "1rem" }}>
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-form-card">
          <div className="auth-form-wrap">
            <Image
              src="/kizaheaderlogo.png"
              alt="Logo"
              width={120}
              height={120}
              className="auth-logo auth-logo-img"
              priority
              unoptimized
            />
            <h1 className="auth-heading">Set your password</h1>
            <p className="auth-subtitle">
              {info?.name ? (
                <>Set a password for <strong>{info.name}</strong> ({info.email})</>
              ) : (
                "Choose a secure password to activate your account."
              )}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? "Setting password…" : "Set password & sign in"}
              </button>

              <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
                <Link href="/login" className="auth-link">Back to sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
