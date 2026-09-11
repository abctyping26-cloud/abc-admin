"use client";

import React, { useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminLoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<{
    id: string;
    identifier: string;
    role: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setIsSubmitting(true);
    setError(null);
    setIsNotFound(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setIsNotFound(true);
        }
        throw new Error(data.message || "Failed to authenticate admin.");
      }

      // Store admin authentication token
      if (data.data?.token) {
        localStorage.setItem("abc_admin_token", data.data.token);
      }
      if (data.data?.admin) {
        localStorage.setItem(
          "abc_admin_user",
          JSON.stringify(data.data.admin)
        );
        setCurrentAdmin(data.data.admin);
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setError(null);
    setIsNotFound(false);
    setIdentifier("");
    setPassword("");
    setCurrentAdmin(null);
  };

  return (
    <div className="login-form-container">
      <div className="login-form-header">
        <h1 className="login-title">Sign in to Admin</h1>
        <p className="login-subtitle" style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>
          Internal access only. Self-registration is restricted.
        </p>
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
            <span
              style={{
                display: "inline-block",
                padding: "2px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: "9999px",
                backgroundColor: "#f1f5f9",
                color: "#0f172a",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Role: {currentAdmin?.role || "Admin"}
            </span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
              Authentication Successful
            </h3>
            <p style={{ fontSize: "0.88rem", color: "#64748b", marginTop: "4px" }}>
              Logged in as <strong style={{ color: "#0f172a" }}>{currentAdmin?.identifier || identifier}</strong>.
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
          {error && (
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: isNotFound ? "#fffbeb" : "#fef2f2",
                border: isNotFound ? "1px solid #fef3c7" : "1px solid #fecaca",
                borderRadius: "10px",
                color: isNotFound ? "#92400e" : "#b91c1c",
                fontSize: "0.86rem",
                lineHeight: "1.4",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <span>{isNotFound ? "🚫" : "⚠️"}</span>
                <div>
                  <strong>{isNotFound ? "Account Not Found" : "Authentication Failed"}</strong>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem" }}>{error}</p>
                </div>
              </div>
            </div>
          )}

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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
            style={{ opacity: isSubmitting ? 0.75 : 1, cursor: isSubmitting ? "not-allowed" : "pointer" }}
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
            🔒 Restricted access. Authorized ABC Typing personnel only.
          </p>
        </form>
      )}
    </div>
  );
}
