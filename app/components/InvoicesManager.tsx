"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import PrintableInvoiceModal, { PrintableInvoiceData } from "./PrintableInvoiceModal";

export interface InvoiceRecord {
  id: string;
  _id?: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTime?: string;
  customer?: {
    name?: string;
    mobile?: string;
    code?: string;
    address?: string;
    email?: string;
    company?: string;
  };
  lineItems?: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    totalAmount: number;
    employee?: string;
  }>;
  financialSummary?: {
    total?: string;
    discount?: string;
    totalBeforeVat?: string;
    vat?: string;
    grossAmount?: string;
    paid?: string;
    balance?: string;
  };
  status?: "paid" | "partial" | "unpaid" | "draft";
  salesMan?: string;
  division?: string;
  createdAt?: string;
}

interface InvoicesManagerProps {
  getAuthHeaders?: () => Record<string, string>;
  onNavigateTab?: (tab: any) => void;
  onOpenInvoiceEditor?: (inv?: any) => void;
}

export default function InvoicesManager({
  getAuthHeaders,
  onNavigateTab,
  onOpenInvoiceEditor,
}: InvoicesManagerProps) {
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

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Printable modal state
  const [activePrintInvoice, setActivePrintInvoice] = useState<PrintableInvoiceData | null>(null);

  const getHeaders = useCallback(() => {
    if (getAuthHeaders) return getAuthHeaders();
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }, [getAuthHeaders]);

  // Fetch real Invoices from MongoDB
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load invoices (${res.status})`);
      }
      const json = await res.json();
      if (json.data?.invoices) {
        setInvoices(json.data.invoices);
      }
    } catch (err: unknown) {
      console.error("Error loading invoices:", err);
      setError(err instanceof Error ? err.message : "Error connecting to MongoDB database");
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchInvoices();
    const handleUpdate = () => fetchInvoices();
    window.addEventListener("abc_invoice_saved", handleUpdate);
    return () => window.removeEventListener("abc_invoice_saved", handleUpdate);
  }, [fetchInvoices]);

  // Delete Invoice from MongoDB
  const handleDeleteInvoice = async (id: string, num: string) => {
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete Invoice #${num} from MongoDB?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setInvoices((prev) => prev.filter((i) => (i.id || i._id) !== id));
        window.dispatchEvent(new Event("abc_invoice_saved"));
      } else {
        const errJson = await res.json().catch(() => null);
        alert(errJson?.message || "Failed to delete invoice.");
      }
    } catch (err) {
      console.error("Error deleting invoice:", err);
      alert("Error deleting invoice.");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((i) => i.id || i._id || "")));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const invNo = (inv.invoiceNo || "").toLowerCase();
    const cust = (inv.customer?.name || "").toLowerCase();
    const phone = (inv.customer?.mobile || "").toLowerCase();
    const staff = (inv.lineItems?.[0]?.employee || inv.salesMan || "").toLowerCase();

    const matchesSearch = !q || invNo.includes(q) || cust.includes(q) || phone.includes(q) || staff.includes(q);

    const gross = Number(inv.financialSummary?.grossAmount || 0);
    const bal = Number(inv.financialSummary?.balance || 0);
    const paid = Number(inv.financialSummary?.paid || 0);
    const computedStatus = inv.status || (bal <= 0 && gross > 0 ? "paid" : paid > 0 ? "partial" : "unpaid");

    const matchesStatus = filterStatus === "all" || computedStatus.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.financialSummary?.grossAmount || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.financialSummary?.paid || 0),
    0
  );
  const totalBalance = invoices.reduce(
    (sum, inv) => sum + Number(inv.financialSummary?.balance || 0),
    0
  );

  return (
    <div className="invoices-manager-container" style={{ width: "100%" }}>
      {/* Header Row: Title on Left, Capsule Button on Right */}
      <div className="content-header-row">
        <div>
          <h1 className="content-title">Invoices</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Real MongoDB Billing Records, Collections &amp; Accounts Receivable
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onNavigateTab) onNavigateTab("accounting");
          }}
          className="capsule-btn-black"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Open Invoice Editor</span>
        </button>
      </div>

      {/* Summary KPI Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, margin: "16px 0" }}>
        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Invoiced</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
            AED {totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{invoices.length} Total invoices</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Collected</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
            AED {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Settled payments</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Outstanding Balance</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
            AED {totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Pending receivables</span>
        </div>
      </div>

      {/* Toolbar: Category Filter Pills + Search Box */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="clients-filter-pills">
          <button
            type="button"
            className={`client-filter-pill ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            <span>All Invoices</span>
            <span className="pill-count">{invoices.length}</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterStatus === "paid" ? "active" : ""}`}
            onClick={() => setFilterStatus("paid")}
          >
            <span>✓ Paid</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterStatus === "partial" ? "active" : ""}`}
            onClick={() => setFilterStatus("partial")}
          >
            <span>⚡ Partial</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterStatus === "unpaid" ? "active" : ""}`}
            onClick={() => setFilterStatus("unpaid")}
          >
            <span>⏳ Unpaid</span>
          </button>
        </div>

        <div className="clients-search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="clients-search-input"
            placeholder="Search invoice #, customer, staff, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" className="search-clear-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Admin Table: Exactly like Worker Admins */}
      <div className="admin-table-container worker-admins-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>
                <input
                  type="checkbox"
                  className="admin-checkbox"
                  checked={filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length}
                  onChange={handleSelectAll}
                  disabled={filteredInvoices.length === 0}
                  aria-label="Select all invoices"
                />
              </th>
              <th>
                <span className="th-inner">Invoice #</span>
              </th>
              <th>
                <span className="th-inner">Date &amp; Time</span>
              </th>
              <th>
                <span className="th-inner">Customer</span>
              </th>
              <th>
                <span className="th-inner">Staff / Service</span>
              </th>
              <th style={{ textAlign: "right" }}>
                <span className="th-inner">Gross (AED)</span>
              </th>
              <th style={{ textAlign: "right" }}>
                <span className="th-inner">Paid</span>
              </th>
              <th style={{ textAlign: "right" }}>
                <span className="th-inner">Balance</span>
              </th>
              <th>
                <span className="th-inner">Status</span>
              </th>
              <th style={{ textAlign: "right", width: "90px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="empty-admin-cell">
                  Loading invoices from MongoDB...
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-admin-cell">
                  {error ? error : "No invoices found in database."}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const id = inv.id || inv._id || "";
                const gross = Number(inv.financialSummary?.grossAmount || 0);
                const paid = Number(inv.financialSummary?.paid || 0);
                const bal = Number(inv.financialSummary?.balance || 0);
                const invStatus = inv.status || (bal <= 0 && gross > 0 ? "paid" : paid > 0 ? "partial" : "unpaid");

                return (
                  <tr key={id} className="worker-admin-clickable-row">
                    <td>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={selectedIds.has(id)}
                        onChange={() => handleToggleSelect(id)}
                        aria-label={`Select #${inv.invoiceNo}`}
                      />
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <div
                          className="admin-avatar-photo"
                          style={{
                            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                            color: "#ffffff",
                            fontWeight: 700,
                          }}
                        >
                          #
                        </div>
                        <div className="admin-user-info">
                          <span className="admin-user-name font-mono">#{inv.invoiceNo}</span>
                          <span className="admin-user-email">
                            {inv.division || "Typing"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                        <div>{inv.invoiceDate}</div>
                        {inv.invoiceTime && (
                          <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{inv.invoiceTime}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#0f172a" }}>
                        {inv.customer?.name || "Walk-in Customer"}
                      </div>
                      {inv.customer?.mobile && (
                        <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                          📞 {inv.customer.mobile}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                        {inv.lineItems?.[0]?.employee || inv.salesMan || "Staff"}
                      </div>
                      {inv.lineItems?.[0]?.description && (
                        <div style={{ fontSize: "0.74rem", color: "#94a3b8", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {inv.lineItems[0].description}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {gross.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
                      {paid.toFixed(2)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: bal > 0 ? "#dc2626" : "#64748b",
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {bal.toFixed(2)}
                    </td>
                    <td>
                      <span className={`setup-pill ${invStatus === "paid" ? "completed" : "pending"}`}>
                        {invStatus.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="erp-mini-btn print"
                          onClick={() => setActivePrintInvoice(inv as any)}
                          title="Print Document"
                        >
                          🖨️
                        </button>
                        {canDeleteData && (
                          <button
                            type="button"
                            className="erp-mini-btn delete"
                            onClick={() => handleDeleteInvoice(id, inv.invoiceNo)}
                            title="Delete Invoice"
                          >
                            🗑️
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

      {/* Printable Modal */}
      {activePrintInvoice && (
        <PrintableInvoiceModal
          invoice={activePrintInvoice}
          onClose={() => setActivePrintInvoice(null)}
        />
      )}
    </div>
  );
}
