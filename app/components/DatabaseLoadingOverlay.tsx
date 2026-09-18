"use client";

import React from "react";

interface DatabaseLoadingOverlayProps {
  text?: string;
  title?: string;
  subtitle?: string;
}

export default function DatabaseLoadingOverlay({
  text = "Syncing...",
  title,
}: DatabaseLoadingOverlayProps) {
  const displayText = text || title || "Syncing...";

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

        <span className="db-sync-text">{displayText}</span>
      </div>
    </div>
  );
}
