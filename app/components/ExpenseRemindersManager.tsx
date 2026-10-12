"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface ExpenseReminderItem {
  _id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  expiryDate: string;
  targetEmail: string;
  targetPhone?: string;
  notes?: string;
  recurrence: "one_time" | "monthly" | "quarterly" | "yearly";
  status: "active" | "renewed" | "cancelled";
  remindersSent: {
    weekBefore: boolean;
    threeDaysBefore: boolean;
    twoDaysBefore: boolean;
    dayOf: boolean;
  };
  lastNotifiedAt?: string;
  daysRemaining: number;
  urgency: "critical" | "urgent" | "upcoming" | "normal";
  createdAt: string;
}

export interface ReminderStats {
  totalActive: number;
  dueTodayOrOverdue: number;
  urgentTwoDays: number;
  warningWeek: number;
  totalActiveExpenditure: number;
}

export interface ExpenseReminderLogItem {
  _id: string;
  reminderId?: string;
  title: string;
  recipientEmail: string;
  category?: string;
  amount?: number;
  triggerStage: string;
  daysRemaining: number;
  status: "sent" | "failed";
  resendEmailId?: string;
  errorMessage?: string;
  sentAt: string;
  triggeredBy: "cron" | "admin";
}

interface ExpenseRemindersManagerProps {
  getAuthHeaders?: () => Record<string, string>;
  onNavigateTab?: (tab: any) => void;
}

export default function ExpenseRemindersManager({
  getAuthHeaders,
}: ExpenseRemindersManagerProps) {
  let user: any = null;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("abc_admin_user") : null;
    if (raw) user = JSON.parse(raw);
  } catch {}

  const isMaster =
    user?.role === "master_admin" ||
    user?.role === "superadmin" ||
    user?.identifier === "masteradmin@abc.com";
  const canDeleteData = isMaster || user?.canDeleteData !== false;

  const [activeViewTab, setActiveViewTab] = useState<"reminders" | "logs">("reminders");

  const [reminders, setReminders] = useState<ExpenseReminderItem[]>([]);
  const [stats, setStats] = useState<ReminderStats>({
    totalActive: 0,
    dueTodayOrOverdue: 0,
    urgentTwoDays: 0,
    warningWeek: 0,
    totalActiveExpenditure: 0,
  });

  const [logs, setLogs] = useState<ExpenseReminderLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Cron execution state
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseReminderItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Telecom");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("AED");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formTargetEmail, setFormTargetEmail] = useState(user?.identifier || "");
  const [formTargetPhone, setFormTargetPhone] = useState("");
  const [formRecurrence, setFormRecurrence] = useState<"one_time" | "monthly" | "quarterly" | "yearly">("monthly");
  const [formNotes, setFormNotes] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  const getHeaders = useCallback((): Record<string, string> => {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    if (getAuthHeaders) {
      headers = { ...headers, ...getAuthHeaders() };
    }
    if (!headers.Authorization && typeof window !== "undefined") {
      const token = localStorage.getItem("abc_admin_token") || localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [getAuthHeaders]);

  // Fetch reminders
  const fetchReminders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterCategory !== "all") params.append("category", filterCategory);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`${API_BASE_URL}/api/v1/admin/expense-reminders?${params.toString()}`, {
        headers: getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to load expense reminders: ${res.status}`);
      }

      const json = await res.json();
      if (json.status === "success" && json.data) {
        setReminders(json.data.reminders || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load reminders from database");
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterCategory, searchQuery, getHeaders]);

  // Fetch email delivery logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/expense-reminders/logs`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data?.logs || []);
      }
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchReminders();
    fetchLogs();
  }, [fetchReminders, fetchLogs]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormCategory("Telecom");
    setFormAmount("");
    setFormCurrency("AED");

    // Default expiry 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormExpiryDate(d.toISOString().slice(0, 10));

    setFormTargetEmail(user?.identifier || "");
    setFormTargetPhone("");
    setFormRecurrence("monthly");
    setFormNotes("");
    setModalError("");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (item: ExpenseReminderItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormAmount(item.amount ? item.amount.toString() : "");
    setFormCurrency(item.currency || "AED");
    setFormExpiryDate(new Date(item.expiryDate).toISOString().slice(0, 10));
    setFormTargetEmail(item.targetEmail);
    setFormTargetPhone(item.targetPhone || "");
    setFormRecurrence(item.recurrence);
    setFormNotes(item.notes || "");
    setModalError("");
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formExpiryDate || !formTargetEmail.trim()) {
      setModalError("Please enter item title, expiry date, and recipient email.");
      return;
    }

    setIsSaving(true);
    setModalError("");
    try {
      const payload = {
        title: formTitle.trim(),
        category: formCategory.trim(),
        amount: Number(formAmount) || 0,
        currency: formCurrency,
        expiryDate: new Date(formExpiryDate).toISOString(),
        targetEmail: formTargetEmail.trim().toLowerCase(),
        targetPhone: formTargetPhone.trim(),
        recurrence: formRecurrence,
        notes: formNotes.trim(),
      };

      const url = editingItem
        ? `${API_BASE_URL}/api/v1/admin/expense-reminders/${editingItem._id}`
        : `${API_BASE_URL}/api/v1/admin/expense-reminders`;

      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to save reminder in database");
      }

      setIsModalOpen(false);
      showToast(editingItem ? "Reminder updated successfully" : "Expense reminder added successfully");
      fetchReminders();
    } catch (err: any) {
      setModalError(err.message || "Error saving reminder");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the reminder for "${title}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/expense-reminders/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete reminder");
      showToast(`Reminder for "${title}" deleted`);
      fetchReminders();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  // Mark Renewed
  const handleMarkRenewed = async (item: ExpenseReminderItem) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/expense-reminders/${item._id}/renew`, {
        method: "PATCH",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to renew reminder");
      const json = await res.json();
      const nextDate = new Date(json.data.reminder.expiryDate).toLocaleDateString("en-GB");
      showToast(`"${item.title}" renewed! Next expiry: ${nextDate}`);
      fetchReminders();
    } catch (err: any) {
      alert(err.message || "Failed to renew");
    }
  };

  // Send Test Email
  const handleSendTestEmail = async (item: ExpenseReminderItem) => {
    try {
      showToast(`Sending test email for "${item.title}" to ${item.targetEmail}...`);
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/expense-reminders/${item._id}/test-email`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to send test email");
      }
      showToast(`✓ Test reminder email sent to ${item.targetEmail}! Check inbox.`);
      fetchLogs();
    } catch (err: any) {
      alert(`Test Email Failed: ${err.message}`);
      fetchLogs();
    }
  };

  // Trigger Cron Check Now
  const handleTriggerCronNow = async () => {
    setIsTriggeringCron(true);
    setCronResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/expense-reminders/cron-check`, {
        method: "POST",
        headers: getHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to trigger cron");

      const count = json.data?.dispatchedCount || 0;
      setCronResult(
        `✓ Scan executed! Evaluated ${json.data?.totalEvaluated || 0} items. Sent ${count} reminder email(s).`
      );
      showToast(`Reminder scan complete: ${count} email(s) sent.`);
      fetchReminders();
      fetchLogs();
    } catch (err: any) {
      setCronResult(`✕ Scan failed: ${err.message}`);
    } finally {
      setIsTriggeringCron(false);
    }
  };

  const formatStageLabel = (stage: string) => {
    switch (stage) {
      case "week_before":
        return "1 Week Before (7d)";
      case "3_days":
        return "3 Days Notice";
      case "2_days":
        return "2 Days Notice (Urgent)";
      case "day_of":
        return "Expiry Day (0d)";
      case "test_email":
        return "Direct Test Email";
      default:
        return stage.replace("_", " ");
    }
  };

  const getCategoryAvatar = (title: string, cat: string) => {
    if (cat === "Telecom") return { text: "SIM", bg: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" };
    if (cat === "Cloud Hosting") return { text: "AWS", bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" };
    if (cat === "Domain Renewal") return { text: "DOM", bg: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" };
    if (cat === "Utilities") return { text: "UTL", bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)" };
    if (cat === "Trade License") return { text: "LIC", bg: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" };
    return {
      text: title ? title.slice(0, 2).toUpperCase() : "EX",
      bg: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    };
  };

  return (
    <div className="expenses-manager-container" style={{ width: "100%" }}>
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 9999,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🔔</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sub-tab navigation: Matches Worker Admins & Website Edit */}
      <div className="worker-admin-subtabs">
        <button
          type="button"
          className={`worker-admin-subtab-btn ${activeViewTab === "reminders" ? "active" : ""}`}
          onClick={() => setActiveViewTab("reminders")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Reminders</span>
        </button>

        <button
          type="button"
          className={`worker-admin-subtab-btn ${activeViewTab === "logs" ? "active" : ""}`}
          onClick={() => {
            setActiveViewTab("logs");
            fetchLogs();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Delivery Logs</span>
        </button>
      </div>

      {/* Header Row: Matches standard content-header-row across all sections */}
      <div className="content-header-row" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="content-title">
            {activeViewTab === "reminders" ? "Expense Reminders" : "Email Delivery Logs"}
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {activeViewTab === "reminders" ? (
            <>
              {/* Scan & Trigger Button */}
              <button
                type="button"
                onClick={handleTriggerCronNow}
                disabled={isTriggeringCron}
                className="flat-secondary-btn"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "38px" }}
                title="Scan approaching expiries and send reminder emails now"
              >
                <span>{isTriggeringCron ? "⏳" : "⚡"}</span>
                <span>{isTriggeringCron ? "Scanning..." : "Scan & Trigger Now"}</span>
              </button>

              {/* Add Reminder Capsule Button */}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="capsule-btn-black"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Reminder</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={fetchLogs}
              disabled={logsLoading}
              className="flat-secondary-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "38px" }}
            >
              <span>🔄</span>
              <span>{logsLoading ? "Refreshing..." : "Refresh Logs"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Cron Result Notification Banner */}
      {cronResult && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 16px",
            borderRadius: "8px",
            backgroundColor: cronResult.startsWith("✓") ? "#ecfdf5" : "#fef2f2",
            border: cronResult.startsWith("✓") ? "1px solid #a7f3d0" : "1px solid #fecaca",
            color: cronResult.startsWith("✓") ? "#065f46" : "#991b1b",
            fontSize: "0.85rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{cronResult}</span>
          <button
            type="button"
            onClick={() => setCronResult(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Bar matching other admin sections */}
      {activeViewTab === "reminders" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <div className="clients-search-box" style={{ maxWidth: "320px", width: "100%", margin: 0 }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="clients-search-input"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: ACTIVE REMINDERS TABLE */}
      {activeViewTab === "reminders" && (
        <div className="admin-table-container worker-admins-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <span className="th-inner">Item &amp; Category</span>
                </th>
                <th>
                  <span className="th-inner">Recurrence</span>
                </th>
                <th style={{ textAlign: "right" }}>
                  <span className="th-inner">Amount</span>
                </th>
                <th>
                  <span className="th-inner">Expiry Date</span>
                </th>
                <th>
                  <span className="th-inner">Countdown</span>
                </th>
                <th>
                  <span className="th-inner">Recipient Email</span>
                </th>
                <th>
                  <span className="th-inner">Stages (7d • 3d • 2d • 0d)</span>
                </th>
                <th style={{ textAlign: "right", width: "180px" }}>
                  <span className="th-inner">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="empty-admin-cell">
                    Loading expense reminders from MongoDB database...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-admin-cell">
                    {error ? error : 'No expense reminders found. Click "+ Add Reminder" above to register one.'}
                  </td>
                </tr>
              ) : (
                reminders.map((item) => {
                  const expiryObj = new Date(item.expiryDate);
                  const formattedDate = expiryObj.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  const avatar = getCategoryAvatar(item.title, item.category);

                  // Urgency badge styling
                  let urgencyBg = "#f1f5f9";
                  let urgencyColor = "#475569";
                  let urgencyText = `In ${item.daysRemaining}d`;

                  if (item.daysRemaining <= 0) {
                    urgencyBg = "#fee2e2";
                    urgencyColor = "#dc2626";
                    urgencyText = item.daysRemaining === 0 ? "⚠️ Due Today" : `⚠️ Overdue (${Math.abs(item.daysRemaining)}d)`;
                  } else if (item.daysRemaining <= 2) {
                    urgencyBg = "#fee2e2";
                    urgencyColor = "#dc2626";
                    urgencyText = `🚨 In ${item.daysRemaining}d`;
                  } else if (item.daysRemaining <= 3) {
                    urgencyBg = "#fef3c7";
                    urgencyColor = "#b45309";
                    urgencyText = `⏳ In 3d`;
                  } else if (item.daysRemaining <= 7) {
                    urgencyBg = "#dbeafe";
                    urgencyColor = "#1e40af";
                    urgencyText = `🗓️ In ${item.daysRemaining}d`;
                  }

                  return (
                    <tr key={item._id} className="worker-admin-clickable-row">
                      {/* Item Cell with Avatar and Details */}
                      <td>
                        <div className="admin-user-cell">
                          <div
                            className="admin-avatar-photo"
                            style={{
                              background: avatar.bg,
                              color: "#ffffff",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                            }}
                          >
                            {avatar.text}
                          </div>
                          <div className="admin-user-info">
                            <span className="admin-user-name">{item.title}</span>
                            <span className="admin-user-email">
                              {item.category} {item.notes ? `• ${item.notes.slice(0, 30)}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Recurrence */}
                      <td>
                        <span className="setup-pill completed" style={{ background: "#f8fafc", color: "#475569" }}>
                          {item.recurrence.replace("_", " ")}
                        </span>
                      </td>

                      {/* Amount */}
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                        {item.currency} {Number(item.amount).toFixed(2)}
                      </td>

                      {/* Expiry Date */}
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 500 }}>
                          {formattedDate}
                        </span>
                      </td>

                      {/* Urgency Countdown Pill */}
                      <td>
                        <span
                          className="setup-pill"
                          style={{
                            backgroundColor: urgencyBg,
                            color: urgencyColor,
                            fontWeight: 700,
                          }}
                        >
                          {urgencyText}
                        </span>
                      </td>

                      {/* Recipient Email */}
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "#0284c7" }}>
                          {item.targetEmail}
                        </span>
                      </td>

                      {/* Stages Dispatched (7d, 3d, 2d, 0d) */}
                      <td>
                        <div style={{ display: "flex", gap: "4px", fontSize: "0.72rem", fontWeight: 700 }}>
                          <span
                            title="7-Day Reminder"
                            style={{
                              padding: "2px 5px",
                              borderRadius: "4px",
                              backgroundColor: item.remindersSent.weekBefore ? "#dcfce7" : "#f1f5f9",
                              color: item.remindersSent.weekBefore ? "#15803d" : "#94a3b8",
                            }}
                          >
                            7d {item.remindersSent.weekBefore ? "✓" : "⏳"}
                          </span>
                          <span
                            title="3-Day Reminder"
                            style={{
                              padding: "2px 5px",
                              borderRadius: "4px",
                              backgroundColor: item.remindersSent.threeDaysBefore ? "#dcfce7" : "#f1f5f9",
                              color: item.remindersSent.threeDaysBefore ? "#15803d" : "#94a3b8",
                            }}
                          >
                            3d {item.remindersSent.threeDaysBefore ? "✓" : "⏳"}
                          </span>
                          <span
                            title="2-Day Reminder"
                            style={{
                              padding: "2px 5px",
                              borderRadius: "4px",
                              backgroundColor: item.remindersSent.twoDaysBefore ? "#dcfce7" : "#f1f5f9",
                              color: item.remindersSent.twoDaysBefore ? "#15803d" : "#94a3b8",
                            }}
                          >
                            2d {item.remindersSent.twoDaysBefore ? "✓" : "⏳"}
                          </span>
                          <span
                            title="Day of Expiry Reminder"
                            style={{
                              padding: "2px 5px",
                              borderRadius: "4px",
                              backgroundColor: item.remindersSent.dayOf ? "#dcfce7" : "#f1f5f9",
                              color: item.remindersSent.dayOf ? "#15803d" : "#94a3b8",
                            }}
                          >
                            0d {item.remindersSent.dayOf ? "✓" : "⏳"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          {/* Renew Button */}
                          <button
                            type="button"
                            onClick={() => handleMarkRenewed(item)}
                            title="Mark renewed for next period"
                            className="flat-secondary-btn"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", height: "28px", color: "#166534", borderColor: "#86efac" }}
                          >
                            ↻ Renew
                          </button>

                          {/* Test Email Button */}
                          <button
                            type="button"
                            onClick={() => handleSendTestEmail(item)}
                            title="Send immediate test email to recipient"
                            className="flat-secondary-btn"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", height: "28px" }}
                          >
                            ✉️ Test
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="table-action-btn edit"
                            title="Edit reminder"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          {canDeleteData && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item._id, item.title)}
                              className="table-action-btn delete"
                              title="Delete reminder"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      )}

      {/* VIEW 2: DELIVERY LOGS TABLE */}
      {activeViewTab === "logs" && (
        <div className="admin-table-container worker-admins-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <span className="th-inner">Timestamp</span>
                </th>
                <th>
                  <span className="th-inner">Delivery Status</span>
                </th>
                <th>
                  <span className="th-inner">Expense Item</span>
                </th>
                <th>
                  <span className="th-inner">Stage Reason</span>
                </th>
                <th>
                  <span className="th-inner">Recipient Email</span>
                </th>
                <th>
                  <span className="th-inner">Trigger Method</span>
                </th>
                <th style={{ textAlign: "right" }}>
                  <span className="th-inner">Resend Message ID / Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={7} className="empty-admin-cell">
                    Loading delivery logs from MongoDB...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-admin-cell">
                    No email notification logs recorded yet. Reminders triggered by the daily cron or test button will be audited here.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const logDate = new Date(log.sentAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return (
                    <tr key={log._id} className="worker-admin-clickable-row">
                      <td style={{ color: "#475569", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                        {logDate}
                      </td>
                      <td>
                        <span className={`setup-pill ${log.status === "sent" ? "completed" : "pending"}`}>
                          {log.status === "sent" ? "✓ Sent" : "✕ Failed"}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>
                        {log.title}
                      </td>
                      <td>
                        <span className="setup-pill" style={{ background: "#f1f5f9", color: "#334155" }}>
                          {formatStageLabel(log.triggerStage)}
                        </span>
                      </td>
                      <td style={{ color: "#0284c7", fontSize: "0.84rem" }}>
                        {log.recipientEmail}
                      </td>
                      <td style={{ color: "#64748b", fontSize: "0.82rem", textTransform: "capitalize" }}>
                        {log.triggeredBy === "cron" ? "🤖 Automated Cron" : "👤 Admin Manual"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontSize: "0.8rem", color: log.status === "failed" ? "#dc2626" : "#64748b" }}>
                        {log.status === "failed" ? log.errorMessage : log.resendEmailId ? `id: ${log.resendEmailId}` : "Delivered"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL: Formatted exactly like other admin modals in dashboard.css */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-box"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingItem ? "Edit Expense Reminder" : "+ Add Expense Reminder"}
              </h2>
              <button
                type="button"
                className="admin-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {modalError && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 6, fontSize: "0.84rem", marginBottom: 12 }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveReminder} className="admin-modal-form">
              {/* Item Title */}
              <div className="admin-form-field">
                <label className="admin-form-label">Item / Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Airtel SIM Recharge, AWS Server, Trade License"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="admin-form-input"
                />
              </div>

              {/* Category & Recurrence */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="admin-form-field">
                  <label className="admin-form-label">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="admin-form-input"
                    style={{ padding: "0 10px" }}
                  >
                    <option value="Telecom">Telecom / SIM</option>
                    <option value="Cloud Hosting">Cloud Hosting &amp; Servers</option>
                    <option value="Domain Renewal">Domain Renewal</option>
                    <option value="Software Subscription">Software / SaaS</option>
                    <option value="Utilities">Office Utilities</option>
                    <option value="Trade License">Trade License</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Recurrence</label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value as any)}
                    className="admin-form-input"
                    style={{ padding: "0 10px" }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="one_time">One-time Expiry</option>
                  </select>
                </div>
              </div>

              {/* Cost & Expiry Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="admin-form-field">
                  <label className="admin-form-label">Cost / Amount ({formCurrency})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 150"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="admin-form-input"
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="admin-form-input"
                  />
                </div>
              </div>

              {/* Quick Presets for Date */}
              <div className="timer-presets-row" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -4 }}>
                <span className="presets-label" style={{ fontSize: "0.75rem", color: "#64748b" }}>Quick set:</span>
                <button
                  type="button"
                  className="preset-pill-btn"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setFormExpiryDate(d.toISOString().slice(0, 10));
                  }}
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  className="preset-pill-btn"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setFormExpiryDate(d.toISOString().slice(0, 10));
                  }}
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  className="preset-pill-btn"
                  onClick={() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    setFormExpiryDate(d.toISOString().slice(0, 10));
                  }}
                >
                  +1 Year
                </button>
              </div>

              {/* Target Email (Recipient) */}
              <div className="admin-form-field">
                <label className="admin-form-label">Recipient Email *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={formTargetEmail}
                  onChange={(e) => setFormTargetEmail(e.target.value)}
                  className="admin-form-input"
                />
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Automated notifications dispatch to this inbox at 7d, 3d, 2d, and expiry day via Resend.
                </span>
              </div>

              {/* Notes */}
              <div className="admin-form-field">
                <label className="admin-form-label">Notes / Renewal Account Details</label>
                <input
                  type="text"
                  placeholder="Account number, renewal link, portal login hints..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="admin-form-input"
                />
              </div>

              {/* Action Buttons */}
              <div className="admin-modal-actions" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-link-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="capsule-btn-black"
                >
                  {isSaving ? "Saving to Database..." : editingItem ? "Update Reminder" : "Save Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
