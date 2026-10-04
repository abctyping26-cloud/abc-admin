"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import type { CurrentAdminUser } from "./AccountingSection";

export interface BankTransactionViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
  getAuthHeaders?: () => Record<string, string>;
}

export default function BankTransactionView({ user, onClose, getAuthHeaders }: BankTransactionViewProps = {}) {
  const [txType, setTxType] = useState<"Deposit" | "Withdrawel" | "Bank To Bank">("Deposit");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Dynamic Banks loaded strictly from the real database
  const [banks, setBanks] = useState<string[]>([]);
  const [bankName, setBankName] = useState("-Select One-");
  const [toBank, setToBank] = useState("-Select One-");

  // Form fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"Cash" | "Cheque">("Cash");

  // Quick Add Bank state
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingTx, setIsSavingTx] = useState(false);

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

  // Fetch real banks from MongoDB accounting-banks collection
  const fetchBanks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/banks`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = json.data?.banks || [];
      if (Array.isArray(items)) {
        const names = items
          .map((b: any) => (b.bankName || b.name || "").trim())
          .filter(Boolean);
        setBanks(Array.from(new Set(names)));
      }
    } catch {
      // Graceful fallback
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchBanks();
    const handleUpdate = () => fetchBanks();
    window.addEventListener("abc_bank_updated", handleUpdate);
    window.addEventListener("abc_banks_updated", handleUpdate);
    return () => {
      window.removeEventListener("abc_bank_updated", handleUpdate);
      window.removeEventListener("abc_banks_updated", handleUpdate);
    };
  }, [fetchBanks]);

  const handleCreateBank = async () => {
    const val = newBankName.trim();
    if (!val) return;
    setIsSavingBank(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/banks`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankName: val,
          currency: "AED",
          openingBalance: 0,
        }),
      });

      if (res.ok) {
        if (!banks.includes(val)) {
          setBanks((prev) => [...prev, val]);
        }
        setBankName(val);
        setNewBankName("");
        setIsAddingBank(false);
        window.dispatchEvent(new Event("abc_bank_updated"));
      } else {
        const json = await res.json();
        alert(json.message || "Failed to add bank.");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error adding bank.");
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleReset = () => {
    setTxType("Deposit");
    setTxDate(new Date().toISOString().slice(0, 10));
    setBankName("-Select One-");
    setToBank("-Select One-");
    setDescription("");
    setAmount("");
    setPaymentType("Cash");
    setStatusMessage(null);
  };

  const handleSaveTransaction = async () => {
    if (!bankName || bankName === "-Select One-") {
      setStatusMessage({ type: "error", text: "Please select a Bank Name." });
      return;
    }
    if (txType === "Bank To Bank" && (!toBank || toBank === "-Select One-")) {
      setStatusMessage({ type: "error", text: "Please select a destination To Bank." });
      return;
    }
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      setStatusMessage({ type: "error", text: "Please enter a valid amount greater than 0." });
      return;
    }

    setIsSavingTx(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/bank-transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({
          txType,
          txDate,
          bankName,
          toBank: txType === "Bank To Bank" ? toBank : "",
          amount: num,
          paymentType,
          description,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || `Failed to save transaction (${res.status})`);
      }

      setStatusMessage({
        type: "success",
        text: `Bank Transaction (${txType}) for AED ${num.toFixed(2)} recorded and saved to database successfully!`,
      });
      setDescription("");
      setAmount("");
      window.dispatchEvent(new Event("abc_bank_transactions_updated"));
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving bank transaction.",
      });
    } finally {
      setIsSavingTx(false);
    }
  };

  return (
    <div className="erp-invoice-window" aria-label="Bank Transaction Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="12 2 2 7 22 7" />
            <rect x="4" y="7" width="16" height="3" />
            <line x1="6" y1="10" x2="6" y2="18" />
            <line x1="10" y1="10" x2="10" y2="18" />
            <line x1="14" y1="10" x2="14" y2="18" />
            <line x1="18" y1="10" x2="18" y2="18" />
            <rect x="2" y="18" width="20" height="3" />
          </svg>
          <span className="erp-window-title-text">Bank Transaction</span>
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

        <div className="erp-form-rows" style={{ maxWidth: 580, gap: 10 }}>
          {/* Top Group Box: Type */}
          <div className="erp-form-row">
            <div className="erp-group-box" style={{ width: "fit-content", minWidth: 340, padding: "8px 14px" }}>
              <span className="erp-group-box-title" style={{ color: "#2563eb" }}>
                Type
              </span>
              <div style={{ display: "flex", gap: 20 }}>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_type_radio"
                    checked={txType === "Deposit"}
                    onChange={() => setTxType("Deposit")}
                  />
                  Deposit
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_type_radio"
                    checked={txType === "Withdrawel"}
                    onChange={() => setTxType("Withdrawel")}
                  />
                  Withdrawel
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_type_radio"
                    checked={txType === "Bank To Bank"}
                    onChange={() => setTxType("Bank To Bank")}
                  />
                  Bank To Bank
                </label>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="erp-form-row" style={{ marginTop: 4 }}>
            <label className="erp-label required" style={{ minWidth: 120 }}>
              Date *
            </label>
            <input
              type="date"
              className="erp-input erp-w-140 font-semibold"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
            />
          </div>

          {/* Bank Name */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 120 }}>
              Bank Name *
            </label>
            <div className="erp-input-with-tools" style={{ maxWidth: 360 }}>
              <select
                className="erp-select erp-flex-1"
                value={bankName}
                onChange={(e) => {
                  if (e.target.value === "__add_new__") {
                    setIsAddingBank(true);
                  } else {
                    setBankName(e.target.value);
                  }
                }}
              >
                <option value="-Select One-">-Select One-</option>
                {banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: "#2563eb" }}>
                  + Add New Bank...
                </option>
              </select>
              <button
                type="button"
                className="erp-icon-btn erp-btn-orange"
                title="Add Bank to Database"
                onClick={() => setIsAddingBank(true)}
              >
                +
              </button>
            </div>
          </div>

          {/* Inline Quick Add Bank Box */}
          {isAddingBank && (
            <div
              style={{
                marginLeft: 120,
                maxWidth: 360,
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
                placeholder="Bank Name (e.g., ADCB, Emirates NBD)..."
                className="erp-input"
                style={{ flex: 1, fontSize: "0.82rem" }}
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
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
                disabled={isSavingBank}
                onClick={handleCreateBank}
              >
                {isSavingBank ? "Adding..." : "Add"}
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
                  setIsAddingBank(false);
                  setNewBankName("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* To Bank (Only shown or relevant for Bank To Bank transfers) */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 120 }}>
              To Bank
            </label>
            <div className="erp-input-with-tools" style={{ maxWidth: 360 }}>
              <select
                className="erp-select erp-flex-1"
                value={toBank}
                onChange={(e) => {
                  if (e.target.value === "__add_new__") {
                    setIsAddingBank(true);
                  } else {
                    setToBank(e.target.value);
                  }
                }}
              >
                <option value="-Select One-">-Select One-</option>
                {banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: "#2563eb" }}>
                  + Add New Bank...
                </option>
              </select>
              <button
                type="button"
                className="erp-icon-btn erp-btn-orange"
                title="Add Bank to Database"
                onClick={() => setIsAddingBank(true)}
              >
                +
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 120 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ maxWidth: 360 }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction memo / description..."
            />
          </div>

          {/* Amount */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 120 }}>
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

          {/* Payment Type */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 120 }}>
              Payment Type
            </label>
            <div style={{ display: "flex", gap: 20 }}>
              <label className="erp-radio-label">
                <input
                  type="radio"
                  name="bt_payment_type_radio"
                  checked={paymentType === "Cash"}
                  onChange={() => setPaymentType("Cash")}
                />
                Cash
              </label>
              <label className="erp-radio-label">
                <input
                  type="radio"
                  name="bt_payment_type_radio"
                  checked={paymentType === "Cheque"}
                  onChange={() => setPaymentType("Cheque")}
                />
                Cheque
              </label>
            </div>
          </div>
        </div>

        {/* BOTTOM METALLIC ACTION TOOLBAR */}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <div className="erp-classic-glossy-toolbar">
            <button type="button" className="erp-glossy-btn" onClick={handleSaveTransaction} disabled={isSavingTx}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{isSavingTx ? "Saving..." : <><u>S</u>ave</>}</span>
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
