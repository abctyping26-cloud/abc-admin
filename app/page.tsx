"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "./components/DashboardHeader";
import DashboardSidebar, { type SidebarTab } from "./components/DashboardSidebar";
import DashboardContent from "./components/DashboardContent";
import { useInactivityTimeout } from "./hooks/useInactivityTimeout";

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
  "clients",
  "worker_admins",
  "enquiries",
  "whatsapp_enquiries",
];

function isValidTab(tab: unknown): tab is SidebarTab {
  return typeof tab === "string" && VALID_TABS.includes(tab as SidebarTab);
}

function resolveInitialTab(): SidebarTab {
  if (typeof window === "undefined") return "overview";

  try {
    let isWorkerAdmin = false;
    const userStr = localStorage.getItem("abc_admin_user");
    if (userStr) {
      const u = JSON.parse(userStr);
      const isMasterAdmin =
        u?.role === "master_admin" ||
        u?.role === "superadmin" ||
        u?.identifier === "masteradmin@abc.com";
      isWorkerAdmin = !isMasterAdmin;
    }

    // 1. Check URL query param (?tab=...)
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (isValidTab(tabParam)) {
      if (tabParam === "worker_admins" && isWorkerAdmin) {
        return "enquiries";
      }
      return tabParam;
    }

    // 2. Check localStorage
    const savedTab = localStorage.getItem("abc_admin_active_tab");
    if (isValidTab(savedTab)) {
      if (savedTab === "worker_admins" && isWorkerAdmin) {
        return "enquiries";
      }
      return savedTab;
    }

    // 3. Defaults based on role
    return isWorkerAdmin ? "enquiries" : "overview";
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [pendingEnquiriesCount, setPendingEnquiriesCount] = useState<number>(0);
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState<number>(0);

  // Fetch initial WhatsApp pending count
  useEffect(() => {
    const fetchWaCount = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/api/v1/whatsapp/conversations`);
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
      const targetTab = !isMaster && tab === "worker_admins" ? "enquiries" : tab;
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
    [isMaster]
  );

  // Guard against worker admin landing on master-only worker_admins tab
  useEffect(() => {
    if (!user) return;
    if (!isMaster && activeTab === "worker_admins") {
      handleTabChange("enquiries");
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
      if (isValidTab(tabParam)) {
        const targetTab = !isMaster && tabParam === "worker_admins" ? "enquiries" : tabParam;
        setActiveTab(targetTab);
        try {
          localStorage.setItem("abc_admin_active_tab", targetTab);
        } catch {}
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMaster]);

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

  return (
    <div className={`dashboard-wrapper ${activeTab === "whatsapp_enquiries" ? "dashboard-wrapper-fixed" : ""}`}>
      <DashboardHeader
        user={user}
        onLogout={handleSignOut}
        onToggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        isSidebarExpanded={isSidebarExpanded}
        onSelectTab={handleTabChange}
      />
      <div className={`dashboard-body ${activeTab === "whatsapp_enquiries" ? "dashboard-body-fixed" : ""}`}>
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          isMaster={isMaster}
          pendingEnquiriesCount={pendingEnquiriesCount}
          pendingWhatsAppCount={pendingWhatsAppCount}
          isExpanded={isSidebarExpanded}
          onCollapse={() => setIsSidebarExpanded(false)}
        />
        {isSidebarExpanded && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsSidebarExpanded(false)}
            aria-hidden="true"
          />
        )}
        <DashboardContent
          activeTab={activeTab}
          onNavigateTab={handleTabChange}
          user={user}
          onPendingCountChange={setPendingEnquiriesCount}
          onPendingWhatsAppCountChange={setPendingWhatsAppCount}
        />
      </div>
    </div>
  );
}


