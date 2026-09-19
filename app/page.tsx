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

export default function Home() {
  const router = useRouter();
  const rawUserSnapshot = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const [activeTab, setActiveTab] = useState<SidebarTab>("overview");
  const [pendingEnquiriesCount, setPendingEnquiriesCount] = useState<number>(0);
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState<number>(0);
  const [hasDefaultedWorkerTab, setHasDefaultedWorkerTab] = useState(false);

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

  // Default worker admin to enquiries tab on initial load
  useEffect(() => {
    if (user && !isMaster && !hasDefaultedWorkerTab) {
      Promise.resolve().then(() => {
        setActiveTab("enquiries");
        setHasDefaultedWorkerTab(true);
      });
    }
  }, [user, isMaster, hasDefaultedWorkerTab]);

  const handleSignOut = () => {
    localStorage.removeItem("abc_admin_token");
    localStorage.removeItem("abc_admin_user");
    localStorage.removeItem("abc_worker_last_activity");
    sessionStorage.removeItem("abc_admin_auth_toast");
    router.replace("/login");
  };

  const handleInactivityLogout = React.useCallback(() => {
    localStorage.removeItem("abc_admin_token");
    localStorage.removeItem("abc_admin_user");
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
      <DashboardHeader user={user} onLogout={handleSignOut} />
      <div className={`dashboard-body ${activeTab === "whatsapp_enquiries" ? "dashboard-body-fixed" : ""}`}>
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isMaster={isMaster}
          pendingEnquiriesCount={pendingEnquiriesCount}
          pendingWhatsAppCount={pendingWhatsAppCount}
        />
        <DashboardContent
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          user={user}
          onPendingCountChange={setPendingEnquiriesCount}
          onPendingWhatsAppCountChange={setPendingWhatsAppCount}
        />
      </div>
    </div>
  );

}


