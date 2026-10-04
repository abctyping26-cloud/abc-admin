"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface IncomeRecord {
  id: string;
  _id?: string;
  incomeId: string;
  incomeDate: string;
  type: string;
  description: string;
  amount: number;
  payMode: "cash" | "bank";
  bank?: string;
  division?: string;
  status: "received" | "cleared" | "pending";
  createdAt?: string;
}

interface IncomesManagerProps {
  getAuthHeaders?: () => Record<string, string>;
  onNavigateTab?: (tab: any) => void;
}

export default function IncomesManager({ getAuthHeaders, onNavigateTab }: IncomesManagerProps) {
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

  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPayMode, setFilterPayMode] = useState<string>("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIncomeId, setModalIncomeId] = useState("");
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalType, setModalType] = useState("Consulting Fee");
  const [modalDescription, setModalDescription] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalPayMode, setModalPayMode] = useState<"cash" | "bank">("cash");
  const [modalBank, setModalBank] = useState("");
  const [modalDivision, setModalDivision] = useState("Typing Center");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const getHeaders = useCallback(() => {
    if (getAuthHeaders) return getAuthHeaders();
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }, [getAuthHeaders]);

  // Fetch real Incomes from MongoDB
  const fetchIncomes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/incomes`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load incomes (${res.status})`);
      }
      const json = await res.json();
      if (json.data?.incomes) {
        setIncomes(json.data.incomes);
      }
    } catch (err: unknown) {
      console.error("Error loading incomes:", err);
      setError(err instanceof Error ? err.message : "Error connecting to MongoDB database");
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchIncomes();
    const handleUpdate = () => fetchIncomes();
    window.addEventListener("abc_income_updated", handleUpdate);
    return () => window.removeEventListener("abc_income_updated", handleUpdate);
  }, [fetchIncomes]);

  // Create Income in MongoDB
  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalType.trim()) {
      setModalError("Income type is required.");
      return;
    }
    const num = Number(modalAmount);
    if (isNaN(num) || num <= 0) {
      setModalError("Please enter a valid amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/incomes`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incomeId: modalIncomeId.trim() || `IN/${Math.floor(10 + Math.random() * 900)}`,
          incomeDate: modalDate,
          type: modalType.trim(),
          description: modalDescription.trim(),
          amount: num,
          payMode: modalPayMode,
          bank: modalBank.trim(),
          division: modalDivision.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to record income.");
      }

      setModalIncomeId("");
      setModalDescription("");
      setModalAmount("");
      setIsModalOpen(false);

      fetchIncomes();
      window.dispatchEvent(new Event("abc_income_updated"));
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to record income.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Income from MongoDB
  const handleDeleteIncome = async (id: string, code: string) => {
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete Income #${code} from MongoDB?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/incomes/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setIncomes((prev) => prev.filter((inc) => (inc.id || inc._id) !== id));
        window.dispatchEvent(new Event("abc_income_updated"));
      } else {
        const errJson = await res.json().catch(() => null);
        alert(errJson?.message || "Failed to delete income record.");
      }
    } catch (err) {
      console.error("Error deleting income:", err);
      alert("Error deleting income record.");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredIncomes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncomes.map((i) => i.id || i._id || "")));
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

  // Filters
  const filteredIncomes = incomes.filter((inc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inc.incomeId.toLowerCase().includes(q) ||
      inc.type.toLowerCase().includes(q) ||
      (inc.description && inc.description.toLowerCase().includes(q)) ||
      (inc.division && inc.division.toLowerCase().includes(q));

    const matchesType = filterType === "all" || inc.type === filterType;
    const matchesPayMode = filterPayMode === "all" || inc.payMode === filterPayMode;

    return matchesSearch && matchesType && matchesPayMode;
  });

  // Calculate totals
  const totalAmount = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashAmount = incomes
    .filter((i) => i.payMode === "cash")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const bankAmount = incomes
    .filter((i) => i.payMode === "bank")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="incomes-manager-container" style={{ width: "100%" }}>
      {/* Header Row: Title on Left, Capsule Button on Right */}
      <div className="content-header-row">
        <div>
          <h1 className="content-title">Incomes</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Operational Incomes, Consulting Fees, Typing Charges &amp; Cash Inflows
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError("");
            setModalIncomeId(`IN/${Math.floor(10 + Math.random() * 900)}`);
            setIsModalOpen(true);
          }}
          className="capsule-btn-black"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Record Income</span>
        </button>
      </div>

      {/* Summary KPI Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, margin: "16px 0" }}>
        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Income</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
            AED {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{incomes.length} Total records</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Cash Inflow</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
            AED {cashAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Cash payments</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Bank Transfers</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#2563eb", marginTop: 2 }}>
            AED {bankAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Direct to bank</span>
        </div>
      </div>

      {/* Toolbar: Category Filter Pills + Search Box */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="clients-filter-pills">
          <button
            type="button"
            className={`client-filter-pill ${filterPayMode === "all" ? "active" : ""}`}
            onClick={() => setFilterPayMode("all")}
          >
            <span>All Payments</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterPayMode === "cash" ? "active" : ""}`}
            onClick={() => setFilterPayMode("cash")}
          >
            <span>💵 Cash</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterPayMode === "bank" ? "active" : ""}`}
            onClick={() => setFilterPayMode("bank")}
          >
            <span>🏦 Bank</span>
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
            placeholder="Search income by ID, type, description..."
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
                  checked={filteredIncomes.length > 0 && selectedIds.size === filteredIncomes.length}
                  onChange={handleSelectAll}
                  disabled={filteredIncomes.length === 0}
                  aria-label="Select all incomes"
                />
              </th>
              <th>
                <span className="th-inner">Income ID &amp; Type</span>
              </th>
              <th>
                <span className="th-inner">Description</span>
              </th>
              <th style={{ textAlign: "right" }}>
                <span className="th-inner">Amount (AED)</span>
              </th>
              <th>
                <span className="th-inner">Pay Mode</span>
              </th>
              <th>
                <span className="th-inner">Division</span>
              </th>
              <th>
                <span className="th-inner">Date</span>
              </th>
              <th>
                <span className="th-inner">Status</span>
              </th>
              <th style={{ textAlign: "right", width: "60px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="empty-admin-cell">
                  Loading incomes from MongoDB...
                </td>
              </tr>
            ) : filteredIncomes.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-admin-cell">
                  {error ? error : "No incomes recorded yet. Click \"+ Record Income\" above to add one."}
                </td>
              </tr>
            ) : (
              filteredIncomes.map((inc) => {
                const id = inc.id || inc._id || "";
                const formattedDate = inc.incomeDate
                  ? new Date(inc.incomeDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";

                return (
                  <tr key={id} className="worker-admin-clickable-row">
                    <td>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={selectedIds.has(id)}
                        onChange={() => handleToggleSelect(id)}
                        aria-label={`Select ${inc.incomeId}`}
                      />
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <div
                          className="admin-avatar-photo"
                          style={{
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "#ffffff",
                            fontWeight: 700,
                          }}
                        >
                          IN
                        </div>
                        <div className="admin-user-info">
                          <span className="admin-user-name">#{inc.incomeId}</span>
                          <span className="admin-user-email">{inc.type}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: inc.description ? "#334155" : "#94a3b8" }}>
                        {inc.description || "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
                      +AED {Number(inc.amount).toFixed(2)}
                    </td>
                    <td>
                      <span className="setup-pill completed" style={{ background: inc.payMode === "cash" ? "#ecfdf5" : "#eff6ff", color: inc.payMode === "cash" ? "#065f46" : "#1e40af" }}>
                        {inc.payMode === "cash" ? "Cash" : "Bank Transfer"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                        {inc.division || "Typing Center"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                        {formattedDate}
                      </span>
                    </td>
                    <td>
                      <span className="setup-pill completed">
                        {inc.status || "Received"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {canDeleteData && (
                        <button
                          type="button"
                          className="erp-mini-btn delete"
                          onClick={() => handleDeleteIncome(id, inc.incomeId)}
                          title="Delete Income Record"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* RECORD INCOME MODAL */}
      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">+ Record Income</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 6, fontSize: "0.84rem", margin: "12px 16px 0" }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateIncome} className="admin-modal-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Income ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IN/83"
                      value={modalIncomeId}
                      onChange={(e) => setModalIncomeId(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem", fontWeight: 600 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Income Type *
                  </label>
                  <select
                    value={modalType}
                    onChange={(e) => setModalType(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  >
                    <option value="Consulting Fee">Consulting Fee</option>
                    <option value="Typing Center Fees">Typing Center Fees</option>
                    <option value="Translation Services">Translation Services</option>
                    <option value="Document Clearance">Document Clearance</option>
                    <option value="Government Service Charge">Government Service Charge</option>
                    <option value="Miscellaneous Income">Miscellaneous Income</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Amount (AED) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem", fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Payment Mode
                    </label>
                    <select
                      value={modalPayMode}
                      onChange={(e) => setModalPayMode(e.target.value as "cash" | "bank")}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    >
                      <option value="cash">Cash Inflow</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Division
                    </label>
                    <select
                      value={modalDivision}
                      onChange={(e) => setModalDivision(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    >
                      <option value="Typing Center">Typing Center</option>
                      <option value="Corporate Services">Corporate Services</option>
                      <option value="Legal Translation">Legal Translation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Description / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Reference memo or customer details..."
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  className="simple-cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="simple-save-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Recording..." : "Save Income"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
