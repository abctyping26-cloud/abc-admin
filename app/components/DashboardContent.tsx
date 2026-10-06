"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { SidebarTab } from "./DashboardSidebar";
import DatabaseLoadingOverlay from "./DatabaseLoadingOverlay";
import ClientsManager from "./ClientsManager";
import WebsiteEditManager from "./WebsiteEditManager";
import WhatsAppEnquiriesManager from "./WhatsAppEnquiriesManager";
import CloudUsageSection from "./CloudUsageSection";
import WebTrafficSection from "./WebTrafficSection";
import AccountingSection from "./AccountingSection";
import SuppliersManager from "./SuppliersManager";
import IncomesManager from "./IncomesManager";
import ExpensesManager from "./ExpensesManager";
import InvoicesManager from "./InvoicesManager";
import BankManager from "./BankManager";
import PersonnelManager from "./PersonnelManager";
import ActivityLogManager from "./ActivityLogManager";
import PrintableInvoiceModal, { PrintableInvoiceData } from "./PrintableInvoiceModal";
import { API_BASE_URL } from "../config/api";

export interface AdminModuleOption {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

export const AVAILABLE_ADMIN_MODULES: AdminModuleOption[] = [
  {
    id: "accounting",
    label: "Accounting",
    shortLabel: "Accounting",
    description: "Invoices, Incomes, Expenses, Suppliers & Accounting Hub",
    icon: "💼",
  },
  {
    id: "clients",
    label: "Clients & Files",
    shortLabel: "Clients",
    description: "Commercial clients directory and file management",
    icon: "👥",
  },
  {
    id: "enquiries",
    label: "Website Enquiries",
    shortLabel: "Enquiries",
    description: "Online form leads, opt-in assignment & customer replies",
    icon: "✉️",
  },
  {
    id: "whatsapp_enquiries",
    label: "WhatsApp CRM",
    shortLabel: "WhatsApp",
    description: "Live customer chat messaging & quick responses",
    icon: "💬",
  },
  {
    id: "website_edit",
    label: "Website Content",
    shortLabel: "Web Content",
    description: "Services catalogue, documentation checklist & marquee",
    icon: "🌐",
  },
  {
    id: "analytics",
    label: "Traffic & Analytics",
    shortLabel: "Analytics",
    description: "Google Analytics 4 visitor stats and cloud infrastructure usage",
    icon: "📊",
  },
];

export interface WorkerAdminUser {
  id: string;
  identifier: string;
  password?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  location?: string;
  deviceInfo?: string;
  role?: "worker_admin" | "admin" | "master_admin" | "superadmin";
  profileCompleted: boolean;
  isFirstLogin?: boolean;
  avatarUrl?: string;
  createdAt?: string;
  lastLoginAt?: string;
  status: "active" | "inactive";
  assignedRoles?: string[];
  canDeleteData?: boolean;
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
  claimedBy?: string | null;
  claimedByName?: string;
  claimedByRole?: string;
  claimedByEmail?: string;
  claimedAt?: string;
  notes?: string;
  createdAt?: string;
}

interface DashboardContentProps {
  activeTab: SidebarTab;
  onNavigateTab?: (tab: SidebarTab) => void;
  selectedProject?: "abc_typing" | "abc_neon";
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
    assignedRoles?: string[];
    canDeleteData?: boolean;
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
  selectedProject = "abc_typing",
  user,
  onPendingCountChange,
  onPendingWhatsAppCountChange,
}: DashboardContentProps) {
  const isMaster =
    user?.role === "master_admin" ||
    user?.role === "superadmin" ||
    user?.identifier === "masteradmin@abc.com";
  const canDeleteData = isMaster || user?.canDeleteData !== false;

  // Real MongoDB Worker Admins state
  const [workerAdmins, setWorkerAdmins] = useState<WorkerAdminUser[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(
    isMaster && activeTab === "worker_admins"
  );
  const [createError, setCreateError] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [workerAdminSubTab, setWorkerAdminSubTab] = useState<"admins" | "personnel">("admins");

  // Worker Admin Detail & Handled Invoices state
  const [selectedWorkerAdminForDetail, setSelectedWorkerAdminForDetail] = useState<WorkerAdminUser | null>(null);
  const [isEditingDetailRoles, setIsEditingDetailRoles] = useState(false);
  const [workerInvoices, setWorkerInvoices] = useState<any[]>([]);
  const [isLoadingWorkerInvoices, setIsLoadingWorkerInvoices] = useState(false);
  const [activePrintInvoice, setActivePrintInvoice] = useState<PrintableInvoiceData | null>(null);

  // Fetch invoices handled by a specific worker admin from MongoDB
  const fetchWorkerInvoices = useCallback(async (admin: WorkerAdminUser) => {
    setIsLoadingWorkerInvoices(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("abc_admin_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (user?.id) headers["x-admin-id"] = user.id;

      const employeeQuery = admin.name || admin.identifier;
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/accounting/invoices?employee=${encodeURIComponent(employeeQuery)}`,
        { headers }
      );
      if (res.ok) {
        const json = await res.json();
        setWorkerInvoices(json.data?.invoices || []);
      }
    } catch (err) {
      console.error("Error fetching worker admin invoices:", err);
    } finally {
      setIsLoadingWorkerInvoices(false);
    }
  }, [user]);

  const handleOpenWorkerAdminDetail = (admin: WorkerAdminUser) => {
    setIsEditingDetailRoles(false);
    setSelectedWorkerAdminForDetail(admin);
    fetchWorkerInvoices(admin);
  };

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
  const [newAdminRoles, setNewAdminRoles] = useState<string[]>([
    "accounting",
    "enquiries",
    "whatsapp_enquiries",
    "clients",
  ]);
  const [newAdminCanDelete, setNewAdminCanDelete] = useState<boolean>(false);

  // Edit Roles & Permissions Modal state
  const [editingWorkerAdmin, setEditingWorkerAdmin] = useState<WorkerAdminUser | null>(null);
  const [editAdminRoles, setEditAdminRoles] = useState<string[]>([]);
  const [editAdminCanDelete, setEditAdminCanDelete] = useState<boolean>(false);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");
  const [permissionsSuccess, setPermissionsSuccess] = useState("");
  const [isDeletingWorker, setIsDeletingWorker] = useState(false);

  // Detail Modal Roles in-place edit state
  const [detailRolesDraft, setDetailRolesDraft] = useState<string[]>([]);
  const [detailCanDeleteDraft, setDetailCanDeleteDraft] = useState<boolean>(false);
  const [isSavingDetailRoles, setIsSavingDetailRoles] = useState(false);
  const [detailSaveSuccessMsg, setDetailSaveSuccessMsg] = useState("");

  const handleStartEditDetailRoles = () => {
    if (selectedWorkerAdminForDetail) {
      setDetailRolesDraft(selectedWorkerAdminForDetail.assignedRoles || []);
      setDetailCanDeleteDraft(Boolean(selectedWorkerAdminForDetail.canDeleteData));
      setDetailSaveSuccessMsg("");
    }
    setIsEditingDetailRoles(true);
  };

  const handleSaveDetailRoles = async () => {
    if (!selectedWorkerAdminForDetail) return;
    setIsSavingDetailRoles(true);
    setDetailSaveSuccessMsg("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/workers/${selectedWorkerAdminForDetail.id}/permissions`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAdminAuthHeaders(),
          },
          body: JSON.stringify({
            assignedRoles: detailRolesDraft,
            canDeleteData: detailCanDeleteDraft,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update roles & permissions.");
      }

      const updatedRoles = detailRolesDraft;
      const updatedCanDelete = detailCanDeleteDraft;

      setSelectedWorkerAdminForDetail((prev) =>
        prev
          ? {
              ...prev,
              assignedRoles: updatedRoles,
              canDeleteData: updatedCanDelete,
            }
          : null
      );

      setWorkerAdmins((prev) =>
        prev.map((w) =>
          w.id === selectedWorkerAdminForDetail.id
            ? {
                ...w,
                assignedRoles: updatedRoles,
                canDeleteData: updatedCanDelete,
              }
            : w
        )
      );

      setDetailSaveSuccessMsg("Saved!");
      setTimeout(() => {
        setIsEditingDetailRoles(false);
        setDetailSaveSuccessMsg("");
      }, 700);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update permissions.");
    } finally {
      setIsSavingDetailRoles(false);
    }
  };

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
  const [enquiryFilter, setEnquiryFilter] = useState<
    "all" | "available" | "my_claims" | "pending" | "responded"
  >("all");
  const [enquirySearch, setEnquirySearch] = useState<string>("");
  const [isEnquiriesLoading, setIsEnquiriesLoading] = useState(true);
  const [updatingEnquiryId, setUpdatingEnquiryId] = useState<string | null>(null);
  const [claimingEnquiryId, setClaimingEnquiryId] = useState<string | null>(null);

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
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/enquiries`, {
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const serverList: EnquiryItem[] = data.data?.enquiries || [];
        setEnquiries(serverList);
        try {
          localStorage.setItem("abc_enquiries", JSON.stringify(serverList));
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
      // Backend offline: use localStorage fallback
      const stored = localStorage.getItem("abc_enquiries");
      if (stored) {
        setEnquiries(JSON.parse(stored));
      }
    } finally {
      setIsEnquiriesLoading(false);
    }
  }, [getAdminAuthHeaders]);

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

    fetch(`${API_BASE_URL}/api/v1/admin/enquiries`, {
      headers: getAdminAuthHeaders(),
    })
      .then(async (res) => {
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          const serverList: EnquiryItem[] = data.data?.enquiries || [];
          if (isMounted) {
            setEnquiries(serverList);
          }
          try {
            localStorage.setItem("abc_enquiries", JSON.stringify(serverList));
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
      refreshEnquiries();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("abc_enquiries_updated", handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("abc_enquiries_updated", handleSync);
    };
  }, [activeTab, isMaster, getAdminAuthHeaders, refreshEnquiries]);

  // Opt In / Claim Enquiry
  const handleOptInEnquiry = async (enquiry: EnquiryItem) => {
    const adminId = user?.id || (isMaster ? "master_admin" : "");
    const adminName =
      user?.name?.trim() ||
      user?.identifier?.split("@")[0] ||
      (isMaster ? "Master Admin" : "Worker Admin");
    const adminRole = isMaster ? "master_admin" : (user?.role || "worker_admin");
    const adminEmail = user?.identifier || "";

    setClaimingEnquiryId(enquiry._id);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/enquiries/${enquiry._id}/claim`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAdminAuthHeaders(),
          },
          body: JSON.stringify({
            adminId,
            adminName,
            adminRole,
            adminEmail,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to claim this enquiry.");
        refreshEnquiries();
        return;
      }

      const updatedEnquiry: EnquiryItem = data.data?.enquiry;
      if (updatedEnquiry) {
        setEnquiries((prev) =>
          prev.map((item) => (item._id === enquiry._id ? updatedEnquiry : item))
        );
        try {
          window.dispatchEvent(new Event("abc_enquiries_updated"));
        } catch {
          // Ignore
        }
      } else {
        refreshEnquiries();
      }
    } catch (err) {
      console.error("Error opting in to enquiry:", err);
      alert("Unable to reach server. Please verify your connection.");
    } finally {
      setClaimingEnquiryId(null);
    }
  };

  // Opt Out / Release Enquiry
  const handleOptOutEnquiry = async (enquiry: EnquiryItem) => {
    if (
      !confirm(
        "Are you sure you want to release this enquiry? It will become open for any team member to opt in."
      )
    ) {
      return;
    }

    setClaimingEnquiryId(enquiry._id);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/enquiries/${enquiry._id}/unclaim`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAdminAuthHeaders(),
          },
          body: JSON.stringify({
            adminId: user?.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to release this enquiry.");
        refreshEnquiries();
        return;
      }

      const updatedEnquiry: EnquiryItem = data.data?.enquiry;
      if (updatedEnquiry) {
        setEnquiries((prev) =>
          prev.map((item) => (item._id === enquiry._id ? updatedEnquiry : item))
        );
        try {
          window.dispatchEvent(new Event("abc_enquiries_updated"));
        } catch {
          // Ignore
        }
      } else {
        refreshEnquiries();
      }
    } catch (err) {
      console.error("Error releasing enquiry:", err);
      alert("Unable to reach server. Please verify your connection.");
    } finally {
      setClaimingEnquiryId(null);
    }
  };

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
          ...getAdminAuthHeaders(),
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
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
    if (!confirm("Are you sure you want to remove this enquiry?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/enquiries/${id}`, {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const filtered = enquiries.filter((item) => item._id !== id);
        setEnquiries(filtered);
        try {
          localStorage.setItem("abc_enquiries", JSON.stringify(filtered));
          window.dispatchEvent(new Event("abc_enquiries_updated"));
        } catch {
          // Ignore
        }
      } else {
        const errJson = await res.json().catch(() => null);
        alert(errJson?.message || "Failed to delete enquiry.");
      }
    } catch {
      alert("Network error: Could not connect to server to delete enquiry.");
    }
  };

  // Helper to check if current logged-in user opted into this enquiry
  const isEnquiryClaimedByMe = (item: EnquiryItem): boolean => {
    if (!item.claimedBy) return false;
    const currentUserId = user?.id || "";
    const currentUserIdentifier = user?.identifier || "";
    if (currentUserId && item.claimedBy === currentUserId) return true;
    if (currentUserIdentifier && item.claimedBy === currentUserIdentifier) return true;
    if (isMaster && (item.claimedBy === "master_admin" || item.claimedByRole === "master_admin")) return true;
    return false;
  };

  // Enquiries counts and filtering
  const totalCount = enquiries.length;
  const pendingCount = enquiries.filter((e) => e.status !== "responded").length;
  const respondedCount = enquiries.filter((e) => e.status === "responded").length;
  const unclaimedCount = enquiries.filter((e) => !e.claimedBy && e.status !== "responded").length;
  const myClaimedCount = enquiries.filter((e) => isEnquiryClaimedByMe(e)).length;
  const claimedCount = enquiries.filter((e) => Boolean(e.claimedBy)).length;

  const filteredEnquiries = enquiries.filter((item) => {
    if (enquiryFilter === "pending" && item.status === "responded") return false;
    if (enquiryFilter === "responded" && item.status !== "responded") return false;
    if (enquiryFilter === "available" && (Boolean(item.claimedBy) || item.status === "responded")) return false;
    if (enquiryFilter === "my_claims" && !isEnquiryClaimedByMe(item)) return false;

    if (enquirySearch.trim()) {
      const q = enquirySearch.toLowerCase().trim();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchPhone = item.phone?.toLowerCase().includes(q);
      const matchEmail = item.email?.toLowerCase().includes(q);
      const matchService = item.service?.toLowerCase().includes(q);
      const matchResponder = item.respondedBy?.toLowerCase().includes(q);
      const matchClaimed = item.claimedByName?.toLowerCase().includes(q);
      return Boolean(matchName || matchPhone || matchEmail || matchService || matchResponder || matchClaimed);
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
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          identifier: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
          assignedRoles: newAdminRoles,
          canDeleteData: newAdminCanDelete,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to create worker admin in database.");
      }

      await refreshWorkerAdmins();
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminRoles(["accounting", "enquiries", "whatsapp_enquiries", "clients"]);
      setNewAdminCanDelete(false);
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create worker admin.");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleOpenEditPermissions = (admin: WorkerAdminUser) => {
    setEditingWorkerAdmin(admin);
    setEditAdminRoles(
      admin.assignedRoles && admin.assignedRoles.length > 0
        ? [...admin.assignedRoles]
        : ["accounting", "enquiries", "whatsapp_enquiries", "clients"]
    );
    setEditAdminCanDelete(Boolean(admin.canDeleteData));
    setPermissionsError("");
    setPermissionsSuccess("");
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkerAdmin) return;

    setIsUpdatingPermissions(true);
    setPermissionsError("");
    setPermissionsSuccess("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/workers/${editingWorkerAdmin.id}/permissions`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAdminAuthHeaders(),
          },
          body: JSON.stringify({
            assignedRoles: editAdminRoles,
            canDeleteData: editAdminCanDelete,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to update permissions in database.");
      }

      const updatedWorker: WorkerAdminUser | undefined = data.data?.worker;
      if (updatedWorker) {
        setWorkerAdmins((prev) =>
          prev.map((w) => (w.id === updatedWorker.id ? { ...w, ...updatedWorker } : w))
        );
        if (selectedWorkerAdminForDetail?.id === updatedWorker.id) {
          setSelectedWorkerAdminForDetail((prev) => (prev ? { ...prev, ...updatedWorker } : prev));
        }
      } else {
        await refreshWorkerAdmins();
      }

      setPermissionsSuccess("Permissions updated successfully in MongoDB!");
      setTimeout(() => {
        setEditingWorkerAdmin(null);
        setPermissionsSuccess("");
      }, 1000);
    } catch (err: unknown) {
      setPermissionsError(
        err instanceof Error ? err.message : "Failed to update permissions."
      );
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const handleDeleteWorkerAdmin = async (adminId: string, email: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete worker admin "${email}"? All account records will be removed from MongoDB.`
      )
    ) {
      return;
    }

    setIsDeletingWorker(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/workers/${adminId}`, {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete worker admin from database.");
      }

      setWorkerAdmins((prev) => prev.filter((w) => w.id !== adminId));
      if (selectedWorkerAdminForDetail?.id === adminId) {
        setSelectedWorkerAdminForDetail(null);
      }
      if (editingWorkerAdmin?.id === adminId) {
        setEditingWorkerAdmin(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete worker admin.");
    } finally {
      setIsDeletingWorker(false);
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
              Welcome back, {user?.name || user?.identifier || "Worker Admin"}. Overview of all clients and platform enquiries.
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
                onClick={() => setEnquiryFilter("available")}
                className={`enquiry-filter-btn ${enquiryFilter === "available" ? "active" : ""}`}
              >
                <span>Available (Open)</span>
                <span className="enquiry-filter-counter">{unclaimedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setEnquiryFilter("my_claims")}
                className={`enquiry-filter-btn ${enquiryFilter === "my_claims" ? "active" : ""}`}
              >
                <span>{isMaster ? "Claimed" : "My Opt-ins"}</span>
                <span className="enquiry-filter-counter">
                  {isMaster ? claimedCount : myClaimedCount}
                </span>
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
                    <span className="th-inner">Opt-In / Handled By</span>
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
                    <td colSpan={7} className="empty-admin-cell">
                      {enquirySearch.trim()
                        ? "No enquiries match your search query."
                        : enquiryFilter === "available"
                        ? "No unclaimed enquiries available right now."
                        : enquiryFilter === "my_claims"
                        ? isMaster
                          ? "No claimed enquiries found."
                          : "You have not opted into any enquiries yet."
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
                    const isCurrentClaiming = claimingEnquiryId === item._id;

                    return (
                      <tr key={item._id}>
                        {/* 1. Client Name */}
                        <td>
                          <div className="admin-user-cell">
                            {/* Opt In Button to the left of the user name (only if unclaimed and not responded) */}
                            {!isResponded && !item.claimedBy && (
                              <button
                                type="button"
                                className="enquiry-action-btn-optin"
                                onClick={() => handleOptInEnquiry(item)}
                                disabled={isCurrentClaiming}
                                title="Opt in to claim and handle this enquiry"
                                style={{
                                  padding: "5px 11px",
                                  fontSize: "12px",
                                  flexShrink: 0,
                                }}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ width: "12px", height: "12px" }}
                                >
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="8.5" cy="7" r="4" />
                                  <line x1="20" y1="8" x2="20" y2="14" />
                                  <line x1="23" y1="11" x2="17" y2="11" />
                                </svg>
                                <span>{isCurrentClaiming ? "Opting in..." : "Opt In"}</span>
                              </button>
                            )}

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

                        {/* 5. Opt-In / Handled By */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {!item.claimedBy ? (
                              isResponded ? (
                                <span
                                  className="enquiry-claim-badge responded"
                                  style={{
                                    backgroundColor: "#f0fdf4",
                                    color: "#16a34a",
                                    border: "1px solid #bbf7d0",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      backgroundColor: "#16a34a",
                                    }}
                                  />
                                  Responded &amp; Closed
                                </span>
                              ) : (
                                <span className="enquiry-claim-badge open">
                                  <span
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      backgroundColor: "#0284c7",
                                    }}
                                  />
                                  Open (Unclaimed)
                                </span>
                              )
                            ) : isEnquiryClaimedByMe(item) ? (
                              <span className="enquiry-claim-badge claimed-self">
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: "#059669",
                                  }}
                                />
                                Opted In (You)
                              </span>
                            ) : (
                              <span className="enquiry-claim-badge claimed-other">
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    backgroundColor: "#7c3aed",
                                  }}
                                />
                                {item.claimedByName || "Team Member"}
                              </span>
                            )}

                            {item.claimedBy && (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#64748b",
                                  paddingLeft: "2px",
                                }}
                              >
                                {isEnquiryClaimedByMe(item)
                                  ? (isMaster ? "Master Admin" : "Assigned to you")
                                  : `${item.claimedByName || "Team Member"} (${
                                      item.claimedByRole === "master_admin"
                                        ? "Master Admin"
                                        : "Worker Admin"
                                    })`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Team Response Status & Responder Info */}
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

                        {/* 7. Action Column */}
                        <td style={{ textAlign: "right" }}>
                          <div
                            className="table-action-group"
                            style={{ justifyContent: "flex-end", gap: "6px" }}
                          >
                            {/* Release / Opt Out Button (if claimed and not responded, by current user or master admin) */}
                            {item.claimedBy && !isResponded && (isEnquiryClaimedByMe(item) || isMaster) && (
                              <button
                                type="button"
                                className="enquiry-action-btn-optout"
                                onClick={() => handleOptOutEnquiry(item)}
                                disabled={isCurrentClaiming}
                                title="Release this enquiry back to the open pool"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ width: "11px", height: "11px" }}
                                >
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                                <span>{isCurrentClaiming ? "Releasing..." : "Release"}</span>
                              </button>
                            )}

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
                            {canDeleteData && (
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
                            )}
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
                const isCurrentClaiming = claimingEnquiryId === item._id;

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
                      <div className="client-mobile-header-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {/* Opt In button to the left of user name (only if unclaimed and not responded) */}
                        {!isResponded && !item.claimedBy && (
                          <button
                            type="button"
                            className="enquiry-action-btn-optin"
                            style={{
                              padding: "4px 8px",
                              fontSize: "11px",
                              borderRadius: "6px",
                              flexShrink: 0,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOptInEnquiry(item);
                            }}
                            disabled={isCurrentClaiming}
                            title="Opt in to claim and handle this enquiry"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: "11px", height: "11px" }}
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            <span>{isCurrentClaiming ? "..." : "Opt In"}</span>
                          </button>
                        )}
                        <div className="admin-avatar-photo">
                          {initials}
                        </div>
                        <span className="client-mobile-name">
                          {item.name}
                        </span>
                      </div>

                      <div className="client-mobile-header-right">
                        {item.claimedBy ? (
                          isEnquiryClaimedByMe(item) ? (
                            <span
                              className="enquiry-claim-badge claimed-self"
                              style={{ fontSize: "0.68rem", padding: "2px 7px" }}
                            >
                              Claimed (You)
                            </span>
                          ) : (
                            <span
                              className="enquiry-claim-badge claimed-other"
                              style={{ fontSize: "0.68rem", padding: "2px 7px" }}
                            >
                              {item.claimedByName || "Claimed"}
                            </span>
                          )
                        ) : !isResponded ? (
                          <span
                            className="enquiry-claim-badge open"
                            style={{ fontSize: "0.68rem", padding: "2px 7px" }}
                          >
                            Open
                          </span>
                        ) : null}

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

                        {/* Assignment / Opt-In Status */}
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Opt-In Status</span>
                          <div className="detail-value" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {!item.claimedBy ? (
                              isResponded ? (
                                <span
                                  className="enquiry-claim-badge responded"
                                  style={{
                                    width: "fit-content",
                                    backgroundColor: "#f0fdf4",
                                    color: "#16a34a",
                                    border: "1px solid #bbf7d0",
                                  }}
                                >
                                  Responded &amp; Closed
                                </span>
                              ) : (
                                <span className="enquiry-claim-badge open" style={{ width: "fit-content" }}>
                                  Open (Unclaimed)
                                </span>
                              )
                            ) : isEnquiryClaimedByMe(item) ? (
                              <span className="enquiry-claim-badge claimed-self" style={{ width: "fit-content" }}>
                                Opted In (You)
                              </span>
                            ) : (
                              <span className="enquiry-claim-badge claimed-other" style={{ width: "fit-content" }}>
                                {item.claimedByName || "Team Member"} ({item.claimedByRole === "master_admin" ? "Master Admin" : "Worker Admin"})
                              </span>
                            )}
                          </div>
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
                          {/* Opt In Button (if unclaimed and not responded) */}
                          {!item.claimedBy && !isResponded && (
                            <button
                              type="button"
                              className="enquiry-action-btn-optin"
                              style={{ flex: 1, padding: "8px 12px", fontSize: "12px", justifyContent: "center" }}
                              onClick={() => handleOptInEnquiry(item)}
                              disabled={isCurrentClaiming}
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
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                              </svg>
                              <span>{isCurrentClaiming ? "Opting in..." : "Opt In"}</span>
                            </button>
                          )}

                          {/* Release Button (if claimed and not responded, by current user or master admin) */}
                          {item.claimedBy && !isResponded && (isEnquiryClaimedByMe(item) || isMaster) && (
                            <button
                              type="button"
                              className="enquiry-action-btn-optout"
                              style={{ flex: 1, padding: "8px 12px", fontSize: "12px", justifyContent: "center" }}
                              onClick={() => handleOptOutEnquiry(item)}
                              disabled={isCurrentClaiming}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: "11px", height: "11px" }}
                              >
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                              </svg>
                              <span>{isCurrentClaiming ? "Releasing..." : "Release"}</span>
                            </button>
                          )}
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

                          {canDeleteData && (
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
                          )}
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
          TAB: WEBSITE EDIT (Services, Docs & Top Marquee)
          ------------------------------------------------------------- */}
      {(activeTab === "website_edit" || activeTab === "services") && (
        <WebsiteEditManager user={user} isMaster={isMaster} />
      )}

      {/* -------------------------------------------------------------
          TAB: ACTIVITY LOG (Master Admin only)
          ------------------------------------------------------------- */}
      {activeTab === "activity_log" && isMaster && (
        <ActivityLogManager isMaster={isMaster} />
      )}

      {/* -------------------------------------------------------------
          TAB: WORKER ADMINS (Master Admin only)
          ------------------------------------------------------------- */}
      {activeTab === "worker_admins" && isMaster && (
        <>
          {/* Sub-tab navigation: Worker Admins vs Salesmen & Personnel */}
          <div className="worker-admin-subtabs">
            <button
              type="button"
              className={`worker-admin-subtab-btn ${workerAdminSubTab === "admins" ? "active" : ""}`}
              onClick={() => setWorkerAdminSubTab("admins")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Admin Users</span>
            </button>
            <button
              type="button"
              className={`worker-admin-subtab-btn ${workerAdminSubTab === "personnel" ? "active" : ""}`}
              onClick={() => setWorkerAdminSubTab("personnel")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>Salesmen & Personnel</span>
            </button>
          </div>

          {workerAdminSubTab === "personnel" ? (
            <PersonnelManager getAuthHeaders={getAdminAuthHeaders} />
          ) : (
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
                    <span className="th-inner">Assigned Roles</span>
                  </th>
                  <th>
                    <span className="th-inner">Delete Data</span>
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
                  <th style={{ textAlign: "right", width: "110px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingWorkers ? (
                  <tr>
                    <td colSpan={9} className="empty-admin-cell">
                      Loading worker admins...
                    </td>
                  </tr>
                ) : workerAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-admin-cell">
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
                      <tr
                        key={admin.id}
                        onClick={() => handleOpenWorkerAdminDetail(admin)}
                        style={{ cursor: "pointer" }}
                        className="worker-admin-clickable-row"
                      >
                        <td onClick={(e) => e.stopPropagation()}>
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
                          {/* Assigned Roles badges */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "230px" }}>
                            {!admin.assignedRoles || admin.assignedRoles.length === 0 ? (
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>No roles assigned</span>
                            ) : (
                              admin.assignedRoles.map((roleId) => {
                                const mod = AVAILABLE_ADMIN_MODULES.find((m) => m.id === roleId);
                                return (
                                  <span
                                    key={roleId}
                                    style={{
                                      fontSize: "0.71rem",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      backgroundColor: roleId === "accounting" ? "#eff6ff" : "#f8fafc",
                                      color: roleId === "accounting" ? "#1d4ed8" : "#334155",
                                      fontWeight: 500,
                                      border: roleId === "accounting" ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    <span>{mod?.icon || "•"}</span>
                                    <span>{mod?.shortLabel || mod?.label || roleId}</span>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td>
                          {/* Data Deletion permission status */}
                          {admin.canDeleteData ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: "#15803d",
                                backgroundColor: "#dcfce7",
                                padding: "3px 8px",
                                borderRadius: "10px",
                                border: "1px solid #bbf7d0",
                              }}
                              title="Worker Admin has permission to delete data records"
                            >
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#16a34a" }} />
                              Can Delete
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "0.72rem",
                                fontWeight: 500,
                                color: "#64748b",
                                backgroundColor: "#f1f5f9",
                                padding: "3px 8px",
                                borderRadius: "10px",
                                border: "1px solid #e2e8f0",
                              }}
                              title="Data deletion is restricted for this worker admin"
                            >
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#94a3b8" }} />
                              Restricted
                            </span>
                          )}
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
                        <td
                          style={{ textAlign: "right" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            {/* Edit Roles & Permissions Button */}
                            <button
                              type="button"
                              className="table-action-btn edit"
                              title="Edit Roles & Delete Permission"
                              aria-label={`Edit roles for ${admin.name || admin.identifier}`}
                              onClick={() => handleOpenEditPermissions(admin)}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                backgroundColor: "#ffffff",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#2563eb",
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>

                            {/* View Profile & Invoices Arrow */}
                            <button
                              type="button"
                              className="table-arrow-btn"
                              title="View admin profile & handled invoices"
                              aria-label={`View ${admin.name || admin.identifier}`}
                              onClick={() => handleOpenWorkerAdminDetail(admin)}
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

                            {/* Delete Worker Admin Button */}
                            <button
                              type="button"
                              className="table-action-btn delete"
                              title="Delete Worker Admin Account"
                              aria-label={`Delete ${admin.name || admin.identifier}`}
                              onClick={() => handleDeleteWorkerAdmin(admin.id, admin.identifier)}
                              disabled={isDeletingWorker}
                              style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                border: "1px solid #fecaca",
                                backgroundColor: "#fff5f5",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#dc2626",
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
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

                        {/* Open Profile & Invoices Action */}
                        <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenWorkerAdminDetail(admin)}
                            className="client-mobile-open-btn"
                          >
                            <span>View Profile & Invoices</span>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
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
            style={{ maxWidth: "480px", width: "100%", boxSizing: "border-box" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ marginBottom: "16px" }}>
              <h2 className="admin-modal-title">Create Worker Admin</h2>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", marginBottom: "16px" }}>
                <div className="admin-form-field" style={{ minWidth: 0 }}>
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

                <div className="admin-form-field" style={{ minWidth: 0 }}>
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
              </div>

              {/* Role & Module Assignment */}
              <div className="admin-form-field" style={{ marginBottom: "0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label className="admin-form-label" style={{ margin: 0, fontWeight: 600 }}>
                    Assign Dashboard Roles & Modules
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setNewAdminRoles(AVAILABLE_ADMIN_MODULES.map((m) => m.id))}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Select All
                    </button>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <button
                      type="button"
                      onClick={() => setNewAdminRoles([])}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="worker-role-list">
                  {AVAILABLE_ADMIN_MODULES.map((mod) => {
                    const isChecked = newAdminRoles.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className="worker-role-list-item"
                        onClick={() => {
                          setNewAdminRoles((prev) =>
                            isChecked
                              ? prev.filter((r) => r !== mod.id)
                              : [...prev, mod.id]
                          );
                        }}
                      >
                        <div className="role-info">
                          <span className="role-icon">{mod.icon}</span>
                          <span className="role-label">{mod.label}</span>
                        </div>

                        <div
                          role="switch"
                          aria-checked={isChecked}
                          className={`worker-role-toggle ${isChecked ? "active" : ""}`}
                        >
                          <div className="worker-role-toggle-thumb" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Ability to Delete Data Option */}
                  <div
                    className="worker-role-list-item"
                    onClick={() => setNewAdminCanDelete((prev) => !prev)}
                  >
                    <div className="role-info">
                      <span className="role-icon">🗑️</span>
                      <span className="role-label" style={{ color: newAdminCanDelete ? "#dc2626" : "#1e293b" }}>
                        Ability to Delete Data
                      </span>
                    </div>

                    <div
                      role="switch"
                      aria-checked={newAdminCanDelete}
                      className={`worker-role-toggle delete-toggle ${newAdminCanDelete ? "active" : ""}`}
                    >
                      <div className="worker-role-toggle-thumb" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-actions" style={{ marginTop: "20px" }}>
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
                  {isCreatingAdmin ? "Creating in DB..." : "Create Worker Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Roles & Permissions for existing Worker Admin */}
      {editingWorkerAdmin && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setEditingWorkerAdmin(null)}
        >
          <div
            className="admin-modal-box"
            style={{ maxWidth: "480px", width: "100%", boxSizing: "border-box" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ marginBottom: "16px" }}>
              <div>
                <h2 className="admin-modal-title">Edit Roles & Permissions</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Worker Admin: <strong>{editingWorkerAdmin.name || editingWorkerAdmin.identifier}</strong> ({editingWorkerAdmin.identifier})
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setEditingWorkerAdmin(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {permissionsError && (
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
                {permissionsError}
              </div>
            )}

            {permissionsSuccess && (
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  color: "#166534",
                  fontSize: "0.82rem",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "14px",
                  border: "1px solid #bbf7d0",
                }}
              >
                {permissionsSuccess}
              </div>
            )}

            <form onSubmit={handleSavePermissions} className="admin-modal-form">
              {/* Role Assignment */}
              <div className="admin-form-field" style={{ marginBottom: "0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label className="admin-form-label" style={{ margin: 0, fontWeight: 600 }}>
                    Assigned Dashboard Modules
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setEditAdminRoles(AVAILABLE_ADMIN_MODULES.map((m) => m.id))}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Select All
                    </button>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <button
                      type="button"
                      onClick={() => setEditAdminRoles([])}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="worker-role-list">
                  {AVAILABLE_ADMIN_MODULES.map((mod) => {
                    const isChecked = editAdminRoles.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className="worker-role-list-item"
                        onClick={() => {
                          setEditAdminRoles((prev) =>
                            isChecked
                              ? prev.filter((r) => r !== mod.id)
                              : [...prev, mod.id]
                          );
                        }}
                      >
                        <div className="role-info">
                          <span className="role-icon">{mod.icon}</span>
                          <span className="role-label">{mod.label}</span>
                        </div>

                        <div
                          role="switch"
                          aria-checked={isChecked}
                          className={`worker-role-toggle ${isChecked ? "active" : ""}`}
                        >
                          <div className="worker-role-toggle-thumb" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Data Deletion Toggle */}
                  <div
                    className="worker-role-list-item"
                    onClick={() => setEditAdminCanDelete((prev) => !prev)}
                  >
                    <div className="role-info">
                      <span className="role-icon">🗑️</span>
                      <span className="role-label" style={{ color: editAdminCanDelete ? "#dc2626" : "#1e293b" }}>
                        Ability to Delete Data
                      </span>
                    </div>

                    <div
                      role="switch"
                      aria-checked={editAdminCanDelete}
                      className={`worker-role-toggle delete-toggle ${editAdminCanDelete ? "active" : ""}`}
                    >
                      <div className="worker-role-toggle-thumb" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-actions" style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => setEditingWorkerAdmin(null)}
                  className="flat-secondary-btn"
                  disabled={isUpdatingPermissions}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="capsule-btn-black"
                  disabled={isUpdatingPermissions}
                >
                  {isUpdatingPermissions ? "Saving to DB..." : "Save Permissions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB: ACCOUNTING (Workspace & Empty Canvas)
          ------------------------------------------------------------- */}
      {activeTab === "accounting" && (
        <AccountingSection user={user} getAuthHeaders={getAdminAuthHeaders} />
      )}

      {/* -------------------------------------------------------------
          TAB: ACCOUNTING SUB-SECTIONS (Suppliers, Incomes, Expenses, Invoices)
          ------------------------------------------------------------- */}
      {activeTab === "accounting_suppliers" && (
        <SuppliersManager
          getAuthHeaders={getAdminAuthHeaders}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeTab === "accounting_incomes" && (
        <IncomesManager
          getAuthHeaders={getAdminAuthHeaders}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeTab === "accounting_expenses" && (
        <ExpensesManager
          getAuthHeaders={getAdminAuthHeaders}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeTab === "accounting_invoices" && (
        <InvoicesManager
          getAuthHeaders={getAdminAuthHeaders}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeTab === "accounting_banks" && (
        <BankManager
          getAuthHeaders={getAdminAuthHeaders}
          user={user}
        />
      )}

      {/* -------------------------------------------------------------
          TAB: CLOUD & INFRASTRUCTURE USAGE (Cloudinary, MongoDB, Render)
          ------------------------------------------------------------- */}
      {activeTab === "cloud_usage" && (
        <CloudUsageSection getAuthHeaders={getAdminAuthHeaders} />
      )}

      {/* -------------------------------------------------------------
          TAB: WEB TRAFFIC & VISITOR ANALYTICS (Google Analytics 4 API)
          ------------------------------------------------------------- */}
      {activeTab === "web_traffic" && (
        <WebTrafficSection
          getAuthHeaders={getAdminAuthHeaders}
          selectedProject={selectedProject}
        />
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
                  margin: 0,
                }}
              >
                Complete Your Profile
              </h2>
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

      {/* Modal: Worker Admin Profile & Handled Invoices */}
      {selectedWorkerAdminForDetail && (
        <div
          className="admin-modal-backdrop"
          onClick={() => {
            setSelectedWorkerAdminForDetail(null);
            setIsEditingDetailRoles(false);
          }}
        >
          <div
            className="worker-admin-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="worker-admin-detail-header">
              <div className="worker-header-profile">
                <div className="worker-modal-avatar">
                  {selectedWorkerAdminForDetail.name
                    ? selectedWorkerAdminForDetail.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : selectedWorkerAdminForDetail.identifier.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="worker-modal-name">
                    {selectedWorkerAdminForDetail.name || "Setup Pending"}
                  </h2>
                  <div className="worker-modal-sub">
                    <span className="worker-modal-email">
                      {selectedWorkerAdminForDetail.identifier}
                    </span>
                    <span className="worker-role-tag">
                      {selectedWorkerAdminForDetail.role === "worker_admin"
                        ? "Worker Admin"
                        : "Admin"}
                    </span>
                    <span
                      className={`status-pill ${
                        selectedWorkerAdminForDetail.status === "active"
                          ? "active"
                          : "inactive"
                      }`}
                      style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                    >
                      {selectedWorkerAdminForDetail.status === "active"
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isMaster && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteWorkerAdmin(
                        selectedWorkerAdminForDetail.id,
                        selectedWorkerAdminForDetail.identifier
                      )
                    }
                    disabled={isDeletingWorker}
                    className="worker-modal-delete-btn"
                    title="Delete Worker Admin Account"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      width="13"
                      height="13"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete User</span>
                  </button>
                )}

                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => {
                    setSelectedWorkerAdminForDetail(null);
                    setIsEditingDetailRoles(false);
                  }}
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Profile Info Bar */}
            <div className="worker-meta-bar" style={{ position: "relative", zIndex: 40 }}>
              <div className="worker-meta-item">
                <span className="meta-label">Phone</span>
                <span className="meta-val">
                  {selectedWorkerAdminForDetail.phone ||
                    selectedWorkerAdminForDetail.phoneNumber ||
                    "—"}
                </span>
              </div>
              <div className="worker-meta-item">
                <span className="meta-label">Location / Branch</span>
                <span className="meta-val">
                  {selectedWorkerAdminForDetail.location || "UAE Office"}
                </span>
              </div>
              <div className="worker-meta-item">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span className="meta-label">Last Login</span>
                  {isMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isEditingDetailRoles) {
                          handleStartEditDetailRoles();
                        } else {
                          setIsEditingDetailRoles(false);
                        }
                      }}
                      className="worker-meta-edit-icon-btn"
                      style={isEditingDetailRoles ? { backgroundColor: "#eff6ff", borderColor: "#2563eb", color: "#2563eb" } : undefined}
                      title={isEditingDetailRoles ? "Back to Details" : "Edit Roles & Permissions"}
                      aria-label="Edit Roles & Permissions"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        width="12"
                        height="12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                  )}
                </div>
                <span className="meta-val">
                  {selectedWorkerAdminForDetail.lastLoginAt
                    ? new Date(
                        selectedWorkerAdminForDetail.lastLoginAt
                      ).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "Never"}
                </span>
              </div>
            </div>

            {isEditingDetailRoles ? (
              <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                    Edit Roles & Permissions
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setDetailRolesDraft(AVAILABLE_ADMIN_MODULES.map((m) => m.id))}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Select All
                    </button>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <button
                      type="button"
                      onClick={() => setDetailRolesDraft([])}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#64748b",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="worker-role-list">
                  {AVAILABLE_ADMIN_MODULES.map((mod) => {
                    const isChecked = detailRolesDraft.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className="worker-role-list-item"
                        onClick={() => {
                          setDetailRolesDraft((prev) =>
                            isChecked
                              ? prev.filter((r) => r !== mod.id)
                              : [...prev, mod.id]
                          );
                        }}
                      >
                        <div className="role-info">
                          <span className="role-icon">{mod.icon}</span>
                          <span className="role-label">{mod.label}</span>
                        </div>

                        <div
                          role="switch"
                          aria-checked={isChecked}
                          className={`worker-role-toggle ${isChecked ? "active" : ""}`}
                        >
                          <div className="worker-role-toggle-thumb" />
                        </div>
                      </div>
                    );
                  })}

                  {/* Ability to Delete Data Option */}
                  <div
                    className="worker-role-list-item"
                    onClick={() => setDetailCanDeleteDraft((prev) => !prev)}
                  >
                    <div className="role-info">
                      <span className="role-icon">🗑️</span>
                      <span
                        className="role-label"
                        style={{ color: detailCanDeleteDraft ? "#dc2626" : "#1e293b" }}
                      >
                        Ability to Delete Data
                      </span>
                    </div>

                    <div
                      role="switch"
                      aria-checked={detailCanDeleteDraft}
                      className={`worker-role-toggle delete-toggle ${detailCanDeleteDraft ? "active" : ""}`}
                    >
                      <div className="worker-role-toggle-thumb" />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "10px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingDetailRoles(false)}
                    className="flat-secondary-btn"
                    disabled={isSavingDetailRoles}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDetailRoles}
                    className="capsule-btn-black"
                    disabled={isSavingDetailRoles}
                  >
                    {isSavingDetailRoles
                      ? "Saving..."
                      : detailSaveSuccessMsg
                      ? "✓ Saved"
                      : "Save Roles"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Invoices Statistics */}
            <div className="worker-stats-row">
              <div className="worker-stat-box">
                <span className="worker-stat-num">{workerInvoices.length}</span>
                <span className="worker-stat-desc">Invoices Handled</span>
              </div>
              <div className="worker-stat-box highlight">
                <span className="worker-stat-num">
                  AED{" "}
                  {workerInvoices
                    .reduce(
                      (acc, inv) =>
                        acc + Number(inv.financialSummary?.grossAmount || 0),
                      0
                    )
                    .toFixed(2)}
                </span>
                <span className="worker-stat-desc">Gross Billing Volume</span>
              </div>
              <div className="worker-stat-box green">
                <span className="worker-stat-num">
                  AED{" "}
                  {workerInvoices
                    .reduce(
                      (acc, inv) =>
                        acc + Number(inv.financialSummary?.paid || 0),
                      0
                    )
                    .toFixed(2)}
                </span>
                <span className="worker-stat-desc">Collections Received</span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="worker-invoices-section">
              <div className="worker-invoices-header">
                <div>
                  <h3 className="section-title">Invoices Handled by this Employee</h3>
                  <p className="text-muted" style={{ fontSize: "0.8rem", margin: "2px 0 0" }}>
                    Permanent accounting records from MongoDB matching this worker
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchWorkerInvoices(selectedWorkerAdminForDetail)}
                  className="client-invoices-refresh-btn"
                  title="Refresh Invoices from MongoDB"
                >
                  ↻
                </button>
              </div>

              {isLoadingWorkerInvoices ? (
                <div className="client-invoices-loading">
                  Loading employee invoices from MongoDB...
                </div>
              ) : workerInvoices.length === 0 ? (
                <div className="client-invoices-empty">
                  <p>No invoices handled by this employee yet.</p>
                  <span className="empty-subtext">
                    Invoices where this employee is selected in line items will be displayed here automatically.
                  </span>
                </div>
              ) : (
                <div className="client-invoices-table-container">
                  <table className="client-invoices-table">
                    <thead>
                      <tr>
                        <th style={{ width: "90px" }}>Invoice #</th>
                        <th style={{ width: "120px" }}>Date & Time</th>
                        <th>Customer</th>
                        <th>Services Handled</th>
                        <th style={{ width: "110px", textAlign: "right" }}>Gross (AED)</th>
                        <th style={{ width: "100px", textAlign: "right" }}>Paid (AED)</th>
                        <th style={{ width: "85px", textAlign: "center" }}>Status</th>
                        <th style={{ width: "95px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerInvoices.map((inv) => {
                        const gross = inv.financialSummary?.grossAmount || "0.00";
                        const paidAmt = inv.financialSummary?.paid || "0.00";
                        const bal = inv.financialSummary?.balance || "0.00";
                        const invStatus =
                          inv.status ||
                          (Number(bal) <= 0 && Number(gross) > 0
                            ? "paid"
                            : Number(paidAmt) > 0
                            ? "partial"
                            : "unpaid");

                        return (
                          <tr key={inv.id || inv._id}>
                            <td>
                              <span className="erp-inv-badge font-mono">
                                #{inv.invoiceNo}
                              </span>
                            </td>
                            <td className="text-muted" style={{ fontSize: "0.82rem" }}>
                              <div>{inv.invoiceDate}</div>
                              {inv.invoiceTime && (
                                <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                                  {inv.invoiceTime}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="font-semibold text-slate-800">
                                {inv.customer?.name || "Walk-in Customer"}
                              </div>
                              {inv.customer?.mobile && (
                                <div className="text-muted" style={{ fontSize: "0.76rem" }}>
                                  📞 {inv.customer.mobile}
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: "0.84rem", color: "#334155" }}>
                                {inv.lineItems && inv.lineItems.length > 0 ? (
                                  <span>
                                    {inv.lineItems[0].description}
                                    {inv.lineItems.length > 1 && (
                                      <span className="erp-more-items-tag">
                                        +{inv.lineItems.length - 1} more
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted">General Service</span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                              {gross}
                            </td>
                            <td style={{ textAlign: "right", color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
                              {paidAmt}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`erp-status-pill status-${invStatus}`}>
                                {invStatus}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => setActivePrintInvoice(inv)}
                                className="client-invoice-print-btn"
                                title="Print Invoice"
                              >
                                🖨️ Print
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
      )}

      {/* Printable Invoice Modal for Worker Admin */}
      {activePrintInvoice && (
        <PrintableInvoiceModal
          invoice={activePrintInvoice}
          onClose={() => setActivePrintInvoice(null)}
        />
      )}
    </main>
  );
}
