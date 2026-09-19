"use client";

import React from "react";

export type SidebarTab =
  | "overview"
  | "worker_admins"
  | "enquiries"
  | "whatsapp_enquiries"
  | "clients";

interface DashboardSidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  isMaster?: boolean;
  pendingEnquiriesCount?: number;
  pendingWhatsAppCount?: number;
}

export default function DashboardSidebar({
  activeTab,
  onSelectTab,
  isMaster = true,
  pendingEnquiriesCount = 0,
  pendingWhatsAppCount = 0,
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

        {/* WhatsApp Enquiries (Available to both Master Admin & Worker Admins) */}
        <button
          type="button"
          onClick={() => onSelectTab("whatsapp_enquiries")}
          className={`sidebar-menu-btn ${activeTab === "whatsapp_enquiries" ? "active" : ""}`}
        >
          <div className="sidebar-menu-left">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{
                width: "18px",
                height: "18px",
                color: activeTab === "whatsapp_enquiries" ? "#16a34a" : "#22c55e",
              }}
            >
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.54 1.83.822 2.796.822 3.182 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.808-5.768-5.808zm3.387 8.248c-.145.409-.726.772-1.025.808-.299.037-.687.054-2.222-.596-1.536-.65-2.531-2.247-2.607-2.351-.076-.104-.627-.834-.627-1.591 0-.756.398-1.127.538-1.282.141-.155.308-.194.411-.194.103 0 .205.001.296.006.095.005.223-.036.349.266.126.302.431 1.05.469 1.127.038.077.064.168.013.272-.051.104-.077.168-.154.259-.077.091-.162.203-.231.272-.077.077-.157.16-.068.314.089.154.397.656.852 1.061.585.521 1.079.682 1.233.759.154.077.244.064.334-.038.09-.103.385-.448.487-.602.103-.154.205-.129.346-.077.141.051.898.423 1.052.5.154.077.256.116.295.18.038.064.038.372-.107.781z" />
            </svg>
            <span>WhatsApp Enquiries</span>
          </div>
          {pendingWhatsAppCount > 0 && (
            <span
              className="sidebar-badge-count"
              style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
            >
              {pendingWhatsAppCount}
            </span>
          )}
        </button>
      </nav>
    </aside>
  );
}

