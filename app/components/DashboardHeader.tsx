"use client";

import React from "react";
import Link from "next/link";
import type { SidebarTab } from "./DashboardSidebar";
import { useTheme } from "../context/ThemeContext";

interface DashboardHeaderProps {
  user: {
    identifier?: string;
    role?: string;
    name?: string;
  } | null;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  isSidebarExpanded?: boolean;
  isShrunk?: boolean;
  onSelectTab?: (tab: SidebarTab) => void;
}

export default function DashboardHeader({
  user,
  onLogout,
  onToggleSidebar,
  isSidebarExpanded = false,
  isShrunk = false,
  onSelectTab,
}: DashboardHeaderProps) {
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

  const { theme, toggleTheme } = useTheme();

  return (
    <header className={`dashboard-header ${isShrunk ? "is-shrunk" : ""}`}>
      {/* Left side: hamburger button on mobile, clean abc logo on desktop */}
      <div className="header-left">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="header-hamburger-btn"
          aria-label={isSidebarExpanded ? "Collapse navigation menu" : "Expand navigation menu"}
          title={isSidebarExpanded ? "Collapse menu" : "Expand menu"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link
          href={isMaster ? "/?tab=overview" : "/?tab=enquiries"}
          onClick={(e) => {
            if (onSelectTab) {
              e.preventDefault();
              onSelectTab(isMaster ? "overview" : "enquiries");
            }
          }}
          className="header-logo-link"
          aria-label="ABC Typing Admin Homepage"
        >
          <span className="header-logo-text">abc</span>
          <span className="header-logo-dot" aria-hidden="true" />
        </Link>
      </div>

      {/* Right side: dark mode toggle, plain bell icon, circle M + user name, plain logout icon */}
      <div className="header-right">
        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="header-theme-toggle-btn"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              width="16"
              height="16"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              width="16"
              height="16"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
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
