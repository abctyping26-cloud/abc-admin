"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

export type SidebarTab =
  | "overview"
  | "notes"
  | "activity_log"
  | "worker_admins"
  | "enquiries"
  | "whatsapp_enquiries"
  | "clients"
  | "website_edit"
  | "services"
  | "accounting"
  | "accounting_suppliers"
  | "accounting_incomes"
  | "accounting_expenses"
  | "accounting_invoices"
  | "accounting_banks"
  | "accounting_cash"
  | "cloud_usage"
  | "web_traffic";

export type AdminProject = "abc_typing" | "abc_neon";

interface DashboardSidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  selectedProject: AdminProject;
  onSelectProject: (project: AdminProject) => void;
  isMaster?: boolean;
  user?: {
    id?: string;
    identifier?: string;
    role?: string;
    assignedRoles?: string[];
    canDeleteData?: boolean;
  } | null;
  pendingEnquiriesCount?: number;
  pendingWhatsAppCount?: number;
  isExpanded?: boolean;
  isShrunk?: boolean;
  onCollapse?: () => void;
}

export default function DashboardSidebar({
  activeTab,
  onSelectTab,
  selectedProject,
  onSelectProject,
  isMaster = true,
  user,
  pendingEnquiriesCount = 0,
  pendingWhatsAppCount = 0,
  isExpanded = false,
  isShrunk = false,
  onCollapse,
}: DashboardSidebarProps) {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectSelectorRef = useRef<HTMLDivElement>(null);

  const canAccessTab = (tab: string): boolean => {
    if (tab === "notes") return true;
    if (isMaster) return true;
    if (tab === "worker_admins" || tab === "activity_log") return false;
    const roles = user?.assignedRoles;
    if (!roles || roles.length === 0) {
      return ["clients", "enquiries", "whatsapp_enquiries", "accounting", "overview", "notes"].includes(tab);
    }
    if (tab === "accounting" || tab.startsWith("accounting_")) {
      return roles.includes("accounting");
    }
    if (tab === "cloud_usage" || tab === "web_traffic") {
      return roles.includes("analytics") || roles.includes("cloud_usage") || roles.includes("web_traffic");
    }
    if (tab === "website_edit" || tab === "services") {
      return roles.includes("website_edit");
    }
    if (tab === "overview") {
      return roles.includes("overview");
    }
    return roles.includes(tab);
  };

  const isAccountingSectionActive =
    activeTab === "accounting" ||
    activeTab === "accounting_suppliers" ||
    activeTab === "accounting_incomes" ||
    activeTab === "accounting_expenses" ||
    activeTab === "accounting_invoices" ||
    activeTab === "accounting_banks" ||
    activeTab === "accounting_cash";

  const [isAccountingOpen, setIsAccountingOpen] = useState(true);

  useEffect(() => {
    if (isAccountingSectionActive) {
      setIsAccountingOpen(true);
    }
  }, [isAccountingSectionActive]);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isProjectDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectSelectorRef.current &&
        !projectSelectorRef.current.contains(event.target as Node)
      ) {
        setIsProjectDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProjectDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProjectDropdownOpen]);

  return (
    <aside
      className={`dashboard-sidebar ${isExpanded ? "is-expanded" : ""} ${isShrunk ? "is-shrunk" : ""}`}
      aria-label="Admin Navigation"
    >
      {/* Mobile-only Header with Collapse / X Button */}
      <div className="sidebar-mobile-header">
        <span className="sidebar-mobile-title">Menu</span>
        <button
          type="button"
          onClick={onCollapse}
          className="sidebar-collapse-btn"
          aria-label="Collapse sidebar to icon rail"
          title="Collapse"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Project Switcher Dropdown at Top */}
      <div className="sidebar-project-selector" ref={projectSelectorRef}>
        <div className="sidebar-project-label">Project</div>
        <div className="sidebar-project-dropdown-wrapper">
          <button
            type="button"
            className="sidebar-project-trigger"
            onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
            aria-expanded={isProjectDropdownOpen}
            aria-haspopup="listbox"
            title={selectedProject === "abc_neon" ? "ABC Neon" : "ABC Typing"}
          >
            <div className="sidebar-project-trigger-left">
              <span
                className={`sidebar-project-avatar ${
                  selectedProject === "abc_neon" ? "avatar-neon" : "avatar-typing"
                }`}
                aria-hidden="true"
              >
                {selectedProject === "abc_neon" ? "N" : "T"}
              </span>
              <div className="sidebar-project-text-group">
                <span className="sidebar-project-name">
                  {selectedProject === "abc_neon" ? "ABC Neon" : "ABC Typing"}
                </span>
                <span className="sidebar-project-sub">
                  {selectedProject === "abc_neon" ? "Neon Settings" : "Typing"}
                </span>
              </div>
            </div>
            <svg
              className={`sidebar-project-chevron ${isProjectDropdownOpen ? "open" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isProjectDropdownOpen && (
            <div className="sidebar-project-menu" role="listbox">
              <button
                type="button"
                role="option"
                aria-selected={selectedProject === "abc_typing"}
                className={`sidebar-project-menu-item ${
                  selectedProject === "abc_typing" ? "active" : ""
                }`}
                onClick={() => {
                  onSelectProject("abc_typing");
                  setIsProjectDropdownOpen(false);
                }}
              >
                <div className="sidebar-project-menu-item-left">
                  <span className="sidebar-project-avatar avatar-typing" aria-hidden="true">
                    T
                  </span>
                  <div className="sidebar-project-menu-item-text">
                    <span className="sidebar-project-menu-item-title">ABC Typing</span>
                    <span className="sidebar-project-menu-item-desc">Typing services & CRM</span>
                  </div>
                </div>
                {selectedProject === "abc_typing" && (
                  <svg
                    className="sidebar-project-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                role="option"
                aria-selected={selectedProject === "abc_neon"}
                className={`sidebar-project-menu-item ${
                  selectedProject === "abc_neon" ? "active" : ""
                }`}
                onClick={() => {
                  onSelectProject("abc_neon");
                  setIsProjectDropdownOpen(false);
                }}
              >
                <div className="sidebar-project-menu-item-left">
                  <span className="sidebar-project-avatar avatar-neon" aria-hidden="true">
                    N
                  </span>
                  <div className="sidebar-project-menu-item-text">
                    <span className="sidebar-project-menu-item-title">ABC Neon</span>
                    <span className="sidebar-project-menu-item-desc">Neon settings</span>
                  </div>
                </div>
                {selectedProject === "abc_neon" && (
                  <svg
                    className="sidebar-project-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedProject === "abc_typing" ? (
        <>
          <nav className="sidebar-nav">
        {/* Overview */}
        {canAccessTab("overview") && (
          <button
            type="button"
            onClick={() => onSelectTab("overview")}
            className={`sidebar-menu-btn ${activeTab === "overview" ? "active" : ""}`}
            title="Overview"
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
        )}

        {/* Notes & Sticky Canvas */}
        {canAccessTab("notes") && (
          <button
            type="button"
            onClick={() => onSelectTab("notes")}
            className={`sidebar-menu-btn ${activeTab === "notes" ? "active" : ""}`}
            title="Notes"
          >
            <div className="sidebar-menu-left">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
                <path d="M15 3v6h6" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
              <span>Notes</span>
            </div>
          </button>
        )}

        {/* Clients & Files (Available to both Master Admin & Worker Admins) */}
        {canAccessTab("clients") && (
          <button
            type="button"
            onClick={() => onSelectTab("clients")}
            className={`sidebar-menu-btn ${activeTab === "clients" ? "active" : ""}`}
            title="Clients & Files"
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
        )}

        {/* Website Edit (Services, Documentation & Top Marquee) */}
        {canAccessTab("website_edit") && (
          <button
            type="button"
            onClick={() => onSelectTab("website_edit")}
            className={`sidebar-menu-btn ${
              activeTab === "website_edit" || activeTab === "services" ? "active" : ""
            }`}
          >
            <div className="sidebar-menu-left">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span>Website Edit</span>
            </div>
          </button>
        )}

        {/* Activity Log (Master Admin only) */}
        {isMaster && (
          <button
            type="button"
            onClick={() => onSelectTab("activity_log")}
            className={`sidebar-menu-btn ${activeTab === "activity_log" ? "active" : ""}`}
          >
            <div className="sidebar-menu-left">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Activity Log</span>
            </div>
          </button>
        )}

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
        {canAccessTab("enquiries") && (
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
        )}

        {/* WhatsApp Enquiries (Available to both Master Admin & Worker Admins) */}
        {canAccessTab("whatsapp_enquiries") && (
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
        )}

        {/* Accounting Group with Sub-sections */}
        {canAccessTab("accounting") && (
          <div className="sidebar-menu-group">
            <button
              type="button"
              onClick={() => {
                onSelectTab("accounting");
                setIsAccountingOpen(true);
              }}
              className={`sidebar-menu-btn ${isAccountingSectionActive ? "active" : ""}`}
              title="Accounting"
            >
              <div className="sidebar-menu-left">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="16" height="20" x="4" y="2" rx="2" />
                  <line x1="8" x2="16" y1="6" y2="6" />
                  <line x1="16" x2="16" y1="14" />
                  <path d="M16 10h.01" />
                  <path d="M12 10h.01" />
                  <path d="M8 10h.01" />
                  <path d="M12 14h.01" />
                  <path d="M8 14h.01" />
                  <path d="M12 18h.01" />
                  <path d="M8 18h.01" />
                </svg>
                <span>Accounting</span>
              </div>
              <span
                className="sidebar-chevron-hitbox"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAccountingOpen((prev) => !prev);
                }}
                title={isAccountingOpen ? "Collapse Submenu" : "Expand Submenu"}
                style={{ display: "inline-flex", alignItems: "center", padding: "4px" }}
              >
                <svg
                  className="sidebar-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    width: 14,
                    height: 14,
                    transform: isAccountingOpen ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </button>

            {/* Sub-sections: Suppliers, Incomes, Expenses, Invoices, Accounting Hub */}
            {isAccountingOpen && (
              <div className="sidebar-submenu">
                <button
                  type="button"
                  onClick={() => onSelectTab("accounting_suppliers")}
                  className={`sidebar-submenu-btn ${activeTab === "accounting_suppliers" ? "active" : ""}`}
                  title="Suppliers"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Suppliers</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab("accounting_incomes")}
                  className={`sidebar-submenu-btn ${activeTab === "accounting_incomes" ? "active" : ""}`}
                  title="Incomes"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                  <span>Incomes</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab("accounting_expenses")}
                  className={`sidebar-submenu-btn ${activeTab === "accounting_expenses" ? "active" : ""}`}
                  title="Expenses"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                    <polyline points="17 18 23 18 23 12" />
                  </svg>
                  <span>Expenses</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab("accounting_invoices")}
                  className={`sidebar-submenu-btn ${activeTab === "accounting_invoices" ? "active" : ""}`}
                  title="Invoices"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>Invoices</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab("accounting_banks")}
                  className={`sidebar-submenu-btn ${activeTab === "accounting_banks" ? "active" : ""}`}
                  title="Banks"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4" />
                  </svg>
                  <span>Banks</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab("accounting_cash")}
                  className={`sidebar-submenu-btn ${activeTab === "accounting_cash" ? "active" : ""}`}
                  title="Cash"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="12" x="2" y="6" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab("accounting")}
                  className={`sidebar-submenu-btn ${activeTab === "accounting" ? "active" : ""}`}
                  title="Accounting Hub"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  </svg>
                  <span>Accounting Hub</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cloud & Infrastructure Usage */}
        {canAccessTab("cloud_usage") && (
          <button
            type="button"
            onClick={() => onSelectTab("cloud_usage")}
            className={`sidebar-menu-btn ${activeTab === "cloud_usage" ? "active" : ""}`}
          >
            <div className="sidebar-menu-left">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
              <span>Cloud & Usage</span>
            </div>
          </button>
        )}

        {/* Web Traffic & Visitors (Google Analytics 4 Live) */}
        {canAccessTab("web_traffic") && (
          <button
            type="button"
            onClick={() => onSelectTab("web_traffic")}
            className={`sidebar-menu-btn ${activeTab === "web_traffic" ? "active" : ""}`}
          >
            <div className="sidebar-menu-left">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Web Traffic</span>
            </div>
          </button>
        )}
      </nav>

          {/* Centered abc logo at bottom of expanded sidebar */}
          <div className="sidebar-bottom-logo">
            <Link
              href={isMaster ? "/?tab=overview" : "/"}
              onClick={(e) => {
                e.preventDefault();
                if (isMaster) {
                  onSelectTab("overview");
                } else if (canAccessTab("enquiries")) {
                  onSelectTab("enquiries");
                } else if (canAccessTab("clients")) {
                  onSelectTab("clients");
                } else if (canAccessTab("accounting")) {
                  onSelectTab("accounting");
                } else {
                  onSelectTab(activeTab);
                }
              }}
              className="sidebar-logo-link"
              aria-label="ABC Typing Admin Homepage"
            >
              <span className="sidebar-logo-text">abc</span>
              <span className="sidebar-logo-dot" aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <>
          <nav className="sidebar-nav">
            <button
              type="button"
              onClick={() => onSelectTab("web_traffic")}
              className={`sidebar-menu-btn ${activeTab === "web_traffic" ? "active" : ""}`}
            >
              <div className="sidebar-menu-left">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span>Web Traffic</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("cloud_usage")}
              className={`sidebar-menu-btn ${activeTab === "cloud_usage" ? "active" : ""}`}
            >
              <div className="sidebar-menu-left">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
                <span>Cloud & Usage</span>
              </div>
            </button>
          </nav>
          <div className="sidebar-bottom-logo">
            <Link
              href="/?tab=web_traffic"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab("web_traffic");
              }}
              className="sidebar-logo-link"
              aria-label="ABC Neon Admin"
            >
              <span className="sidebar-logo-text">abc neon</span>
              <span className="sidebar-logo-dot" aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </aside>
  );
}

