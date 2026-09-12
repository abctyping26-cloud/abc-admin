"use client";

import React, { useState, useEffect } from "react";

interface DatabaseLoadingOverlayProps {
  title?: string;
  subtitle?: string;
}

export default function DatabaseLoadingOverlay({
  title = "Connecting to database...",
  subtitle = "Retrieving real-time records from MongoDB Atlas...",
}: DatabaseLoadingOverlayProps) {
  const [isSlowResponse, setIsSlowResponse] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSlowResponse(true);
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="db-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="db-loading-card">
        <svg
          className="db-spinner-svg"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="#e2e8f0"
            strokeWidth="3"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        <div className="db-loading-title">{title}</div>
        <div className="db-loading-subtitle">{subtitle}</div>

        <div className="db-loading-badge">
          <span className="db-loading-dot" aria-hidden="true" />
          <span>MongoDB Atlas Sync</span>
        </div>

        {isSlowResponse && (
          <div className="db-loading-slow-hint">
            The server is warming up from idle mode. Records will appear in a moment...
          </div>
        )}
      </div>
    </div>
  );
}
