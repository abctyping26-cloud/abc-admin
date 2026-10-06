"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "./components/DashboardHeader";
import DashboardSidebar, { type SidebarTab, type AdminProject } from "./components/DashboardSidebar";
import DashboardContent from "./components/DashboardContent";
import { useInactivityTimeout } from "./hooks/useInactivityTimeout";
import { API_BASE_URL } from "./config/api";

function resolveInitialProject(): AdminProject {
  if (typeof window === "undefined") return "abc_typing";
  try {
    const params = new URLSearchParams(window.location.search);
    const projParam = params.get("project");
    if (projParam === "abc_neon" || projParam === "abc_typing") {
      return projParam;
    }
    const saved = localStorage.getItem("abc_admin_project");
    if (saved === "abc_neon" || saved === "abc_typing") {
      return saved;
    }
  } catch {
    // fallback
  }
  return "abc_typing";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("abc_user_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("abc_user_updated", callback);
  };
}

function getSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("abc_admin_token");
  const user = localStorage.getItem("abc_admin_user");
  if (!token || !user) return "unauthenticated";
  return user;
}

function getServerSnapshot(): string | null {
  return null;
}

const VALID_TABS: SidebarTab[] = [
  "overview",
  "notes",
  "clients",
  "website_edit",
  "services",
  "worker_admins",
  "enquiries",
  "whatsapp_enquiries",
  "accounting",
  "accounting_suppliers",
  "accounting_incomes",
  "accounting_expenses",
  "accounting_invoices",
  "accounting_banks",
  "cloud_usage",
  "web_traffic",
];

function isValidTab(tab: unknown): tab is SidebarTab {
  return typeof tab === "string" && VALID_TABS.includes(tab as SidebarTab);
}

function isTabAllowedForUser(tab: SidebarTab, user: any, isMaster: boolean): boolean {
  if (tab === "notes") return true;
  if (isMaster) return true;
  if (tab === "worker_admins") return false;
  const roles: string[] = user?.assignedRoles;
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
}

function getFirstAllowedTab(user: any, isMaster: boolean): SidebarTab {
  if (isMaster) return "overview";
  const roles: string[] = user?.assignedRoles || [];
  if (roles.length === 0) {
    return "enquiries";
  }
  if (roles.includes("accounting")) return "accounting";
  if (roles.includes("clients")) return "clients";
  if (roles.includes("enquiries")) return "enquiries";
  if (roles.includes("whatsapp_enquiries")) return "whatsapp_enquiries";
  if (roles.includes("website_edit")) return "website_edit";
  if (roles.includes("analytics") || roles.includes("cloud_usage")) return "cloud_usage";
  if (roles.includes("web_traffic")) return "web_traffic";
  if (roles.includes("overview")) return "overview";
  return "enquiries";
}

function resolveInitialTab(): SidebarTab {
  if (typeof window === "undefined") return "overview";

  try {
    let isMasterAdmin = true;
    let u: any = null;
    const userStr = localStorage.getItem("abc_admin_user");
    if (userStr) {
      u = JSON.parse(userStr);
      isMasterAdmin =
        u?.role === "master_admin" ||
        u?.role === "superadmin" ||
        u?.identifier === "masteradmin@abc.com";
    }

    // 1. Check URL query param (?tab=...)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "services") {
      if (isTabAllowedForUser("website_edit", u, isMasterAdmin)) {
        return "website_edit";
      }
    }
    if (isValidTab(tabParam) && isTabAllowedForUser(tabParam, u, isMasterAdmin)) {
      return tabParam;
    }

    // 2. Check localStorage
    const savedTab = localStorage.getItem("abc_admin_active_tab");
    if (isValidTab(savedTab) && isTabAllowedForUser(savedTab, u, isMasterAdmin)) {
      return savedTab;
    }

    // 3. Defaults based on allowed roles
    return getFirstAllowedTab(u, isMasterAdmin);
  } catch {
    return "overview";
  }
}

export default function Home() {
  const router = useRouter();
  const rawUserSnapshot = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const [activeTab, setActiveTab] = useState<SidebarTab>(() => resolveInitialTab());
  const [selectedProject, setSelectedProject] = useState<AdminProject>(() => resolveInitialProject());
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [pendingEnquiriesCount, setPendingEnquiriesCount] = useState<number>(0);
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState<number>(0);

  // Fetch initial WhatsApp pending count
  useEffect(() => {
    const fetchWaCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/conversations`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.counts) {
            setPendingWhatsAppCount(json.counts.pending || 0);
          }
        }
      } catch {
        // Ignore network failure
      }
    };
    fetchWaCount();
  }, []);

  let user = null;
  try {
    user =
      rawUserSnapshot && rawUserSnapshot !== "unauthenticated"
        ? JSON.parse(rawUserSnapshot)
        : null;
  } catch {
    // Fallback if parsing fails
  }

  const isMaster =
    user?.role === "master_admin" ||
    user?.role === "superadmin" ||
    user?.identifier === "masteradmin@abc.com";

  useEffect(() => {
    if (rawUserSnapshot === "unauthenticated") {
      router.replace("/login");
    }
  }, [rawUserSnapshot, router]);

  const handleTabChange = React.useCallback(
    (tab: SidebarTab) => {
      let targetTab = tab;
      if (!isMaster && !isTabAllowedForUser(tab, user, false)) {
        targetTab = getFirstAllowedTab(user, false);
      }
      setActiveTab(targetTab);
      setIsSidebarExpanded(false);

      try {
        localStorage.setItem("abc_admin_active_tab", targetTab);
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", targetTab);
          window.history.replaceState(null, "", url.toString());
        }
      } catch {
        // Ignore storage/history errors
      }
    },
    [isMaster, user]
  );

  const handleProjectChange = React.useCallback((project: AdminProject) => {
    setSelectedProject(project);
    setIsSidebarExpanded(false);

    try {
      localStorage.setItem("abc_admin_project", project);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("project", project);
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      // Ignore storage/history errors
    }
  }, []);

  // Guard against worker admin landing on unauthorized tab
  useEffect(() => {
    if (!user) return;
    if (!isTabAllowedForUser(activeTab, user, isMaster)) {
      const fallback = getFirstAllowedTab(user, isMaster);
      queueMicrotask(() => handleTabChange(fallback));
    }
  }, [user, isMaster, activeTab, handleTabChange]);

  // Synchronize URL and storage with current activeTab
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== activeTab) {
        url.searchParams.set("tab", activeTab);
        window.history.replaceState(null, "", url.toString());
      }
      localStorage.setItem("abc_admin_active_tab", activeTab);
    } catch {
      // Ignore
    }
  }, [user, activeTab]);

  // Sync state if user navigates with browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const projectParam = params.get("project");
      if (projectParam === "abc_neon" || projectParam === "abc_typing") {
        setSelectedProject(projectParam);
      }
      if (isValidTab(tabParam)) {
        const targetTab = !isMaster && !isTabAllowedForUser(tabParam, user, false)
          ? getFirstAllowedTab(user, false)
          : tabParam;
        setActiveTab(targetTab);
        try {
          localStorage.setItem("abc_admin_active_tab", targetTab);
        } catch {}
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMaster, user]);

  const handleSignOut = () => {
    localStorage.removeItem("abc_admin_token");
    localStorage.removeItem("abc_admin_user");
    localStorage.removeItem("abc_admin_active_tab");
    localStorage.removeItem("abc_worker_last_activity");
    sessionStorage.removeItem("abc_admin_auth_toast");
    router.replace("/login");
  };

  const handleInactivityLogout = React.useCallback(() => {
    localStorage.removeItem("abc_admin_token");
    localStorage.removeItem("abc_admin_user");
    localStorage.removeItem("abc_admin_active_tab");
    localStorage.removeItem("abc_worker_last_activity");
    sessionStorage.setItem(
      "abc_admin_auth_toast",
      JSON.stringify({
        title: "Session Expired",
        message: "You have been logged out due to 15 minutes of inactivity.",
        role: "Worker Admin",
      })
    );
    router.replace("/login");
  }, [router]);

  useInactivityTimeout({
    enabled: Boolean(user && !isMaster),
    timeoutMs: 15 * 60 * 1000, // 15 minutes
    onTimeout: handleInactivityLogout,
  });

  if (!rawUserSnapshot || rawUserSnapshot === "unauthenticated") {
    return <main style={{ minHeight: "100vh", backgroundColor: "#ffffff" }} />;
  }

  const isNotesTab = activeTab === "notes";

  return (
    <div
      className={`dashboard-wrapper ${
        activeTab === "whatsapp_enquiries" && selectedProject === "abc_typing"
          ? "dashboard-wrapper-fixed"
          : ""
      }`}
    >
      <DashboardHeader
        user={user}
        onLogout={handleSignOut}
        onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        isSidebarExpanded={isSidebarExpanded}
        isShrunk={isNotesTab}
        onSelectTab={handleTabChange}
      />
      <div
        className={`dashboard-body ${
          activeTab === "whatsapp_enquiries" && selectedProject === "abc_typing"
            ? "dashboard-body-fixed"
            : ""
        } ${isNotesTab ? "dashboard-body-notes" : ""}`}
      >
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          selectedProject={selectedProject}
          onSelectProject={handleProjectChange}
          isMaster={isMaster}
          user={user}
          pendingEnquiriesCount={pendingEnquiriesCount}
          pendingWhatsAppCount={pendingWhatsAppCount}
          isExpanded={isSidebarExpanded}
          isShrunk={isNotesTab}
          onCollapse={() => setIsSidebarExpanded(false)}
        />
        {isSidebarExpanded && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsSidebarExpanded(false)}
            aria-hidden="true"
          />
        )}
        {selectedProject === "abc_typing" || activeTab === "web_traffic" || activeTab === "cloud_usage" || activeTab === "notes" ? (
          <DashboardContent
            activeTab={activeTab}
            onNavigateTab={handleTabChange}
            selectedProject={selectedProject}
            user={user}
            onPendingCountChange={setPendingEnquiriesCount}
            onPendingWhatsAppCountChange={setPendingWhatsAppCount}
          />
        ) : (
          <main
            className="dashboard-main dashboard-content-empty"
            aria-label="ABC Neon Settings Empty View"
          />
        )}
      </div>
    </div>
  );
}


