"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import type { CurrentAdminUser } from "./AccountingSection";

export interface ExpenseViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
  getAuthHeaders?: () => Record<string, string>;
}

export interface SupplierItem {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  phone?: string;
  email?: string;
}

export default function ExpenseView({ user, onClose, getAuthHeaders }: ExpenseViewProps = {}) {
  const [expenseId, setExpenseId] = useState("EX/01");
  const [lastExpenseId, setLastExpenseId] = useState<string>("None");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Dynamic Options (Loaded directly from database)
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [supplierName, setSupplierName] = useState("-Select One-");

  const [types, setTypes] = useState<string[]>([
    "Government Fees",
    "Office Supplies",
    "Rent & Premises",
    "Utilities & Internet",
    "Salaries & Wages",
    "Miscellaneous",
  ]);
  const [expenseType, setExpenseType] = useState("-Select One-");

  const [subTypes, setSubTypes] = useState<string[]>([
    "Amer Portal Fees",
    "Tasheel Portal Fees",
    "GDRFA Service Fee",
    "Stationery & Paper",
    "Office Cleaning",
    "Software & Subscriptions",
  ]);
  const [subType, setSubType] = useState("-Select One-");

  const [divisions, setDivisions] = useState<string[]>([
    "Typing Center",
    "Corporate Services",
    "Legal Translation",
  ]);
  const [division, setDivision] = useState("-Select One-");

  // Form inputs
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payCash, setPayCash] = useState(true);
  const [payBank, setPayBank] = useState(false);
  const [status, setStatus] = useState<"Paid" | "Unpaid" | "Partial">("Paid");
  const [paidAmount, setPaidAmount] = useState("");

  // Quick Add States
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [isAddingSubType, setIsAddingSubType] = useState(false);
  const [newSubTypeName, setNewSubTypeName] = useState("");

  const [isAddingDivision, setIsAddingDivision] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");

  // Saving / Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    if (getAuthHeaders) return getAuthHeaders();
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("abc_admin_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }, [getAuthHeaders]);

  // Fetch expenses to calculate last added ID and +1 next ID
  const fetchExpensesSequence = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/expenses`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const list = json.data?.expenses || [];
      if (Array.isArray(list) && list.length > 0) {
        const latest = list[0];
        const lastIdStr = latest.expenseId || "";
        setLastExpenseId(lastIdStr || "None");

        let maxNum = 0;
        let prefix = "EX/";

        list.forEach((item: any) => {
          const match = String(item.expenseId || "").match(/(\d+)/);
          if (match) {
            const val = parseInt(match[1], 10);
            if (!isNaN(val) && val > maxNum) {
              maxNum = val;
            }
          }
        });

        const prefixMatch = lastIdStr.match(/^([A-Za-z]+\/?\-?)/);
        if (prefixMatch) {
          prefix = prefixMatch[1];
        }

        const nextNum = maxNum + 1;
        setExpenseId(`${prefix}${nextNum}`);
      } else {
        setLastExpenseId("None");
        setExpenseId("EX/01");
      }
    } catch {
      // Graceful fallback
    }
  }, [getHeaders]);

  // Fetch real suppliers from MongoDB accounting-personnel collection
  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel?type=supplier`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items: SupplierItem[] = json.data?.items || json.data?.personnel || [];
      const names = items.map((s) => s.name).filter(Boolean);
      setSuppliers(names);
    } catch {}
  }, [getHeaders]);

  // Fetch divisions from MongoDB
  const fetchDivisions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel?type=division`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = json.data?.items || json.data?.personnel || [];
      if (Array.isArray(items) && items.length > 0) {
        const names = items.map((d: any) => d.name).filter(Boolean);
        setDivisions((prev) => Array.from(new Set([...names, ...prev])));
      }
    } catch {}
  }, [getHeaders]);

  useEffect(() => {
    fetchExpensesSequence();
    fetchSuppliers();
    fetchDivisions();

    const handleUpdate = () => {
      fetchExpensesSequence();
      fetchSuppliers();
      fetchDivisions();
    };
    window.addEventListener("abc_expense_updated", handleUpdate);
    window.addEventListener("abc_personnel_updated", handleUpdate);
    return () => {
      window.removeEventListener("abc_expense_updated", handleUpdate);
      window.removeEventListener("abc_personnel_updated", handleUpdate);
    };
  }, [fetchExpensesSequence, fetchSuppliers, fetchDivisions]);

  // Calculate unpaid balance automatically if status is Partial
  const totalNum = Number(amount) || 0;
  const paidNum = Number(paidAmount) || 0;
  const remainingBalance = Math.max(0, totalNum - paidNum);

  const handleReset = () => {
    fetchExpensesSequence();
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setSupplierName("-Select One-");
    setExpenseType("-Select One-");
    setSubType("-Select One-");
    setDescription("");
    setAmount("");
    setPaidAmount("");
    setPayCash(true);
    setPayBank(false);
    setStatus("Paid");
    setDivision("-Select One-");
    setStatusMessage(null);
  };

  const handleSaveExpense = async () => {
    if (!expenseType || expenseType === "-Select One-") {
      setStatusMessage({ type: "error", text: "Please select an Expense Type." });
      return;
    }
    if (totalNum <= 0) {
      setStatusMessage({ type: "error", text: "Please enter a valid amount greater than 0." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/expenses`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expenseId: expenseId.trim(),
          expenseDate,
          supplierName: supplierName !== "-Select One-" ? supplierName : "",
          type: expenseType,
          subType: subType !== "-Select One-" ? subType : "",
          description: description.trim(),
          amount: totalNum,
          payMode: payBank ? "bank" : "cash",
          status,
          paidAmount: status === "Partial" ? paidNum : status === "Paid" ? totalNum : 0,
          balanceAmount: status === "Partial" ? remainingBalance : status === "Unpaid" ? totalNum : 0,
          division: division !== "-Select One-" ? division : "",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to record expense.");
      }

      setStatusMessage({ type: "success", text: `Expense #${expenseId} saved to database!` });
      window.dispatchEvent(new Event("abc_expense_updated"));
      handleReset();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving expense to database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="erp-invoice-window" aria-label="Expense Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" strokeWidth="2" />
          </svg>
          <span className="erp-window-title-text">Expense</span>
        </div>
        <div className="erp-window-controls">
          <button type="button" className="erp-win-btn close" aria-label="Close" onClick={onClose} tabIndex={-1}>
            ✕
          </button>
        </div>
      </div>

      {/* WINDOW BODY */}
      <div className="erp-window-body" style={{ padding: "18px 24px" }}>
        {statusMessage && (
          <div
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              marginBottom: "14px",
              fontSize: "0.84rem",
              fontWeight: 600,
              backgroundColor: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: statusMessage.type === "success" ? "#065f46" : "#b91c1c",
              border: `1px solid ${statusMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="erp-form-rows" style={{ maxWidth: 600, gap: 10 }}>
          {/* Expense ID with Last Added indicator & Auto +1 */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Expense ID
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                className="erp-input erp-w-110 font-semibold"
                value={expenseId}
                onChange={(e) => setExpenseId(e.target.value)}
              />
              <span
                className="erp-recent-invoice-text"
                style={{
                  fontSize: "0.78rem",
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Last Added: <strong style={{ color: "#0f172a" }}>{lastExpenseId}</strong>
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Date *
            </label>
            <input
              type="date"
              className="erp-input erp-w-140 font-semibold"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          {/* Supplier Name */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Supplier Name
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 380 }}>
              <select
                className="erp-select"
                style={{ width: "100%" }}
                value={supplierName}
                onChange={(e) => {
                  if (e.target.value === "__add_new__") {
                    setIsAddingSupplier(true);
                  } else {
                    setSupplierName(e.target.value);
                  }
                }}
              >
                <option value="-Select One-">-Select One-</option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: "#2563eb" }}>
                  + Add New Supplier...
                </option>
              </select>
              <button
                type="button"
                onClick={() => setIsAddingSupplier(true)}
                title="Create New Supplier"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Inline Quick Add Supplier */}
          {isAddingSupplier && (
            <div
              style={{
                marginLeft: 130,
                maxWidth: 380,
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="New supplier name..."
                className="erp-input"
                style={{ flex: 1, fontSize: "0.82rem" }}
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  const val = newSupplierName.trim();
                  if (val) {
                    if (!suppliers.includes(val)) {
                      setSuppliers((prev) => [...prev, val]);
                    }
                    setSupplierName(val);
                    setNewSupplierName("");
                    setIsAddingSupplier(false);

                    try {
                      await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
                        method: "POST",
                        headers: {
                          ...getHeaders(),
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          type: "supplier",
                          name: val,
                        }),
                      });
                      window.dispatchEvent(new Event("abc_personnel_updated"));
                    } catch {}
                  }
                }}
              >
                Add
              </button>
              <button
                type="button"
                style={{
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
                onClick={() => {
                  setIsAddingSupplier(false);
                  setNewSupplierName("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Expense Type */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Expense Type *
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 380 }}>
              <select
                className="erp-select"
                style={{ width: "100%" }}
                value={expenseType}
                onChange={(e) => {
                  if (e.target.value === "__add_new__") {
                    setIsAddingType(true);
                  } else {
                    setExpenseType(e.target.value);
                  }
                }}
              >
                <option value="-Select One-">-Select One-</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: "#2563eb" }}>
                  + Add New Type...
                </option>
              </select>
              <button
                type="button"
                onClick={() => setIsAddingType(true)}
                title="Create New Expense Type"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Inline Quick Add Type */}
          {isAddingType && (
            <div
              style={{
                marginLeft: 130,
                maxWidth: 380,
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="New expense type..."
                className="erp-input"
                style={{ flex: 1, fontSize: "0.82rem" }}
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => {
                  const val = newTypeName.trim();
                  if (val) {
                    if (!types.includes(val)) {
                      setTypes((prev) => [...prev, val]);
                    }
                    setExpenseType(val);
                    setNewTypeName("");
                    setIsAddingType(false);
                  }
                }}
              >
                Add
              </button>
              <button
                type="button"
                style={{
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
                onClick={() => {
                  setIsAddingType(false);
                  setNewTypeName("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Sub Type */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Sub Type
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 380 }}>
              <select
                className="erp-select"
                style={{ width: "100%" }}
                value={subType}
                onChange={(e) => {
                  if (e.target.value === "__add_new__") {
                    setIsAddingSubType(true);
                  } else {
                    setSubType(e.target.value);
                  }
                }}
              >
                <option value="-Select One-">-Select One-</option>
                {subTypes.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: "#2563eb" }}>
                  + Add New Sub Type...
                </option>
              </select>
              <button
                type="button"
                onClick={() => setIsAddingSubType(true)}
                title="Create New Sub Type"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Inline Quick Add Sub Type */}
          {isAddingSubType && (
            <div
              style={{
                marginLeft: 130,
                maxWidth: 380,
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="New sub-type name..."
                className="erp-input"
                style={{ flex: 1, fontSize: "0.82rem" }}
                value={newSubTypeName}
                onChange={(e) => setNewSubTypeName(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => {
                  const val = newSubTypeName.trim();
                  if (val) {
                    if (!subTypes.includes(val)) {
                      setSubTypes((prev) => [...prev, val]);
                    }
                    setSubType(val);
                    setNewSubTypeName("");
                    setIsAddingSubType(false);
                  }
                }}
              >
                Add
              </button>
              <button
                type="button"
                style={{
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
                onClick={() => {
                  setIsAddingSubType(false);
                  setNewSubTypeName("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 130 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ maxWidth: 380 }}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expense details / reference..."
            />
          </div>

          {/* Total Amount */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Amount *
            </label>
            <input
              type="text"
              className="erp-input erp-w-130 font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Pay Mode */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Pay Mode
            </label>
            <div style={{ display: "flex", gap: 20 }}>
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={payCash}
                  onChange={(e) => {
                    setPayCash(e.target.checked);
                    if (e.target.checked) setPayBank(false);
                  }}
                />
                Cash
              </label>
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={payBank}
                  onChange={(e) => {
                    setPayBank(e.target.checked);
                    if (e.target.checked) setPayCash(false);
                  }}
                />
                Bank
              </label>
            </div>
          </div>

          {/* Status (Paid / Unpaid / Partial) */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Status
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 380 }}
              value={status}
              onChange={(e) => setStatus(e.target.value as "Paid" | "Unpaid" | "Partial")}
            >
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {/* If Partial: How much paid + Automatic remaining balance */}
          {status === "Partial" && (
            <div
              style={{
                marginLeft: 130,
                maxWidth: 380,
                padding: "12px 14px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                  Amount Paid:
                </span>
                <input
                  type="text"
                  className="erp-input font-bold"
                  style={{ width: "120px", textAlign: "right" }}
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b" }}>
                  Remaining Balance:
                </span>
                <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#dc2626" }}>
                  AED {remainingBalance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Division */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Division
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 380 }}>
              <select
                className="erp-select"
                style={{ width: "100%" }}
                value={division}
                onChange={(e) => {
                  if (e.target.value === "__add_new__") {
                    setIsAddingDivision(true);
                  } else {
                    setDivision(e.target.value);
                  }
                }}
              >
                <option value="-Select One-">-Select One-</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: "#2563eb" }}>
                  + Add New Division...
                </option>
              </select>
              <button
                type="button"
                onClick={() => setIsAddingDivision(true)}
                title="Create New Division"
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Inline Quick Add Division */}
          {isAddingDivision && (
            <div
              style={{
                marginLeft: 130,
                maxWidth: 380,
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="New division name..."
                className="erp-input"
                style={{ flex: 1, fontSize: "0.82rem" }}
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                style={{
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  const val = newDivisionName.trim();
                  if (val) {
                    if (!divisions.includes(val)) {
                      setDivisions((prev) => [...prev, val]);
                    }
                    setDivision(val);
                    setNewDivisionName("");
                    setIsAddingDivision(false);

                    try {
                      await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
                        method: "POST",
                        headers: {
                          ...getHeaders(),
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          type: "division",
                          name: val,
                        }),
                      });
                      window.dispatchEvent(new Event("abc_personnel_updated"));
                    } catch {}
                  }
                }}
              >
                Add
              </button>
              <button
                type="button"
                style={{
                  background: "transparent",
                  color: "#64748b",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
                onClick={() => {
                  setIsAddingDivision(false);
                  setNewDivisionName("");
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM METALLIC ACTION TOOLBAR */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <div className="erp-classic-glossy-toolbar">
            <button
              type="button"
              className="erp-glossy-btn"
              onClick={handleSaveExpense}
              disabled={isSubmitting}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{isSubmitting ? "Saving..." : <><u>S</u>ave</>}</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={handleReset}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span><u>R</u>eset</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ea580c" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span style={{ color: "#c2410c" }}><u>C</u>lose</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
