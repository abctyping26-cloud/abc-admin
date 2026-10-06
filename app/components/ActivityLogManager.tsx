"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { API_BASE_URL } from "../config/api";

export interface UnifiedActivityItem {
  id: string;
  category: "invoices" | "whatsapp_files" | "admins" | "enquiries" | "expenses";
  action: string;
  title: string;
  description: string;
  actorName: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ActivityStats {
  invoicesToday: number;
  waFilesToday: number;
  enquiriesToday: number;
  totalAdmins: number;
}

interface ActivityLogManagerProps {
  isMaster?: boolean;
}

type ActivityCategory =
  | "all"
  | "invoices"
  | "whatsapp_files"
  | "admins"
  | "enquiries"
  | "expenses";

interface RawInvoiceRecord {
  id?: string;
  _id?: string;
  invoiceNo?: string;
  customer?: { name?: string; mobile?: string };
  financialSummary?: { grandTotal?: string; total?: string };
  salesMan?: string;
  status?: string;
  createdAt?: string;
  invoiceDate?: string;
}

interface RawWorkerRecord {
  id?: string;
  _id?: string;
  identifier?: string;
  name?: string;
  phone?: string;
  role?: string;
  assignedRoles?: string[];
  createdAt?: string;
}

interface RawEnquiryRecord {
  id?: string;
  _id?: string;
  name?: string;
  phone?: string;
  service?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
}

interface RawExpenseRecord {
  id?: string;
  _id?: string;
  expenseNo?: string;
  title?: string;
  amount?: string;
  category?: string;
  supplier?: string;
  createdAt?: string;
}

interface RawConversationRecord {
  _id?: string;
  customerPhone?: string;
  customerName?: string;
  lastMessage?: string;
  lastMessageType?: string;
  totalMessages?: number;
  lastTimestamp?: string;
  firstTimestamp?: string;
}

export default function ActivityLogManager({ isMaster = true }: ActivityLogManagerProps) {
  const [items, setItems] = useState<UnifiedActivityItem[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [category, setCategory] = useState<ActivityCategory>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<UnifiedActivityItem | null>(null);
  const [, startTransition] = useTransition();

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("abc_admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, []);

  // Client-side fallback aggregator if /api/v1/admin/activities is not deployed yet to Render
  const fallbackAggregateFromLiveEndpoints = useCallback(
    async (cat: ActivityCategory, query: string): Promise<UnifiedActivityItem[]> => {
      const headers = getAuthHeaders();
      const collected: UnifiedActivityItem[] = [];
      const q = query.toLowerCase().trim();

      const promises: Promise<void>[] = [];

      // 1. Invoices
      if (cat === "all" || cat === "invoices") {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices`, { headers });
              if (res.ok) {
                const json = await res.json();
                const invs: RawInvoiceRecord[] = json.data?.invoices || [];
                for (const inv of invs) {
                  const invNo = inv.invoiceNo || inv.id || "N/A";
                  const client = inv.customer?.name || "Client";
                  const total = inv.financialSummary?.grandTotal || inv.financialSummary?.total || "0.00";
                  collected.push({
                    id: `inv_${inv.id || inv._id || invNo}`,
                    category: "invoices",
                    action: "invoice_created",
                    title: `Invoice #${invNo} created`,
                    description: `Issued for ${client} • Total AED ${total}`,
                    actorName: inv.salesMan || "Accountant",
                    timestamp: inv.createdAt || inv.invoiceDate || new Date().toISOString(),
                    metadata: {
                      invoiceNo: invNo,
                      customerName: client,
                      customerMobile: inv.customer?.mobile,
                      grandTotal: total,
                      salesMan: inv.salesMan,
                      status: inv.status,
                    },
                  });
                }
              }
            } catch {}
          })()
        );
      }

      // 2. Worker Admins
      if (cat === "all" || cat === "admins") {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/v1/admin/workers`, { headers });
              if (res.ok) {
                const json = await res.json();
                const workers: RawWorkerRecord[] = json.data?.workers || [];
                for (const w of workers) {
                  collected.push({
                    id: `adm_${w.id || w._id || w.identifier}`,
                    category: "admins",
                    action: "admin_created",
                    title: `Admin Account: ${w.name || w.identifier}`,
                    description: `Role: ${w.role || "worker_admin"} • Roles: ${(w.assignedRoles || []).join(", ") || "General"}`,
                    actorName: "Master Admin",
                    timestamp: w.createdAt || new Date().toISOString(),
                    metadata: {
                      identifier: w.identifier,
                      name: w.name,
                      phone: w.phone,
                      role: w.role,
                      assignedRoles: w.assignedRoles,
                    },
                  });
                }
              }
            } catch {}
          })()
        );
      }

      // 3. Enquiries
      if (cat === "all" || cat === "enquiries") {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/v1/admin/enquiries`, { headers });
              if (res.ok) {
                const json = await res.json();
                const enqs: RawEnquiryRecord[] = json.data?.enquiries || [];
                for (const e of enqs) {
                  collected.push({
                    id: `enq_${e.id || e._id}`,
                    category: "enquiries",
                    action: "enquiry_received",
                    title: `Enquiry from ${e.name || "Customer"}`,
                    description: `Service: ${e.service || "General Inquiry"} • Status: ${e.status || "pending"}`,
                    actorName: e.name || e.phone || "Web Lead",
                    timestamp: e.createdAt || new Date().toISOString(),
                    metadata: {
                      name: e.name,
                      phone: e.phone,
                      service: e.service,
                      status: e.status,
                      notes: e.notes,
                    },
                  });
                }
              }
            } catch {}
          })()
        );
      }

      // 4. Expenses
      if (cat === "all" || cat === "expenses") {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/expenses`, { headers });
              if (res.ok) {
                const json = await res.json();
                const exps: RawExpenseRecord[] = json.data?.expenses || [];
                for (const exp of exps) {
                  collected.push({
                    id: `exp_${exp.id || exp._id}`,
                    category: "expenses",
                    action: "expense_recorded",
                    title: `Expense #${exp.expenseNo || exp.title || "Record"}`,
                    description: `Amount: AED ${exp.amount || "0.00"} • Category: ${exp.category || "General"}`,
                    actorName: "Accountant",
                    timestamp: exp.createdAt || new Date().toISOString(),
                    metadata: {
                      expenseNo: exp.expenseNo,
                      title: exp.title,
                      amount: exp.amount,
                      category: exp.category,
                      supplier: exp.supplier,
                    },
                  });
                }
              }
            } catch {}
          })()
        );
      }

      // 5. WhatsApp Conversations
      if (cat === "all" || cat === "whatsapp_files") {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`${API_BASE_URL}/api/v1/admin/whatsapp/conversations`, { headers });
              if (res.ok) {
                const json = await res.json();
                const convs: RawConversationRecord[] = json.data?.conversations || [];
                for (const c of convs) {
                  const isFile = Boolean(c.lastMessageType && ["image", "document", "audio", "video"].includes(c.lastMessageType));
                  if (cat === "whatsapp_files" && !isFile) continue;

                  collected.push({
                    id: `wa_${c._id || c.customerPhone}`,
                    category: "whatsapp_files",
                    action: isFile ? "whatsapp_file_received" : "whatsapp_chat",
                    title: isFile ? `WhatsApp File: ${c.lastMessageType}` : `WhatsApp Message from ${c.customerName || c.customerPhone}`,
                    description: `${c.lastMessage || "WhatsApp Interaction"} (${c.customerPhone})`,
                    actorName: c.customerName || c.customerPhone || "Customer",
                    timestamp: c.lastTimestamp || c.firstTimestamp || new Date().toISOString(),
                    metadata: {
                      customerPhone: c.customerPhone,
                      customerName: c.customerName,
                      lastMessage: c.lastMessage,
                      type: c.lastMessageType,
                      totalMessages: c.totalMessages,
                    },
                  });
                }
              }
            } catch {}
          })()
        );
      }

      await Promise.all(promises);

      // Filter by search query
      let filtered = collected;
      if (q) {
        filtered = collected.filter((item) => {
          return (
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.actorName.toLowerCase().includes(q)
          );
        });
      }

      // Sort descending by timestamp
      filtered.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Compute stats
      const today = new Date().toDateString();
      const invoicesToday = collected.filter(
        (x) => x.category === "invoices" && new Date(x.timestamp).toDateString() === today
      ).length;
      const waFilesToday = collected.filter(
        (x) => x.category === "whatsapp_files" && new Date(x.timestamp).toDateString() === today
      ).length;
      const enquiriesToday = collected.filter(
        (x) => x.category === "enquiries" && new Date(x.timestamp).toDateString() === today
      ).length;
      const totalAdmins = collected.filter((x) => x.category === "admins").length;

      setStats({
        invoicesToday,
        waFilesToday,
        enquiriesToday,
        totalAdmins: totalAdmins > 0 ? totalAdmins : 1,
      });

      return filtered;
    },
    [getAuthHeaders]
  );

  // Main data loader (tries /api/v1/admin/activities first, falls back to direct live collections)
  const loadData = useCallback(
    async (cat: ActivityCategory, query: string, cursor?: string | null) => {
      const isInitial = !cursor;
      if (isInitial) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", "25");
        if (cat !== "all") params.set("category", cat);
        if (query.trim()) params.set("search", query.trim());
        if (cursor) params.set("before", cursor);

        const res = await fetch(`${API_BASE_URL}/api/v1/admin/activities?${params.toString()}`, {
          headers: getAuthHeaders(),
        });

        if (res.ok) {
          const json = await res.json();
          const fetchedItems: UnifiedActivityItem[] = json.data?.items || [];
          const fetchedCursor: string | null = json.data?.nextCursor || null;

          if (isInitial) {
            setItems(fetchedItems);
          } else {
            setItems((prev) => [...prev, ...fetchedItems]);
          }
          setNextCursor(fetchedCursor);

          // Also fetch backend stats
          try {
            const statsRes = await fetch(`${API_BASE_URL}/api/v1/admin/activities/stats`, {
              headers: getAuthHeaders(),
            });
            if (statsRes.ok) {
              const statsJson = await statsRes.json();
              if (statsJson.data) setStats(statsJson.data);
            }
          } catch {}
          return;
        }

        // If endpoint returned 404/500 (e.g. pending Render deploy), fallback
        const fallbackItems = await fallbackAggregateFromLiveEndpoints(cat, query);
        setItems(fallbackItems);
        setNextCursor(null);
      } catch (err) {
        console.warn("Activities endpoint fallback initiated:", err);
        const fallbackItems = await fallbackAggregateFromLiveEndpoints(cat, query);
        setItems(fallbackItems);
        setNextCursor(null);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [getAuthHeaders, fallbackAggregateFromLiveEndpoints]
  );

  // Trigger initial fetch when category or search changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isMounted) {
        await loadData(category, search);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [category, search, loadData]);

  // Handle Search Input submit / debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setSearch(searchInput);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleRefresh = () => {
    loadData(category, search);
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoadingMore) {
      loadData(category, search, nextCursor);
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "invoices":
        return "activity-badge activity-badge-invoices";
      case "whatsapp_files":
        return "activity-badge activity-badge-whatsapp_files";
      case "admins":
        return "activity-badge activity-badge-admins";
      case "enquiries":
        return "activity-badge activity-badge-enquiries";
      case "expenses":
        return "activity-badge activity-badge-expenses";
      default:
        return "activity-badge";
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "invoices":
        return "Invoice";
      case "whatsapp_files":
        return "WhatsApp";
      case "admins":
        return "Admin";
      case "enquiries":
        return "Enquiry";
      case "expenses":
        return "Expense";
      default:
        return "Activity";
    }
  };

  if (!isMaster) {
    return (
      <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Access restricted. The Activity Log is reserved for Master Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="activity-log-container">
      {/* Header Row */}
      <div className="content-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h1 className="content-title" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "20px", height: "20px", flexShrink: 0 }}
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Activity Log & Audit Trail
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Real-time chronological timeline of all activities, invoices, incoming WhatsApp files, and admin actions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="capsule-btn-black"
          style={{ cursor: isLoading ? "wait" : "pointer" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: "14px", height: "14px", flexShrink: 0, animation: isLoading ? "spin 1s linear infinite" : "none" }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>{isLoading ? "Refreshing..." : "Refresh Feed"}</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      {stats && (
        <div className="activity-stat-grid">
          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">Invoices Today</span>
              <div className="stat-card-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1e293b" }}>
              {stats.invoicesToday}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">WhatsApp Today</span>
              <div className="stat-card-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1e293b" }}>
              {stats.waFilesToday}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">Enquiries Today</span>
              <div className="stat-card-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1e293b" }}>
              {stats.enquiriesToday}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span className="stat-card-label">Admin Accounts</span>
              <div className="stat-card-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
            </div>
            <div className="stat-card-value" style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1e293b" }}>
              {stats.totalAdmins}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar & Search Box */}
      <div className="activity-filter-bar">
        <div className="activity-filter-pills">
          {(
            [
              { key: "all", label: "All Activities" },
              { key: "invoices", label: "Invoices" },
              { key: "whatsapp_files", label: "WhatsApp" },
              { key: "admins", label: "Admin Accounts" },
              { key: "enquiries", label: "Enquiries" },
              { key: "expenses", label: "Expenses" },
            ] as const
          ).map((tab) => {
            const isActive = category === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategory(tab.key)}
                className={`activity-pill-btn ${isActive ? "active" : ""}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="clients-search-box" style={{ maxWidth: "260px", width: "100%", margin: 0 }}>
          <svg
            className="search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ width: "14px", height: "14px", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="clients-search-input"
            placeholder="Search activities..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchInput("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Activity List Container */}
      <div className="activity-list-card">
        {isLoading ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                width: "28px",
                height: "28px",
                border: "3px solid #2563eb",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ margin: "10px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Loading recent activities...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "#f1f5f9",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                marginBottom: "10px",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "22px", height: "22px" }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 style={{ margin: "0", fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
              No activities found
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              {search ? "No records matched your search query." : "Activities will appear here as records are created."}
            </p>
          </div>
        ) : (
          <div>
            {items.map((item) => {
              const isWaFile = item.category === "whatsapp_files";
              const mediaUrl = typeof item.metadata?.mediaUrl === "string" ? item.metadata.mediaUrl : null;
              const mediaFileName = typeof item.metadata?.mediaFileName === "string" ? item.metadata.mediaFileName : "File";

              return (
                <div key={item.id} className="activity-item-row">
                  <div className="activity-item-left">
                    <span className={getCategoryBadgeClass(item.category)}>
                      {getCategoryLabel(item.category)}
                    </span>

                    <div className="activity-item-content">
                      <div className="activity-item-title-row">
                        <span className="activity-item-title">{item.title}</span>
                        <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>•</span>
                        <span className="activity-item-actor">
                          by <strong>{item.actorName}</strong>
                        </span>
                      </div>
                      <div className="activity-item-desc">{item.description}</div>
                    </div>
                  </div>

                  <div className="activity-item-right">
                    <span
                      title={new Date(item.timestamp).toLocaleString()}
                      className="activity-item-time"
                    >
                      {formatRelativeTime(item.timestamp)}
                    </span>

                    {/* WhatsApp File 1-click Download/Preview */}
                    {isWaFile && mediaUrl && (
                      <a
                        href={mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`View ${mediaFileName}`}
                        className="activity-btn-file"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          style={{ width: "12px", height: "12px", flexShrink: 0 }}
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        <span>View File</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="activity-btn-inspect"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {nextCursor && !isLoading && (
          <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="capsule-btn-black"
              style={{ margin: "0 auto", fontSize: "0.8rem", padding: "6px 16px" }}
            >
              <span>{isLoadingMore ? "Loading..." : "Load More Activities"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Metadata Inspector Modal */}
      {selectedItem && (
        <div className="activity-modal-overlay">
          <div className="activity-modal-box">
            <div className="activity-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                  {selectedItem.title}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                  Logged: {new Date(selectedItem.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{ background: "none", border: "none", fontSize: "1.1rem", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                ✕
              </button>
            </div>

            <div className="activity-modal-body">
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                  Description
                </div>
                <div style={{ fontSize: "0.82rem", color: "#334155", marginTop: "2px" }}>
                  {selectedItem.description}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                  Actor / Created By
                </div>
                <div style={{ fontSize: "0.82rem", color: "#334155", marginTop: "2px" }}>
                  {selectedItem.actorName}
                </div>
              </div>

              {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                    Raw Data Attributes
                  </div>
                  <pre
                    style={{
                      margin: "4px 0 0",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      overflowX: "auto",
                      color: "#334155",
                    }}
                  >
                    {JSON.stringify(selectedItem.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedItem.category === "whatsapp_files" && typeof selectedItem.metadata?.mediaUrl === "string" && (
                <div style={{ marginTop: "6px" }}>
                  <a
                    href={selectedItem.metadata.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="activity-btn-file"
                    style={{ width: "100%", justifyContent: "center", padding: "8px" }}
                  >
                    Open Document / Media ({typeof selectedItem.metadata.mediaFileName === "string" ? selectedItem.metadata.mediaFileName : "Download"})
                  </a>
                </div>
              )}
            </div>

            <div className="activity-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="activity-btn-inspect"
                style={{ padding: "6px 16px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
