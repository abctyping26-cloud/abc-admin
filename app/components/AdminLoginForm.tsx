"use client";

import React, { useState } from "react";

export default function AdminLoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    setIdentifier("");
    setPassword("");
  };

  return (
    <div className="login-form-container">
      <div className="login-form-header">
        <h1 className="login-title">Sign in to Admin</h1>
      </div>

      {submitted ? (
        <div
          style={{
            padding: "28px 24px",
            backgroundColor: "#f8fafc",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
              Authentication Successful
            </h3>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "4px" }}>
              Logged in as <strong style={{ color: "#0f172a" }}>{identifier}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            style={{
              marginTop: "8px",
              padding: "8px 18px",
              fontSize: "0.85rem",
              fontWeight: 500,
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "9999px",
              cursor: "pointer",
            }}
          >
            Sign in with different admin account
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          {/* Admin Email or Username */}
          <div className="login-field">
            <label htmlFor="admin-identifier" className="login-label">
              Admin Email or Username
            </label>
            <div className="login-input-wrapper">
              <input
                id="admin-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@abctyping.com"
                className="login-input"
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="login-field">
            <div className="login-field-header">
              <label htmlFor="admin-password" className="login-label">
                Password
              </label>
              <a href="#forgot" className="login-forgot-link">
                Forgot password?
              </a>
            </div>
            <div className="login-input-wrapper">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="login-input"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>


          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
            style={{ opacity: isSubmitting ? 0.8 : 1 }}
          >
            <span>{isSubmitting ? "Authenticating..." : "Sign in to Admin"}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          {/* Security notice */}
          <p className="login-footer-text" style={{ marginTop: "12px" }}>
            Restricted access. Authorized ABC Typing personnel only.
          </p>
        </form>
      )}
    </div>
  );
}
