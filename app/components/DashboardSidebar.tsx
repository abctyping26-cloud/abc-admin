"use client";

import React from "react";

export type SidebarTab = "overview" | "worker_admins" | "enquiries" | "clients";

interface DashboardSidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  isMaster?: boolean;
  pendingEnquiriesCount?: number;
}

export default function DashboardSidebar({
  activeTab,
  onSelectTab,
  isMaster = true,
  pendingEnquiriesCount = 0,
}: DashboardSidebarProps) {
  return (
    <aside className="dashboard-sidebar" aria-label="Admin Navigation">
      <nav className="sidebar-nav">
        {/* Overview */}
        <button
          type="button"
          onClick={() => onSelectTab("overview")}
          className={`sidebar-menu-btn ${activeTab === "overview" ? "active" : ""}`}
        >
          <div className="sidebar-menu-left">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            <span>Overview</span>
          </div>
        </button>

        {/* Clients & Services (Available to both Master Admin & Worker Admins) */}
        <button
          type="button"
          onClick={() => onSelectTab("clients")}
          className={`sidebar-menu-btn ${activeTab === "clients" ? "active" : ""}`}
        >
          <div className="sidebar-menu-left">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Clients & Files</span>
          </div>
        </button>

        {/* Worker Admins (Master Admin only) */}
        {isMaster && (
          <button
            type="button"
            onClick={() => onSelectTab("worker_admins")}
            className={`sidebar-menu-btn ${activeTab === "worker_admins" ? "active" : ""}`}
          >
            <div className="sidebar-menu-left">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Worker Admins</span>
            </div>
          </button>
        )}

        {/* Enquiries (Available to both Master Admin & Worker Admins) */}
        <button
          type="button"
          onClick={() => onSelectTab("enquiries")}
          className={`sidebar-menu-btn ${activeTab === "enquiries" ? "active" : ""}`}
        >
          <div className="sidebar-menu-left">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Enquiries</span>
          </div>
          {pendingEnquiriesCount > 0 && (
            <span className="sidebar-badge-count">
              {pendingEnquiriesCount}
            </span>
          )}
        </button>
      </nav>
    </aside>
  );
}

