"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardHeader from "./components/DashboardHeader";
import DashboardSidebar, { type SidebarTab } from "./components/DashboardSidebar";
import DashboardContent from "./components/DashboardContent";

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

  useEffect(() => {
    if (rawUserSnapshot === "unauthenticated") {
      router.replace("/login");
    }
  }, [rawUserSnapshot, router]);

  const handleSignOut = () => {
    localStorage.removeItem("abc_admin_token");
    localStorage.removeItem("abc_admin_user");
    sessionStorage.removeItem("abc_admin_auth_toast");
    router.replace("/login");
  };

  if (!rawUserSnapshot || rawUserSnapshot === "unauthenticated") {
    return <main style={{ minHeight: "100vh", backgroundColor: "#ffffff" }} />;
  }

  let user = null;
  try {
    user = JSON.parse(rawUserSnapshot);
  } catch {
    // Fallback if parsing fails
  }

  const isMaster =
    user?.role === "master_admin" ||
    user?.role === "superadmin" ||
    user?.identifier === "masteradmin@abc.com";

  return (
    <div className="dashboard-wrapper">
      <DashboardHeader user={user} onLogout={handleSignOut} />
      <div className="dashboard-body">
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isMaster={isMaster}
          pendingEnquiriesCount={pendingEnquiriesCount}
        />
        <DashboardContent
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          user={user}
          onPendingCountChange={setPendingEnquiriesCount}
        />
      </div>
    </div>
  );

}


