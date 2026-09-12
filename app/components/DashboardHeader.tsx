"use client";

import React from "react";
import Link from "next/link";

interface DashboardHeaderProps {
  user: {
    identifier?: string;
    role?: string;
    name?: string;
  } | null;
  onLogout: () => void;
}

export default function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  const isMaster =
    user?.role === "master_admin" ||
    user?.role === "superadmin" ||
    user?.identifier === "masteradmin@abc.com";
  const displayName = user?.name || (isMaster ? "Master Admin" : "Worker Admin");
  const avatarLetter = isMaster
    ? "m"
    : user?.name?.trim()
    ? user.name.trim()[0].toLowerCase()
    : "w";

  return (
    <header className="dashboard-header">
      {/* Left side: clean abc logo only */}
      <div className="header-left">
        <Link
          href="/"
          className="header-logo-link"
          aria-label="ABC Typing Admin Homepage"
        >
          <span className="header-logo-text">abc</span>
          <span className="header-logo-dot" aria-hidden="true" />
        </Link>
      </div>

      {/* Right side: plain bell icon, circle M + user name, plain logout icon */}
      <div className="header-right">
        {/* Bell Icon in plain sight without border */}
        <button
          type="button"
          className="header-plain-icon-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Circle with m + gap + user name */}
        <div className="header-user-minimal">
          <div className="user-circle-m" aria-hidden="true">
            {avatarLetter}
          </div>
          <span className="user-name-text">{displayName}</span>
        </div>

        {/* Logout Icon in plain sight without border */}
        <button
          type="button"
          onClick={onLogout}
          className="header-plain-icon-btn"
          aria-label="Sign out"
          title="Sign out"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
