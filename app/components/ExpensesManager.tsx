"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface ExpenseRecord {
  id: string;
  _id?: string;
  expenseId: string;
  expenseDate: string;
  supplierName?: string;
  type: string;
  subType?: string;
  description: string;
  amount: number;
  payMode: "cash" | "bank";
  bank?: string;
  status: "Paid" | "Unpaid" | "Partial";
  division?: string;
  createdAt?: string;
}

interface ExpensesManagerProps {
  getAuthHeaders?: () => Record<string, string>;
  onNavigateTab?: (tab: any) => void;
}

export default function ExpensesManager({ getAuthHeaders, onNavigateTab }: ExpensesManagerProps) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalExpenseId, setModalExpenseId] = useState("");
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalSupplierName, setModalSupplierName] = useState("-Select One-");
  const [modalType, setModalType] = useState("Operating Expenses");
  const [modalSubType, setModalSubType] = useState("Electricity / Water");
  const [modalDescription, setModalDescription] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalPayMode, setModalPayMode] = useState<"cash" | "bank">("cash");
  const [modalBank, setModalBank] = useState("");
  const [modalStatus, setModalStatus] = useState<"Paid" | "Unpaid" | "Partial">("Paid");
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

  // Fetch real Expenses from MongoDB
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/expenses`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load expenses (${res.status})`);
      }
      const json = await res.json();
      if (json.data?.expenses) {
        setExpenses(json.data.expenses);
      }
    } catch (err: unknown) {
      console.error("Error loading expenses:", err);
      setError(err instanceof Error ? err.message : "Error connecting to MongoDB database");
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchExpenses();
    const handleUpdate = () => fetchExpenses();
    window.addEventListener("abc_expense_updated", handleUpdate);
    return () => window.removeEventListener("abc_expense_updated", handleUpdate);
  }, [fetchExpenses]);

  // Create Expense in MongoDB
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalType.trim()) {
      setModalError("Expense type is required.");
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
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/expenses`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expenseId: modalExpenseId.trim() || `EX/${Math.floor(100 + Math.random() * 900)}`,
          expenseDate: modalDate,
          supplierName: modalSupplierName === "-Select One-" ? "" : modalSupplierName,
          type: modalType.trim(),
          subType: modalSubType.trim(),
          description: modalDescription.trim(),
          amount: num,
          payMode: modalPayMode,
          bank: modalBank.trim(),
          status: modalStatus,
          division: modalDivision.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to record expense.");
      }

      setModalExpenseId("");
      setModalDescription("");
      setModalAmount("");
      setIsModalOpen(false);

      fetchExpenses();
      window.dispatchEvent(new Event("abc_expense_updated"));
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to record expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense from MongoDB
  const handleDeleteExpense = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to permanently delete Expense #${code} from MongoDB?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/expenses/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setExpenses((prev) => prev.filter((exp) => (exp.id || exp._id) !== id));
        window.dispatchEvent(new Event("abc_expense_updated"));
      } else {
        alert("Failed to delete expense record.");
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Error deleting expense record.");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id || e._id || "")));
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
  const filteredExpenses = expenses.filter((exp) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      exp.expenseId.toLowerCase().includes(q) ||
      exp.type.toLowerCase().includes(q) ||
      (exp.supplierName && exp.supplierName.toLowerCase().includes(q)) ||
      (exp.subType && exp.subType.toLowerCase().includes(q)) ||
      (exp.description && exp.description.toLowerCase().includes(q));

    const matchesType = filterType === "all" || exp.type.toLowerCase().includes(filterType.toLowerCase());
    const matchesStatus = filterStatus === "all" || exp.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate totals
  const totalAmount = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidAmount = expenses
    .filter((e) => e.status === "Paid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const unpaidAmount = expenses
    .filter((e) => e.status === "Unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="expenses-manager-container" style={{ width: "100%" }}>
      {/* Header Row: Title on Left, Capsule Button on Right */}
      <div className="content-header-row">
        <div>
          <h1 className="content-title">Expenses</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Operational Costs, Rent, Utilities, Government Fees &amp; Overhead Disbursals
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError("");
            setModalExpenseId(`EX/${Math.floor(100 + Math.random() * 900)}`);
            setIsModalOpen(true);
          }}
          className="capsule-btn-black"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Record Expense</span>
        </button>
      </div>

      {/* Summary KPI Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, margin: "16px 0" }}>
        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Total Expenses</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#dc2626", marginTop: 2 }}>
            AED {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{expenses.length} Total records</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Paid Settled</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#16a34a", marginTop: 2 }}>
            AED {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Settled disbursals</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Pending / Due</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ea580c", marginTop: 2 }}>
            AED {unpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Unpaid payables</span>
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
            <span>All Status</span>
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
            placeholder="Search expense by ID, supplier, type, description..."
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
                  checked={filteredExpenses.length > 0 && selectedIds.size === filteredExpenses.length}
                  onChange={handleSelectAll}
                  disabled={filteredExpenses.length === 0}
                  aria-label="Select all expenses"
                />
              </th>
              <th>
                <span className="th-inner">Expense ID &amp; Supplier</span>
              </th>
              <th>
                <span className="th-inner">Type / Category</span>
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
                <span className="th-inner">Status</span>
              </th>
              <th>
                <span className="th-inner">Date</span>
              </th>
              <th style={{ textAlign: "right", width: "60px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="empty-admin-cell">
                  Loading expenses from MongoDB...
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-admin-cell">
                  {error ? error : "No expenses recorded yet. Click \"+ Record Expense\" above to register one."}
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const id = exp.id || exp._id || "";
                const formattedDate = exp.expenseDate
                  ? new Date(exp.expenseDate).toLocaleDateString("en-GB", {
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
                        aria-label={`Select ${exp.expenseId}`}
                      />
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <div
                          className="admin-avatar-photo"
                          style={{
                            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "#ffffff",
                            fontWeight: 700,
                          }}
                        >
                          EX
                        </div>
                        <div className="admin-user-info">
                          <span className="admin-user-name">#{exp.expenseId}</span>
                          <span className="admin-user-email">
                            {exp.supplierName ? `🏢 ${exp.supplierName}` : "Direct Expense"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="setup-pill completed" style={{ background: "#f1f5f9", color: "#334155" }}>
                          {exp.type}
                        </span>
                        {exp.subType && (
                          <span style={{ display: "block", fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>
                            {exp.subType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: exp.description ? "#334155" : "#94a3b8" }}>
                        {exp.description || "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>
                      -AED {Number(exp.amount).toFixed(2)}
                    </td>
                    <td>
                      <span className="setup-pill completed" style={{ background: exp.payMode === "cash" ? "#ecfdf5" : "#eff6ff", color: exp.payMode === "cash" ? "#065f46" : "#1e40af" }}>
                        {exp.payMode === "cash" ? "Cash" : "Bank Transfer"}
                      </span>
                    </td>
                    <td>
                      <span className={`setup-pill ${exp.status === "Paid" ? "completed" : "pending"}`}>
                        {exp.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                        {formattedDate}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="erp-mini-btn delete"
                        onClick={() => handleDeleteExpense(id, exp.expenseId)}
                        title="Delete Expense Record"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">+ Record Expense</h2>
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

            <form onSubmit={handleCreateExpense} className="admin-modal-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Expense ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EX/343"
                      value={modalExpenseId}
                      onChange={(e) => setModalExpenseId(e.target.value)}
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
                    Supplier / Vendor Name
                  </label>
                  <select
                    value={modalSupplierName}
                    onChange={(e) => setModalSupplierName(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  >
                    <option value="-Select One-">-Select Supplier (or Direct Expense)-</option>
                    <option value="Amer Center Al Nahda">Amer Center Al Nahda</option>
                    <option value="Tasheel Business Centre">Tasheel Business Centre</option>
                    <option value="Dubai Economy Dept (DED)">Dubai Economy Dept (DED)</option>
                    <option value="General Directorate of Residency (GDRFA)">GDRFA</option>
                    <option value="DEWA Utilities">DEWA Utilities</option>
                    <option value="Etisalat Telecom">Etisalat Telecom</option>
                    <option value="Office Landlord / Rent">Office Landlord / Rent</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Expense Type *
                    </label>
                    <select
                      value={modalType}
                      onChange={(e) => setModalType(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    >
                      <option value="Operating Expenses">Operating Expenses</option>
                      <option value="Office Rent">Office Rent</option>
                      <option value="Utilities & Bills">Utilities &amp; Bills</option>
                      <option value="Staff Salaries">Staff Salaries</option>
                      <option value="Government Fees">Government Fees</option>
                      <option value="Marketing & Advertising">Marketing &amp; Advertising</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Sub Type
                    </label>
                    <select
                      value={modalSubType}
                      onChange={(e) => setModalSubType(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    >
                      <option value="Electricity / Water">Electricity / Water</option>
                      <option value="High Speed Internet">High Speed Internet</option>
                      <option value="Paper & Stationery">Paper &amp; Stationery</option>
                      <option value="Printer Toners">Printer Toners</option>
                      <option value="Software License">Software License</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Payment Status
                    </label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value as "Paid" | "Unpaid" | "Partial")}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    >
                      <option value="Paid">Paid (Settled)</option>
                      <option value="Unpaid">Unpaid (Payable)</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>
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
                      <option value="cash">Cash</option>
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
                    Description / Memo
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Expense breakdown, invoice reference, or check #..."
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
                  {isSubmitting ? "Recording..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
