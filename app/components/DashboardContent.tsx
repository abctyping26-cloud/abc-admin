"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { SidebarTab } from "./DashboardSidebar";
import DatabaseLoadingOverlay from "./DatabaseLoadingOverlay";
import ClientsManager from "./ClientsManager";
import WhatsAppEnquiriesManager from "./WhatsAppEnquiriesManager";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface WorkerAdminUser {
  id: string;
  identifier: string;
  password?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  location?: string;
  deviceInfo?: string;
  role?: "worker_admin" | "admin";
  profileCompleted: boolean;
  isFirstLogin?: boolean;
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
  status: "active" | "inactive";
}

export interface EnquiryItem {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  service: string;
  otherService?: string;
  status: "pending" | "responded";
  submittedAt: string;
  respondedBy?: string;
  respondedByRole?: string;
  respondedAt?: string;
  notes?: string;
  createdAt?: string;
}

interface DashboardContentProps {
  activeTab: SidebarTab;
  onNavigateTab?: (tab: SidebarTab) => void;
  user: {
    id?: string;
    identifier?: string;
    role?: string;
    name?: string;
    phone?: string;
    phoneNumber?: string;
    location?: string;
    deviceInfo?: string;
    profileCompleted?: boolean;
    isFirstLogin?: boolean;
  } | null;
  onPendingCountChange?: (count: number) => void;
  onPendingWhatsAppCountChange?: (count: number) => void;
}

function formatEnquiryDateTime(dateStr?: string): { formatted: string; relative: string } {
  if (!dateStr) return { formatted: "—", relative: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { formatted: dateStr, relative: "" };

  const formatted =
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  let relative = "";
  if (diffSec < 45) relative = "Just now";
  else if (diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffHour < 24) relative = `${diffHour}h ago`;
  else if (diffDays === 1) relative = "Yesterday";
  else if (diffDays < 7) relative = `${diffDays}d ago`;

  return { formatted, relative };
}

interface ClientSummaryItem {
  id: string;
  completed?: boolean;
}

function ClientRingChart({
  completed,
  inProgress,
  size = 104,
  strokeWidth = 11,
}: {
  completed: number;
  inProgress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const total = completed + inProgress;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const inProgressRatio = total > 0 ? inProgress / total : 0;
  const completedRatio = total > 0 ? completed / total : 0;

  const inProgressDash = inProgressRatio * circumference;
  const completedDash = completedRatio * circumference;

  // Rotation angles starting at 12 o'clock (-90 degrees)
  const inProgressAngle = inProgressRatio * 360;

  return (
    <div
      className="client-ring-chart-wrapper"
      style={{ width: size, height: size }}
      title={`Clients: ${inProgress} In Progress (${Math.round(inProgressRatio * 100 || 0)}%), ${completed} Completed (${Math.round(completedRatio * 100 || 0)}%)`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="client-ring-chart-svg"
      >
        {/* Subtle background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />

        {total > 0 ? (
          <>
            {/* In Progress segment (Orange) */}
            {inProgress > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#ea580c"
                strokeWidth={strokeWidth}
                strokeDasharray={`${inProgressDash} ${circumference}`}
                strokeDashoffset={0}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            )}

            {/* Completed segment (Green) */}
            {completed > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#16a34a"
                strokeWidth={strokeWidth}
                strokeDasharray={`${completedDash} ${circumference}`}
                strokeDashoffset={0}
                transform={`rotate(${-90 + inProgressAngle} ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
              />
            )}
          </>
        ) : (
          /* Empty state subtle dashed circle */
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth={strokeWidth}
            strokeDasharray="4 4"
          />
        )}
      </svg>

      {/* Hollow center text */}
      <div className="client-ring-chart-center">
        <span className="client-ring-chart-number">{total}</span>
        <span className="client-ring-chart-sub">Total</span>
      </div>
    </div>
  );
}

export default function DashboardContent({
  activeTab,
  onNavigateTab,
  user,
  onPendingCountChange,
  onPendingWhatsAppCountChange,
}: DashboardContentProps) {
  const isMaster =
    user?.role === "master_admin" ||
    user?.role === "superadmin" ||
    user?.identifier === "masteradmin@abc.com";

  // Real MongoDB Worker Admins state
  const [workerAdmins, setWorkerAdmins] = useState<WorkerAdminUser[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(
    isMaster && activeTab === "worker_admins"
  );
  const [createError, setCreateError] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Client counts state for overview
  const [clientsCount, setClientsCount] = useState<number>(0);
  const [inProgressClientsCount, setInProgressClientsCount] = useState<number>(0);
  const [completedClientsCount, setCompletedClientsCount] = useState<number>(0);
  const [waOverviewCounts, setWaOverviewCounts] = useState<{
    total: number;
    pending: number;
    responded: number;
  }>({
    total: 0,
    pending: 0,
    responded: 0,
  });

  // Fetch WhatsApp overview counts
  useEffect(() => {
    const fetchWa = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/conversations`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.counts) {
            setWaOverviewCounts({
              total: json.counts.total || 0,
              pending: json.counts.pending || 0,
              responded: json.counts.responded || 0,
            });
            onPendingWhatsAppCountChange?.(json.counts.pending || 0);
          }
        }
      } catch {
        // Ignore
      }
    };
    fetchWa();
  }, [onPendingWhatsAppCountChange]);

  const getAdminAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("abc_admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    if (user?.id) {
      headers["x-admin-id"] = user.id;
      headers["x-admin-role"] = user.role || "worker_admin";
      headers["x-admin-identifier"] = user.identifier || "";
    }
    return headers;
  }, [user]);

  const refreshClientsMetrics = useCallback(() => {
    fetch(`${API_BASE_URL}/api/v1/admin/clients`, { headers: getAdminAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: ClientSummaryItem[] = data?.data?.clients || [];
        setClientsCount(list.length);
        setInProgressClientsCount(list.filter((c) => !c.completed).length);
        setCompletedClientsCount(list.filter((c) => c.completed).length);
      })
      .catch(() => {});
  }, [getAdminAuthHeaders]);

  useEffect(() => {
    refreshClientsMetrics();
    window.addEventListener("abc_client_updated", refreshClientsMetrics);
    return () => {
      window.removeEventListener("abc_client_updated", refreshClientsMetrics);
    };
  }, [refreshClientsMetrics]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  // Mobile accordion card expansion tracking for Worker Admins (shrunken by default)
  const [expandedWorkerAdminIds, setExpandedWorkerAdminIds] = useState<Set<string>>(new Set());

  const toggleWorkerAdminExpand = (adminId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedWorkerAdminIds((prev) => {
      const next = new Set(prev);
      if (next.has(adminId)) {
        next.delete(adminId);
      } else {
        next.add(adminId);
      }
      return next;
    });
  };

  // First-time setup state for logged-in Worker Admin
  const isWorkerProfilePending =
    !isMaster &&
    (!user?.profileCompleted ||
      !user?.name ||
      !(user?.phone || user?.phoneNumber));
  const [workerProfileName, setWorkerProfileName] = useState(user?.name || "");
  const [workerProfilePhone, setWorkerProfilePhone] = useState(
    user?.phone || user?.phoneNumber || ""
  );
  const [profileError, setProfileError] = useState("");

  const refreshWorkerAdmins = useCallback(async () => {
    setIsLoadingWorkers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/workers`);
      if (res.ok) {
        const data = await res.json();
        setWorkerAdmins(data.data?.workers || []);
      }
    } catch (err) {
      console.error("Failed to load worker admins from database:", err);
    } finally {
      setIsLoadingWorkers(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === "worker_admins" && isMaster) {
      Promise.resolve().then(() => {
        if (isMounted) setIsLoadingWorkers(true);
      });
      fetch(`${API_BASE_URL}/api/v1/admin/workers`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.data?.workers) {
            setWorkerAdmins(data.data.workers);
          }
        })
        .catch((err) => {
          console.error("Failed to load worker admins from database:", err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingWorkers(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab, isMaster]);

  // =========================================================================
  // ENQUIRIES STATE & SYNCHRONIZATION
  // =========================================================================
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("abc_enquiries");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [enquiryFilter, setEnquiryFilter] = useState<"all" | "pending" | "responded">("all");
  const [enquirySearch, setEnquirySearch] = useState<string>("");
  const [isEnquiriesLoading, setIsEnquiriesLoading] = useState(true);
  const [updatingEnquiryId, setUpdatingEnquiryId] = useState<string | null>(null);

  // Mobile accordion card expansion tracking for Client Enquiries (shrunken by default)
  const [expandedEnquiryIds, setExpandedEnquiryIds] = useState<Set<string>>(new Set());

  const toggleEnquiryExpand = (enquiryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedEnquiryIds((prev) => {
      const next = new Set(prev);
      if (next.has(enquiryId)) {
        next.delete(enquiryId);
      } else {
        next.add(enquiryId);
      }
      return next;
    });
  };

  // Email Reply Modal State
  const [replyModalEnquiry, setReplyModalEnquiry] = useState<EnquiryItem | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null);

  const handleOpenReplyModal = (enquiry: EnquiryItem) => {
    setReplyModalEnquiry(enquiry);
    setReplySubject(`Re: Your Enquiry for ${enquiry.service} - ABC Typing`);
    setReplyMessage(
      `Dear ${enquiry.name},\n\nThank you for reaching out to ABC Typing regarding ${enquiry.service}.\n\n\n\nBest regards,\n${
        user?.name || (isMaster ? "Master Admin" : "Worker Admin")
      }\nABC Typing Team`
    );
    setReplyError(null);
    setReplySuccessMessage(null);
  };

  const handleSendEmailReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyModalEnquiry || !replyMessage.trim()) return;

    setIsSendingReply(true);
    setReplyError(null);

    const senderName =
      user?.name?.trim() ||
      user?.identifier?.split("@")[0] ||
      (isMaster ? "Master Admin" : "Worker Admin");

    const roleTitle = isMaster ? "master_admin" : (user?.role || "worker_admin");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/enquiries/${replyModalEnquiry._id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: replySubject,
            message: replyMessage,
            senderName: `${senderName} (${isMaster ? "Master Admin" : "Worker Admin"})`,
            responderRole: roleTitle,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to deliver email reply");
      }

      // Optimistic update of local list
      setEnquiries((prev) =>
        prev.map((item) =>
          item._id === replyModalEnquiry._id
            ? {
                ...item,
                status: "responded",
                respondedBy: `${senderName} (${isMaster ? "Master Admin" : "Worker Admin"})`,
                respondedByRole: roleTitle,
                respondedAt: new Date().toISOString(),
              }
            : item
        )
      );

      setReplySuccessMessage(
        `Reply successfully delivered to ${replyModalEnquiry.email || "customer"}!`
      );
      setTimeout(() => {
        setReplyModalEnquiry(null);
        setReplySuccessMessage(null);
      }, 1500);
    } catch (err: unknown) {
      setReplyError(
        err instanceof Error ? err.message : "Failed to send email reply."
      );
    } finally {
      setIsSendingReply(false);
    }
  };

  const refreshEnquiries = useCallback(async () => {
    try {
      setIsEnquiriesLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/enquiries`);
      if (res.ok) {
        const data = await res.json();
        const serverList: EnquiryItem[] = data.data?.enquiries || [];

        // Also merge any local-only entries from localStorage
        const stored = localStorage.getItem("abc_enquiries");
        const localList: EnquiryItem[] = stored ? JSON.parse(stored) : [];

        const serverIds = new Set(serverList.map((e) => String(e._id)));
        const localOnly = localList.filter((e) => !serverIds.has(String(e._id)));

        const combined = [...localOnly, ...serverList];
        setEnquiries(combined);
        try {
          localStorage.setItem("abc_enquiries", JSON.stringify(combined));
        } catch {
          // Ignore
        }
      } else {
        const stored = localStorage.getItem("abc_enquiries");
        if (stored) {
          setEnquiries(JSON.parse(stored));
        }
      }
    } catch {
      // Backend offline: use localStorage
      const stored = localStorage.getItem("abc_enquiries");
      if (stored) {
        setEnquiries(JSON.parse(stored));
      }
    } finally {
      setIsEnquiriesLoading(false);
    }
  }, []);

  // Update sidebar badge when enquiries list changes (for both Master and Worker Admins)
  useEffect(() => {
    const pendingCount = enquiries.filter((e) => e.status !== "responded").length;
    onPendingCountChange?.(pendingCount);
  }, [enquiries, onPendingCountChange]);

  // Sync on mount and tab switch, and subscribe to real-time events
  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) setIsEnquiriesLoading(true);
    });

    fetch(`${API_BASE_URL}/api/v1/admin/enquiries`)
      .then(async (res) => {
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          const serverList: EnquiryItem[] = data.data?.enquiries || [];
          const stored = localStorage.getItem("abc_enquiries");
          const localList: EnquiryItem[] = stored ? JSON.parse(stored) : [];
          const serverIds = new Set(serverList.map((e) => String(e._id)));
          const localOnly = localList.filter((e) => !serverIds.has(String(e._id)));
          const combined = [...localOnly, ...serverList];
          if (isMounted) {
            setEnquiries(combined);
          }
          try {
            localStorage.setItem("abc_enquiries", JSON.stringify(combined));
          } catch {
            // Ignore
          }
        }
      })
      .catch(() => {
        const stored = localStorage.getItem("abc_enquiries");
        if (stored && isMounted) {
          try {
            setEnquiries(JSON.parse(stored));
          } catch {
            // Ignore
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsEnquiriesLoading(false);
      });

    const handleSync = () => {
      try {
        const stored = localStorage.getItem("abc_enquiries");
        if (stored) {
          setEnquiries(JSON.parse(stored));
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("abc_enquiries_updated", handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("abc_enquiries_updated", handleSync);
    };
  }, [activeTab, isMaster]);

  const handleToggleEnquiryResponded = async (enquiry: EnquiryItem) => {
    const isCurrentlyResponded = enquiry.status === "responded";
    const targetStatus = isCurrentlyResponded ? "pending" : "responded";

    const adminName =
      user?.name?.trim() ||
      user?.identifier?.split("@")[0] ||
      (isMaster ? "Master Admin" : "Worker Admin");

    const roleTitle = isMaster
      ? "Master Admin"
      : (user?.role === "worker_admin" ? "Worker Admin" : "Admin");

    const fullResponderLabel = `${adminName} (${roleTitle})`;
    const nowIso = new Date().toISOString();

    setUpdatingEnquiryId(enquiry._id);

    // Optimistic UI update
    const updated = enquiries.map((item) => {
      if (item._id === enquiry._id) {
        return {
          ...item,
          status: targetStatus as "pending" | "responded",
          respondedBy: targetStatus === "responded" ? fullResponderLabel : undefined,
          respondedByRole: targetStatus === "responded" ? (isMaster ? "master_admin" : "worker_admin") : undefined,
          respondedAt: targetStatus === "responded" ? nowIso : undefined,
        };
      }
      return item;
    });

    setEnquiries(updated);
    try {
      localStorage.setItem("abc_enquiries", JSON.stringify(updated));
      window.dispatchEvent(new Event("abc_enquiries_updated"));
    } catch {
      // Ignore
    }

    // Send update to Express server
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/enquiries/${enquiry._id}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: targetStatus,
          respondedBy: fullResponderLabel,
          respondedByRole: isMaster ? "master_admin" : "worker_admin",
        }),
      });
    } catch (apiErr) {
      console.warn("Backend respond patch error, persisted locally:", apiErr);
    } finally {
      setUpdatingEnquiryId(null);
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (!confirm("Are you sure you want to remove this enquiry?")) return;

    const filtered = enquiries.filter((item) => item._id !== id);
    setEnquiries(filtered);
    try {
      localStorage.setItem("abc_enquiries", JSON.stringify(filtered));
      window.dispatchEvent(new Event("abc_enquiries_updated"));
    } catch {
      // Ignore
    }

    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/enquiries/${id}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore
    }
  };

  // Enquiries counts and filtering
  const totalCount = enquiries.length;
  const pendingCount = enquiries.filter((e) => e.status !== "responded").length;
  const respondedCount = enquiries.filter((e) => e.status === "responded").length;

  const filteredEnquiries = enquiries.filter((item) => {
    if (enquiryFilter === "pending" && item.status === "responded") return false;
    if (enquiryFilter === "responded" && item.status !== "responded") return false;

    if (enquirySearch.trim()) {
      const q = enquirySearch.toLowerCase().trim();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchPhone = item.phone?.toLowerCase().includes(q);
      const matchService = item.service?.toLowerCase().includes(q);
      const matchResponder = item.respondedBy?.toLowerCase().includes(q);
      return Boolean(matchName || matchPhone || matchService || matchResponder);
    }
    return true;
  });

  // =========================================================================
  // WORKER ADMINS HANDLERS
  // =========================================================================
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(workerAdmins.map((admin) => admin.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };



  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminPassword) return;

    setIsCreatingAdmin(true);
    setCreateError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/workers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to create worker admin in database.");
      }

      await refreshWorkerAdmins();
      setNewAdminEmail("");
      setNewAdminPassword("");
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create worker admin.");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerProfileName.trim() || !workerProfilePhone.trim()) {
      setProfileError("Both Full Name and Phone Number are required.");
      return;
    }

    try {
      const adminId = user?.id;
      if (!adminId) {
        throw new Error("User session ID missing.");
      }

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/workers/${adminId}/profile`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: workerProfileName.trim(),
            phone: workerProfilePhone.trim(),
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile in database.");
      }

      // Update session in localStorage under abc_admin_user
      const rawUser = localStorage.getItem("abc_admin_user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        parsed.name = workerProfileName.trim();
        parsed.phone = workerProfilePhone.trim();
        parsed.phoneNumber = workerProfilePhone.trim();
        parsed.profileCompleted = true;
        parsed.isFirstLogin = false;
        localStorage.setItem("abc_admin_user", JSON.stringify(parsed));
      }

      window.dispatchEvent(new Event("abc_user_updated"));
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile.");
    }
  };

  const isCurrentTabLoading =
    (activeTab === "worker_admins" && isMaster && isLoadingWorkers) ||
    (activeTab === "enquiries" && isEnquiriesLoading) ||
    (activeTab === "overview" && isMaster && isEnquiriesLoading);

  return (
    <main className={`dashboard-main ${activeTab === "whatsapp_enquiries" ? "dashboard-main-whatsapp" : ""}`}>
      {/* Real-time Database Loading Overlay */}
      {isCurrentTabLoading && <DatabaseLoadingOverlay text="Syncing..." />}

      {/* -------------------------------------------------------------
          TAB: OVERVIEW
          ------------------------------------------------------------- */}
      {activeTab === "overview" && (
        isMaster ? (
          <>
            <h1 className="content-title">Master Admin Workspace</h1>
            <p className="content-subtitle" style={{ marginBottom: "24px" }}>
              Welcome back, {user?.name || user?.identifier || "Admin"}. Overview of recent platform activity.
            </p>

            <div className="enquiry-metrics-grid">
              {/* Clients Featured Metric Card */}
              <div
                className="enquiry-metric-card client-overview-big-card"
                onClick={() => onNavigateTab?.("clients")}
                style={{ cursor: "pointer" }}
                title="View all clients"
              >
                <div className="client-big-card-content">
                  <div className="client-big-card-left">
                    <div className="enquiry-metric-header">
                      <span className="enquiry-metric-label">Total Clients</span>
                      <span className="client-big-card-tag">Overview</span>
                    </div>
                    <div className="client-big-metric-value">{clientsCount}</div>
                    <div className="client-big-card-breakdown">
                      <div className="client-breakdown-row orange-pill">
                        <span className="legend-dot orange" />
                        <span className="breakdown-label">In Progress:</span>
                        <span className="breakdown-num orange">{inProgressClientsCount}</span>
                      </div>
                      <div className="client-breakdown-row green-pill">
                        <span className="legend-dot green" />
                        <span className="breakdown-label">Completed:</span>
                        <span className="breakdown-num green">{completedClientsCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="client-big-card-right">
                    <ClientRingChart
                      completed={completedClientsCount}
                      inProgress={inProgressClientsCount}
                      size={104}
                      strokeWidth={11}
                    />
                  </div>
                </div>
              </div>

              {/* Active Worker Admins Card */}
              <div
                className="enquiry-metric-card"
                onClick={() => onNavigateTab?.("worker_admins")}
                style={{ cursor: "pointer" }}
                title="View worker admins"
              >
                <div className="enquiry-metric-header">
                  <span className="enquiry-metric-label">Active Worker Admins</span>
                  <span className="enquiry-metric-dot all" />
                </div>
                <span className="enquiry-metric-value">{workerAdmins.length}</span>
                <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                  Team accounts
                </span>
              </div>

              {/* Total Enquiries Card */}
              <div
                className="enquiry-metric-card"
                onClick={() => onNavigateTab?.("enquiries")}
                style={{ cursor: "pointer" }}
                title="View enquiries"
              >
                <div className="enquiry-metric-header">
                  <span className="enquiry-metric-label">Total Enquiries</span>
                  <span className="enquiry-metric-dot all" />
                </div>
                <span className="enquiry-metric-value">{totalCount}</span>
                <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                  Website enquiries
                </span>
              </div>

              {/* Pending Response Card */}
              <div
                className="enquiry-metric-card"
                onClick={() => onNavigateTab?.("enquiries")}
                style={{ cursor: "pointer" }}
                title="View pending enquiries"
              >
                <div className="enquiry-metric-header">
                  <span className="enquiry-metric-label">Pending Response</span>
                  <span className="enquiry-metric-dot pending" />
                </div>
                <span className="enquiry-metric-value">{pendingCount}</span>
                <span style={{ fontSize: "0.74rem", color: "#d97706", marginTop: "2px" }}>
                  Needs action
                </span>
              </div>

              {/* WhatsApp Enquiries Card */}
              <div
                className="enquiry-metric-card"
                onClick={() => onNavigateTab?.("whatsapp_enquiries")}
                style={{ cursor: "pointer" }}
                title="View WhatsApp live enquiries"
              >
                <div className="enquiry-metric-header">
                  <span className="enquiry-metric-label">WhatsApp Enquiries</span>
                  <span className="enquiry-metric-dot" style={{ backgroundColor: "#16a34a" }} />
                </div>
                <span className="enquiry-metric-value">{waOverviewCounts.pending}</span>
                <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                  Responded: {waOverviewCounts.responded}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="content-title">Worker Admin Workspace</h1>
            <p className="content-subtitle" style={{ marginBottom: "24px" }}>
              Welcome back, {user?.name || user?.identifier || "Worker Admin"}. Overview of your assigned clients and platform enquiries.
            </p>

            <div className="enquiry-metrics-grid">
              {/* Clients Featured Metric Card */}
              <div
                className="enquiry-metric-card client-overview-big-card"
                onClick={() => onNavigateTab?.("clients")}
                style={{ cursor: "pointer" }}
                title="View assigned clients"
              >
                <div className="client-big-card-content">
                  <div className="client-big-card-left">
                    <div className="enquiry-metric-header">
                      <span className="enquiry-metric-label">Assigned Clients</span>
                      <span className="client-big-card-tag">Assigned</span>
                    </div>
                    <div className="client-big-metric-value">{clientsCount}</div>
                    <div className="client-big-card-breakdown">
                      <div className="client-breakdown-row orange-pill">
                        <span className="legend-dot orange" />
                        <span className="breakdown-label">In Progress:</span>
                        <span className="breakdown-num orange">{inProgressClientsCount}</span>
                      </div>
                      <div className="client-breakdown-row green-pill">
                        <span className="legend-dot green" />
                        <span className="breakdown-label">Completed:</span>
                        <span className="breakdown-num green">{completedClientsCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="client-big-card-right">
                    <ClientRingChart
                      completed={completedClientsCount}
                      inProgress={inProgressClientsCount}
                      size={104}
                      strokeWidth={11}
                    />
                  </div>
                </div>
              </div>

              {/* Enquiries Card */}
              <div
                className="enquiry-metric-card"
                onClick={() => onNavigateTab?.("enquiries")}
                style={{ cursor: "pointer" }}
                title="View enquiries"
              >
                <div className="enquiry-metric-header">
                  <span className="enquiry-metric-label">Total Enquiries</span>
                  <span className="enquiry-metric-dot all" />
                </div>
                <span className="enquiry-metric-value">{totalCount}</span>
                <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                  Platform leads
                </span>
              </div>

              {/* Pending Enquiries Card */}
              <div
                className="enquiry-metric-card"
                onClick={() => onNavigateTab?.("enquiries")}
                style={{ cursor: "pointer" }}
                title="View pending enquiries"
              >
                <div className="enquiry-metric-header">
                  <span className="enquiry-metric-label">Pending Enquiries</span>
                  <span className="enquiry-metric-dot pending" />
                </div>
                <span className="enquiry-metric-value">{pendingCount}</span>
                <span style={{ fontSize: "0.74rem", color: "#d97706", marginTop: "2px" }}>
                  Awaiting response
                </span>
              </div>

              {/* WhatsApp Enquiries Card */}
              <div
                className="enquiry-metric-card"
                onClick={() => onNavigateTab?.("whatsapp_enquiries")}
                style={{ cursor: "pointer" }}
                title="View WhatsApp live enquiries"
              >
                <div className="enquiry-metric-header">
                  <span className="enquiry-metric-label">WhatsApp Enquiries</span>
                  <span className="enquiry-metric-dot" style={{ backgroundColor: "#16a34a" }} />
                </div>
                <span className="enquiry-metric-value">{waOverviewCounts.pending}</span>
                <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                  Responded: {waOverviewCounts.responded}
                </span>
              </div>
            </div>
          </>
        )
      )}

      {/* -------------------------------------------------------------
          TAB: ENQUIRIES (Accessible to both Master Admin & Worker Admins)
          ------------------------------------------------------------- */}
      {activeTab === "enquiries" && (
        <>
          <div className="content-header-row">
            <div>
              <h1 className="content-title">Client Enquiries</h1>
              <p className="content-subtitle">
                Incoming requests submitted through the client website. Respond to leads and coordinate with the team.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshEnquiries}
              disabled={isEnquiriesLoading}
              className="flat-secondary-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Refresh enquiries"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: "14px", height: "14px" }}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              <span>{isEnquiriesLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>

          {/* Switcher between Website Form Enquiries and WhatsApp Enquiries (Hidden on mobile) */}
          <div
            className="enquiry-source-switcher"
            style={{
              display: "inline-flex",
              backgroundColor: "#f1f5f9",
              borderRadius: "8px",
              padding: "4px",
              marginBottom: "20px",
              gap: "4px",
              border: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              className="enquiry-filter-btn active"
              style={{
                borderRadius: "6px",
                fontSize: "12px",
                padding: "6px 14px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📋 Website Form Enquiries</span>
              <span className="enquiry-filter-counter">{totalCount}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.("whatsapp_enquiries")}
              className="enquiry-filter-btn"
              style={{
                borderRadius: "6px",
                fontSize: "12px",
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>💬 WhatsApp Enquiries</span>
              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>Live</span>
            </button>
          </div>

          {/* Top 3 Summary Metrics Cards (Desktop / Laptop view) */}
          <div className="enquiry-metrics-grid client-enquiries-metrics-grid">
            <div className="enquiry-metric-card">
              <div className="enquiry-metric-header">
                <span className="enquiry-metric-label">Total Inquiries</span>
                <span className="enquiry-metric-dot all" />
              </div>
              <span className="enquiry-metric-value">{totalCount}</span>
            </div>

            <div className="enquiry-metric-card">
              <div className="enquiry-metric-header">
                <span className="enquiry-metric-label">Pending Action</span>
                <span className="enquiry-metric-dot pending" />
              </div>
              <span className="enquiry-metric-value">{pendingCount}</span>
            </div>

            <div className="enquiry-metric-card">
              <div className="enquiry-metric-header">
                <span className="enquiry-metric-label">Responded by Team</span>
                <span className="enquiry-metric-dot responded" />
              </div>
              <span className="enquiry-metric-value">{respondedCount}</span>
            </div>
          </div>

          {/* Mobile Single Box with Row-by-Row Metrics (Mobile view only) */}
          <div className="enquiry-single-summary-box">
            <div className="enquiry-summary-row">
              <div className="enquiry-summary-row-label">
                <span className="enquiry-metric-dot all" />
                <span>Total Inquiries :</span>
              </div>
              <span className="enquiry-summary-row-value">{totalCount}</span>
            </div>

            <div className="enquiry-summary-divider" />

            <div className="enquiry-summary-row">
              <div className="enquiry-summary-row-label">
                <span className="enquiry-metric-dot pending" />
                <span>Pending Action :</span>
              </div>
              <span className="enquiry-summary-row-value">{pendingCount}</span>
            </div>

            <div className="enquiry-summary-divider" />

            <div className="enquiry-summary-row">
              <div className="enquiry-summary-row-label">
                <span className="enquiry-metric-dot responded" />
                <span>Responded by Team :</span>
              </div>
              <span className="enquiry-summary-row-value">{respondedCount}</span>
            </div>
          </div>

          {/* Filters & Search Controls */}
          <div className="enquiry-controls-bar">
            <div className="enquiry-filter-group" role="tablist">
              <button
                type="button"
                onClick={() => setEnquiryFilter("all")}
                className={`enquiry-filter-btn ${enquiryFilter === "all" ? "active" : ""}`}
              >
                <span>All</span>
                <span className="enquiry-filter-counter">{totalCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setEnquiryFilter("pending")}
                className={`enquiry-filter-btn ${enquiryFilter === "pending" ? "active" : ""}`}
              >
                <span>Pending</span>
                <span className="enquiry-filter-counter">{pendingCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setEnquiryFilter("responded")}
                className={`enquiry-filter-btn ${enquiryFilter === "responded" ? "active" : ""}`}
              >
                <span>Responded</span>
                <span className="enquiry-filter-counter">{respondedCount}</span>
              </button>
            </div>

            <div className="enquiry-search-wrapper">
              <svg
                className="enquiry-search-icon"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search client, phone, or service..."
                value={enquirySearch}
                onChange={(e) => setEnquirySearch(e.target.value)}
                className="enquiry-search-input"
              />
            </div>
          </div>

          {/* Enquiries Table (Desktop / Laptop view) */}
          <div className="admin-table-container enquiries-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>
                    <span className="th-inner">Client Name</span>
                  </th>
                  <th>
                    <span className="th-inner">Phone &amp; Contact</span>
                  </th>
                  <th>
                    <span className="th-inner">Service Requested</span>
                  </th>
                  <th>
                    <span className="th-inner">Submitted Time</span>
                  </th>
                  <th>
                    <span className="th-inner">Team Response Status</span>
                  </th>
                  <th style={{ textAlign: "right" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-admin-cell">
                      {enquirySearch.trim()
                        ? "No enquiries match your search query."
                        : enquiryFilter === "pending"
                        ? "No pending enquiries. All leads have been responded to!"
                        : enquiryFilter === "responded"
                        ? "No responded enquiries yet."
                        : "No client enquiries received yet."}
                    </td>
                  </tr>
                ) : (
                  filteredEnquiries.map((item) => {
                    const initials = (item.name || "Client")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const timeMeta = formatEnquiryDateTime(
                      item.submittedAt || item.createdAt
                    );

                    const respondedTimeMeta = item.respondedAt
                      ? formatEnquiryDateTime(item.respondedAt)
                      : null;

                    const cleanPhone = item.phone.replace(/[^0-9+]/g, "");
                    const isResponded = item.status === "responded";
                    const isCurrentUpdating = updatingEnquiryId === item._id;

                    return (
                      <tr key={item._id}>
                        {/* 1. Client Name */}
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar-photo">
                              {initials}
                            </div>
                            <div className="enquiry-client-info">
                              <span className="enquiry-client-name">
                                {item.name}
                              </span>
                              {item.email && (
                                <a
                                  href={`mailto:${item.email}`}
                                  style={{
                                    fontSize: "12px",
                                    color: "#38bdf8",
                                    textDecoration: "none",
                                    display: "block",
                                    marginTop: "2px",
                                  }}
                                  title={`Email ${item.email}`}
                                >
                                  {item.email}
                                </a>
                              )}
                              {item.otherService && (
                                <span className="enquiry-client-note">
                                  Note: {item.otherService}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Phone & Quick Contact */}
                        <td>
                          <div className="enquiry-phone-group">
                            <span className="enquiry-phone-text">
                              {item.phone}
                            </span>

                            {/* Direct Call Link */}
                            <a
                              href={`tel:${cleanPhone}`}
                              className="enquiry-contact-btn"
                              title={`Call ${item.phone}`}
                              aria-label={`Call ${item.name}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                            </a>

                            {/* Direct WhatsApp Link */}
                            <a
                              href={`https://wa.me/${cleanPhone.replace("+", "")}?text=Hello%20${encodeURIComponent(
                                item.name
                              )}%2C%20thank%20you%20for%20reaching%20out%20to%20ABC%20Typing%20regarding%20${encodeURIComponent(
                                item.service
                              )}.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="enquiry-contact-btn whatsapp"
                              title="Chat on WhatsApp"
                              aria-label={`WhatsApp ${item.name}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </a>

                            {/* Direct Email Reply Button */}
                            {item.email && (
                              <button
                                type="button"
                                onClick={() => handleOpenReplyModal(item)}
                                className="enquiry-contact-btn"
                                style={{ color: "#38bdf8" }}
                                title={`Send email reply to ${item.email}`}
                                aria-label={`Email reply to ${item.name}`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect width="20" height="16" x="2" y="4" rx="2" />
                                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 3. Service Requested */}
                        <td>
                          <span className="enquiry-service-badge" title={item.service}>
                            {item.service}
                          </span>
                        </td>

                        {/* 4. Submitted Time */}
                        <td>
                          <div className="enquiry-time-group">
                            <span className="enquiry-time-exact">
                              {timeMeta.formatted}
                            </span>
                            {timeMeta.relative && (
                              <span className="enquiry-time-relative">
                                {timeMeta.relative}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Team Response Status & Responder Info */}
                        <td>
                          <div className="enquiry-status-group">
                            <span
                              className={`enquiry-status-pill ${
                                isResponded ? "responded" : "pending"
                              }`}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: isResponded ? "#16a34a" : "#d97706",
                                }}
                              />
                              {isResponded ? "Responded" : "Pending Response"}
                            </span>

                            {isResponded ? (
                              <span className="enquiry-responder-meta">
                                Responded by <strong>{item.respondedBy || "Team Member"}</strong>
                                {respondedTimeMeta && ` on ${respondedTimeMeta.formatted}`}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#94a3b8",
                                }}
                              >
                                Awaiting response
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Action Column */}
                        <td style={{ textAlign: "right" }}>
                          <div
                            className="table-action-group"
                            style={{ justifyContent: "flex-end", gap: "6px" }}
                          >
                            {/* Direct Email Reply Button */}
                            {item.email && (
                              <button
                                type="button"
                                className="flat-secondary-btn"
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  color: "#38bdf8",
                                  borderColor: "rgba(56, 189, 248, 0.3)",
                                }}
                                onClick={() => handleOpenReplyModal(item)}
                                title={`Send direct email reply to ${item.email}`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ width: "12px", height: "12px" }}
                                >
                                  <rect width="20" height="16" x="2" y="4" rx="2" />
                                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                                <span>Reply</span>
                              </button>
                            )}

                            {!isResponded ? (
                              <button
                                type="button"
                                className="enquiry-action-btn-respond"
                                onClick={() => handleToggleEnquiryResponded(item)}
                                disabled={isCurrentUpdating}
                                title="Mark this enquiry as responded"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ width: "13px", height: "13px" }}
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>{isCurrentUpdating ? "Saving..." : "Mark Responded"}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="enquiry-action-btn-reopen"
                                onClick={() => handleToggleEnquiryResponded(item)}
                                disabled={isCurrentUpdating}
                                title="Reopen as pending"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ width: "12px", height: "12px" }}
                                >
                                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                  <path d="M3 3v5h5" />
                                </svg>
                                <span>Reopen</span>
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              className="table-action-btn delete"
                              onClick={() => handleDeleteEnquiry(item._id)}
                              title="Delete enquiry"
                              aria-label={`Delete enquiry from ${item.name}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Card View for Client Enquiries (Default shrunken, expands on chevron click) */}
          <div className="enquiries-mobile-list">
            {isEnquiriesLoading ? (
              <div className="clients-empty-state">
                <div className="db-spinner-svg" style={{ margin: "0 auto 12px" }}>
                  <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                    <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <p>Loading enquiries...</p>
              </div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="clients-empty-state">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3>No enquiries found</h3>
                <p>
                  {enquirySearch.trim()
                    ? "No enquiries match your search query."
                    : enquiryFilter === "pending"
                    ? "No pending enquiries. All leads have been responded to!"
                    : enquiryFilter === "responded"
                    ? "No responded enquiries yet."
                    : "No client enquiries received yet."}
                </p>
              </div>
            ) : (
              filteredEnquiries.map((item) => {
                const isExpanded = expandedEnquiryIds.has(item._id);
                const initials = (item.name || "Client")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const timeMeta = formatEnquiryDateTime(item.submittedAt || item.createdAt);
                const respondedTimeMeta = item.respondedAt
                  ? formatEnquiryDateTime(item.respondedAt)
                  : null;
                const cleanPhone = item.phone.replace(/[^0-9+]/g, "");
                const isResponded = item.status === "responded";
                const isCurrentUpdating = updatingEnquiryId === item._id;

                return (
                  <div
                    key={`mobile-enquiry-${item._id}`}
                    className={`client-mobile-card ${isExpanded ? "is-expanded" : ""}`}
                  >
                    {/* Shrunken Header: Avatar, Name, Status Pill & Angle Down Chevron */}
                    <div
                      className="client-mobile-card-header"
                      onClick={(e) => toggleEnquiryExpand(item._id, e)}
                    >
                      <div className="client-mobile-header-left">
                        <div className="admin-avatar-photo">
                          {initials}
                        </div>
                        <span className="client-mobile-name">
                          {item.name}
                        </span>
                      </div>

                      <div className="client-mobile-header-right">
                        <span
                          className={`enquiry-status-pill ${
                            isResponded ? "responded" : "pending"
                          }`}
                          style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: isResponded ? "#16a34a" : "#d97706",
                            }}
                          />
                          {isResponded ? "Responded" : "Pending"}
                        </span>
                        <button
                          type="button"
                          className={`client-mobile-expand-btn ${isExpanded ? "rotated" : ""}`}
                          onClick={(e) => toggleEnquiryExpand(item._id, e)}
                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Body: All enquiry details */}
                    {isExpanded && (
                      <div className="client-mobile-card-body">
                        {/* Phone & Quick Contact */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Phone &amp; Contact</span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <span className="detail-value">{item.phone}</span>
                            <div className="enquiry-phone-group" style={{ margin: 0 }}>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="enquiry-contact-btn"
                                title={`Call ${item.phone}`}
                                aria-label={`Call ${item.name}`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                              </a>

                              <a
                                href={`https://wa.me/${cleanPhone.replace("+", "")}?text=Hello%20${encodeURIComponent(
                                  item.name
                                )}%2C%20thank%20you%20for%20reaching%20out%20to%20ABC%20Typing%20regarding%20${encodeURIComponent(
                                  item.service
                                )}.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="enquiry-contact-btn whatsapp"
                                title="Chat on WhatsApp"
                                aria-label={`WhatsApp ${item.name}`}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </a>

                              {item.email && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReplyModal(item)}
                                  className="enquiry-contact-btn"
                                  style={{ color: "#38bdf8" }}
                                  title={`Send email reply to ${item.email}`}
                                  aria-label={`Email reply to ${item.name}`}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Email Address */}
                        {item.email && (
                          <div className="client-mobile-detail-row">
                            <span className="detail-label">Email Address</span>
                            <span className="detail-value">
                              <a
                                href={`mailto:${item.email}`}
                                style={{
                                  color: "#0284c7",
                                  textDecoration: "none",
                                  fontWeight: "500",
                                }}
                              >
                                {item.email}
                              </a>
                            </span>
                          </div>
                        )}

                        {/* Service Requested */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Service Requested</span>
                          <div className="detail-value" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span className="enquiry-service-badge" style={{ width: "fit-content" }}>
                              {item.service}
                            </span>
                            {item.otherService && (
                              <span className="enquiry-client-note">
                                Note: {item.otherService}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submitted Time */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Submitted Time</span>
                          <span className="detail-value">
                            {timeMeta.formatted}
                            {timeMeta.relative && ` (${timeMeta.relative})`}
                          </span>
                        </div>

                        {/* Team Response Status */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Team Response Status</span>
                          <div className="detail-value" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span
                              className={`enquiry-status-pill ${
                                isResponded ? "responded" : "pending"
                              }`}
                              style={{ width: "fit-content" }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: isResponded ? "#16a34a" : "#d97706",
                                }}
                              />
                              {isResponded ? "Responded" : "Pending Response"}
                            </span>
                            {isResponded ? (
                              <span className="enquiry-responder-meta" style={{ marginTop: "2px" }}>
                                Responded by <strong>{item.respondedBy || "Team Member"}</strong>
                                {respondedTimeMeta && ` on ${respondedTimeMeta.formatted}`}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                Awaiting response
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginTop: "6px",
                            paddingTop: "10px",
                            borderTop: "1px solid #f1f5f9",
                          }}
                        >
                          {item.email && (
                            <button
                              type="button"
                              className="flat-secondary-btn"
                              style={{
                                flex: 1,
                                padding: "8px 12px",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                color: "#0284c7",
                                borderColor: "rgba(2, 132, 199, 0.3)",
                              }}
                              onClick={() => handleOpenReplyModal(item)}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: "13px", height: "13px" }}
                              >
                                <rect width="20" height="16" x="2" y="4" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                              </svg>
                              <span>Reply</span>
                            </button>
                          )}

                          {!isResponded ? (
                            <button
                              type="button"
                              className="enquiry-action-btn-respond"
                              style={{ flex: 1, padding: "8px 12px", fontSize: "12px", justifyContent: "center" }}
                              onClick={() => handleToggleEnquiryResponded(item)}
                              disabled={isCurrentUpdating}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: "13px", height: "13px" }}
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>{isCurrentUpdating ? "Saving..." : "Mark Responded"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="enquiry-action-btn-reopen"
                              style={{ flex: 1, padding: "8px 12px", fontSize: "12px", justifyContent: "center" }}
                              onClick={() => handleToggleEnquiryResponded(item)}
                              disabled={isCurrentUpdating}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: "13px", height: "13px" }}
                              >
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                              </svg>
                              <span>Reopen</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="table-action-btn delete"
                            style={{ width: "36px", height: "36px", flexShrink: 0 }}
                            onClick={() => handleDeleteEnquiry(item._id)}
                            title="Delete enquiry"
                            aria-label={`Delete enquiry from ${item.name}`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* -------------------------------------------------------------
          TAB: WHATSAPP ENQUIRIES (Master Admin & Worker Admins)
          ------------------------------------------------------------- */}
      {activeTab === "whatsapp_enquiries" && (
        <WhatsAppEnquiriesManager
          user={user}
          onPendingCountChange={onPendingWhatsAppCountChange}
        />
      )}

      {/* -------------------------------------------------------------
          TAB: CLIENTS & FILES (Master Admin & Worker Admins)
          ------------------------------------------------------------- */}
      {activeTab === "clients" && (
        <ClientsManager user={user} isMaster={isMaster} />
      )}

      {/* -------------------------------------------------------------
          TAB: WORKER ADMINS (Master Admin only)
          ------------------------------------------------------------- */}
      {activeTab === "worker_admins" && isMaster && (
        <>
          {/* Header Row: Title on Left, Capsule Button on Right */}
          <div className="content-header-row">
            <h1 className="content-title">Worker Admins</h1>

            {isMaster && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="capsule-btn-black"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2.2"
                  stroke="currentColor"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Create Admin User</span>
              </button>
            )}
          </div>

          {/* Admin Table */}
          <div className="admin-table-container worker-admins-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={
                        workerAdmins.length > 0 &&
                        selectedIds.size === workerAdmins.length
                      }
                      onChange={handleSelectAll}
                      disabled={workerAdmins.length === 0}
                      aria-label="Select all admin users"
                    />
                  </th>
                  <th>
                    <span className="th-inner">Admin Name</span>
                  </th>
                  <th>
                    <span className="th-inner">Setup</span>
                  </th>
                  <th>
                    <span className="th-inner">Location</span>
                  </th>
                  <th>
                    <span className="th-inner">Last Login</span>
                  </th>
                  <th>
                    <span className="th-inner">Status</span>
                  </th>
                  <th style={{ textAlign: "right", width: "48px" }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoadingWorkers ? (
                  <tr>
                    <td colSpan={7} className="empty-admin-cell">
                      Loading worker admins...
                    </td>
                  </tr>
                ) : workerAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-admin-cell">
                      No admin user
                    </td>
                  </tr>
                ) : (
                  workerAdmins.map((admin) => {
                    const hasCompleted = Boolean(
                      admin.profileCompleted && admin.name
                    );
                    const initials = hasCompleted
                      ? admin
                          .name!.split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : admin.identifier.slice(0, 1).toUpperCase();

                    return (
                      <tr key={admin.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="admin-checkbox"
                            checked={selectedIds.has(admin.id)}
                            onChange={() => handleToggleSelect(admin.id)}
                            aria-label={`Select ${admin.name || admin.identifier}`}
                          />
                        </td>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar-photo">
                              {initials || "A"}
                            </div>
                            <div className="admin-user-info">
                              {hasCompleted ? (
                                <span className="admin-user-name">
                                  {admin.name}
                                </span>
                              ) : (
                                <span className="admin-user-pending-text">
                                  Setup Pending
                                </span>
                              )}
                              <span className="admin-user-email">
                                {admin.identifier}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`setup-pill ${
                              hasCompleted ? "completed" : "pending"
                            }`}
                          >
                            {hasCompleted ? "Completed" : "Pending"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "0.84rem",
                              color: admin.location ? "#334155" : "#94a3b8",
                            }}
                          >
                            {admin.location || "—"}
                          </span>
                        </td>
                        <td>
                          {admin.lastLoginAt ? (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.84rem",
                                  color: "#0f172a",
                                  fontWeight: 500,
                                }}
                              >
                                {new Date(admin.lastLoginAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.74rem",
                                  color: "#64748b",
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {new Date(admin.lastLoginAt).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </span>
                            </div>
                          ) : (
                            <span
                              style={{ fontSize: "0.84rem", color: "#94a3b8" }}
                            >
                              Never
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              admin.status === "active" ? "active" : "inactive"
                            }`}
                          >
                            {admin.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="table-arrow-btn"
                            title="View admin details"
                            aria-label={`View ${admin.name || admin.identifier}`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12h14" />
                              <path d="M12 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Card View for Worker Admins (Default shrunken, expands on chevron click) */}
          <div className="worker-admins-mobile-list">
            {isLoadingWorkers ? (
              <div className="clients-empty-state">
                <div className="db-spinner-svg" style={{ margin: "0 auto 12px" }}>
                  <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                    <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <p>Loading worker admins...</p>
              </div>
            ) : workerAdmins.length === 0 ? (
              <div className="clients-empty-state">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <h3>No admin users found</h3>
                <p>Click &apos;Create Admin User&apos; to add a new worker admin.</p>
              </div>
            ) : (
              workerAdmins.map((admin) => {
                const isExpanded = expandedWorkerAdminIds.has(admin.id);
                const hasCompleted = Boolean(admin.profileCompleted && admin.name);
                const initials = hasCompleted
                  ? admin
                      .name!.split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : admin.identifier.slice(0, 1).toUpperCase();

                return (
                  <div
                    key={`mobile-worker-${admin.id}`}
                    className={`client-mobile-card ${isExpanded ? "is-expanded" : ""}`}
                  >
                    {/* Shrunken Header: Name, Avatar, Status Pill & Angle Down Chevron */}
                    <div
                      className="client-mobile-card-header"
                      onClick={(e) => toggleWorkerAdminExpand(admin.id, e)}
                    >
                      <div className="client-mobile-header-left">
                        <div className="admin-avatar-photo">
                          {initials || "A"}
                        </div>
                        <span className="client-mobile-name">
                          {hasCompleted ? admin.name : "Setup Pending"}
                        </span>
                      </div>

                      <div className="client-mobile-header-right">
                        <span
                          className={`status-pill ${
                            admin.status === "active" ? "active" : "inactive"
                          }`}
                          style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                        >
                          {admin.status === "active" ? "Active" : "Inactive"}
                        </span>
                        <button
                          type="button"
                          className={`client-mobile-expand-btn ${isExpanded ? "rotated" : ""}`}
                          onClick={(e) => toggleWorkerAdminExpand(admin.id, e)}
                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Body: All Details matching Laptop view */}
                    {isExpanded && (
                      <div className="client-mobile-card-body">
                        {/* Identifier / Email */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Admin Email</span>
                          <span className="detail-value mono">{admin.identifier}</span>
                        </div>

                        {/* Setup Status */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Profile Setup</span>
                          <div className="detail-value">
                            <span
                              className={`setup-pill ${
                                hasCompleted ? "completed" : "pending"
                              }`}
                            >
                              {hasCompleted ? "Completed" : "Pending"}
                            </span>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Location</span>
                          <span className="detail-value">
                            {admin.location || "—"}
                          </span>
                        </div>

                        {/* Device Info */}
                        {admin.deviceInfo && (
                          <div className="client-mobile-detail-row">
                            <span className="detail-label">Device</span>
                            <span className="detail-value">
                              {admin.deviceInfo}
                            </span>
                          </div>
                        )}

                        {/* Last Login */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Last Login</span>
                          <span className="detail-value">
                            {admin.lastLoginAt ? (
                              `${new Date(admin.lastLoginAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })} at ${new Date(admin.lastLoginAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}`
                            ) : (
                              "Never"
                            )}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Account Status</span>
                          <div className="detail-value">
                            <span
                              className={`status-pill ${
                                admin.status === "active" ? "active" : "inactive"
                              }`}
                            >
                              {admin.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Modal: Create Worker Admin (Email & Password Only) */}
      {isCreateModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Create Admin User</h2>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close modal"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {createError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "0.82rem",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "14px",
                  border: "1px solid #fecaca",
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="admin-modal-form">
              <div className="admin-form-field">
                <label className="admin-form-label">Admin Email</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="worker1@abc.com"
                  className="admin-form-input"
                  required
                  autoFocus
                />
              </div>

              <div className="admin-form-field">
                <label className="admin-form-label">Temporary Password</label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="admin-form-input"
                  required
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flat-secondary-btn"
                  disabled={isCreatingAdmin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="capsule-btn-black"
                  disabled={isCreatingAdmin}
                >
                  {isCreatingAdmin ? "Creating in DB..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Worker Admin First-Time Profile Setup */}
      {isWorkerProfilePending && (
        <div className="admin-modal-backdrop" style={{ zIndex: 9999 }}>
          <div
            className="admin-modal-box"
            style={{ maxWidth: "440px", padding: "32px 28px" }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: "22px", height: "22px" }}
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <h2
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "0 0 6px 0",
                }}
              >
                Complete Your Profile
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#64748b",
                  margin: 0,
                  lineHeight: 1.45,
                }}
              >
                Welcome! Please enter your name and phone number to complete your
                Worker Admin account setup.
              </p>
            </div>

            {profileError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "0.82rem",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "14px",
                  border: "1px solid #fecaca",
                }}
              >
                {profileError}
              </div>
            )}

            <form onSubmit={handleCompleteProfile} className="admin-modal-form">
              <div className="admin-form-field">
                <label className="admin-form-label">Full Name *</label>
                <input
                  type="text"
                  value={workerProfileName}
                  onChange={(e) => setWorkerProfileName(e.target.value)}
                  placeholder="e.g. Tariq Mansoor"
                  className="admin-form-input"
                  required
                  autoFocus
                />
              </div>

              <div className="admin-form-field">
                <label className="admin-form-label">Phone Number *</label>
                <input
                  type="tel"
                  value={workerProfilePhone}
                  onChange={(e) => setWorkerProfilePhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="admin-form-input"
                  required
                />
              </div>

              <div
                className="admin-modal-actions"
                style={{ justifyContent: "flex-end", marginTop: "24px" }}
              >
                <button
                  type="submit"
                  className="capsule-btn-black"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Complete Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          EMAIL REPLY MODAL (Direct Email Response via Resend)
          ------------------------------------------------------------- */}
      {replyModalEnquiry && (
        <div className="admin-modal-overlay">
          <div
            className="admin-modal-content"
            style={{ maxWidth: "560px", width: "100%" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header" style={{ marginBottom: "16px" }}>
              <div>
                <h2 className="admin-modal-title" style={{ fontSize: "1.2rem" }}>
                  Reply to Enquiry via Email
                </h2>
                <p className="admin-modal-subtitle">
                  Sending direct email to <strong>{replyModalEnquiry.email}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyModalEnquiry(null)}
                className="admin-modal-close-btn"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {replySuccessMessage && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  color: "#065f46",
                  fontSize: "0.85rem",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid #a7f3d0",
                }}
              >
                ✅ {replySuccessMessage}
              </div>
            )}

            {replyError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid #fecaca",
                }}
              >
                ❌ {replyError}
              </div>
            )}

            <form onSubmit={handleSendEmailReply} className="admin-modal-form">
              <div className="admin-form-field" style={{ marginBottom: "12px" }}>
                <label className="admin-form-label">Subject</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="admin-form-input"
                  required
                />
              </div>

              <div className="admin-form-field" style={{ marginBottom: "20px" }}>
                <label className="admin-form-label">Message Body</label>
                <textarea
                  rows={6}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="admin-form-input"
                  style={{ resize: "vertical", lineHeight: "1.5" }}
                  required
                />
              </div>

              <div
                className="admin-modal-actions"
                style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
              >
                <button
                  type="button"
                  onClick={() => setReplyModalEnquiry(null)}
                  disabled={isSendingReply}
                  className="flat-secondary-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="capsule-btn-black"
                  style={{
                    backgroundColor: isSendingReply ? "#64748b" : "#2563eb",
                    borderColor: isSendingReply ? "#64748b" : "#2563eb",
                  }}
                >
                  {isSendingReply ? "Sending..." : "✉️ Send Email Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Worker Admin First-Time Profile Setup */}
      {isWorkerProfilePending && (
        <div className="admin-modal-backdrop" style={{ zIndex: 9999 }}>
          <div
            className="admin-modal-box"
            style={{ maxWidth: "440px", padding: "32px 28px" }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#f1f5f9",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: "22px", height: "22px" }}
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <h2
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "0 0 6px 0",
                }}
              >
                Complete Your Profile
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#64748b",
                  margin: 0,
                  lineHeight: 1.45,
                }}
              >
                Welcome! Please enter your name and phone number to complete your
                Worker Admin account setup.
              </p>
            </div>

            {profileError && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "0.82rem",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "14px",
                  border: "1px solid #fecaca",
                }}
              >
                {profileError}
              </div>
            )}

            <form onSubmit={handleCompleteProfile} className="admin-modal-form">
              <div className="admin-form-field">
                <label className="admin-form-label">Full Name *</label>
                <input
                  type="text"
                  value={workerProfileName}
                  onChange={(e) => setWorkerProfileName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="admin-form-input"
                  required
                  autoFocus
                />
              </div>

              <div className="admin-form-field">
                <label className="admin-form-label">Phone Number *</label>
                <input
                  type="tel"
                  value={workerProfilePhone}
                  onChange={(e) => setWorkerProfilePhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="admin-form-input"
                  required
                />
              </div>

              <div
                className="admin-modal-actions"
                style={{ justifyContent: "flex-end", marginTop: "24px" }}
              >
                <button
                  type="submit"
                  className="capsule-btn-black"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Complete Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
