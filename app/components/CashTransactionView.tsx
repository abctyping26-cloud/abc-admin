"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import type { CurrentAdminUser } from "./AccountingSection";

export interface CashTransactionViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
  getAuthHeaders?: () => Record<string, string>;
}

export interface ClientItem {
  id?: string;
  _id?: string;
  name?: string;
  phone?: string;
  email?: string;
  identifier?: string;
}

const DEFAULT_CATEGORIES = [
  "Customer Payment",
  "Sales / Service Fee",
  "Walk-in Settlement",
  "Advance Receipt",
  "Typing & Legal Services",
  "Document Clearing",
  "Government Fee",
  "Office Expense",
  "Petty Cash",
  "Supplier Payment",
  "Owner Drawing / Deposit",
  "Deposit to Bank",
  "Bank Withdrawal",
];

export default function CashTransactionView({
  user,
  onClose,
  getAuthHeaders,
}: CashTransactionViewProps = {}) {
  const [txType, setTxType] = useState<
    "Cash In" | "Cash Out" | "Deposit to Bank" | "Withdrawal from Bank"
  >("Cash In");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Dynamic Cash Registers loaded from real MongoDB
  const [cashAccounts, setCashAccounts] = useState<string[]>([]);
  const [accountName, setAccountName] = useState("Main Cash");

  // Dynamic Banks (for Deposit to Bank / Withdrawal from Bank)
  const [banks, setBanks] = useState<string[]>([]);
  const [toBank, setToBank] = useState("-Select One-");

  // Form fields
  const [amount, setAmount] = useState("");
  const [customerOrParty, setCustomerOrParty] = useState("Walk-in Customer");
  const [category, setCategory] = useState("Customer Payment");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState("");
  const [reference, setReference] = useState("REC-0001");
  const [lastReceiptNo, setLastReceiptNo] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // Customer Management (Real MongoDB Clients & Quick Add)
  const [dbClients, setDbClients] = useState<ClientItem[]>([]);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [isSavingCust, setIsSavingCust] = useState(false);

  // Quick Add Cash Register state
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Status message & saving state
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSavingTx, setIsSavingTx] = useState(false);

  const getHeaders = useCallback((): Record<string, string> => {
    if (getAuthHeaders) return getAuthHeaders();
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("abc_admin_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    if (user?.id) {
      headers["x-admin-id"] = user.id;
      headers["x-admin-role"] = user.role || "worker_admin";
      headers["x-admin-identifier"] = user.identifier || "";
    }
    return headers;
  }, [getAuthHeaders, user]);

  // 1. Fetch automatic sequential receipt number
  const fetchReceiptSequence = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/cash-transactions`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.nextReceiptNo) {
        setReference(json.data.nextReceiptNo);
      }
      if (json.data?.recentReceiptNo) {
        setLastReceiptNo(json.data.recentReceiptNo);
      }
    } catch {
      // Graceful fallback
    }
  }, [getHeaders]);

  // 2. Fetch real clients from MongoDB for customer selection
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients?limit=100`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const list = json.data?.clients || json.data?.users || json.data || [];
      if (Array.isArray(list)) {
        setDbClients(list);
      }
    } catch {
      // Graceful fallback
    }
  }, [getHeaders]);

  // 3. Fetch real cash accounts from MongoDB
  const fetchCashAccounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/cash-accounts`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = json.data?.cashAccounts || [];
      if (Array.isArray(items)) {
        const names = items
          .map((a: any) => (a.accountName || "").trim())
          .filter(Boolean);
        const uniqueNames = Array.from(new Set(names));
        if (uniqueNames.length > 0) {
          setCashAccounts(uniqueNames);
          if (!uniqueNames.includes(accountName)) {
            setAccountName(uniqueNames[0]);
          }
        }
      }
    } catch {
      // Graceful fallback
    }
  }, [getHeaders, accountName]);

  // 4. Fetch real banks for deposit/withdrawal
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
    fetchReceiptSequence();
    fetchClients();
    fetchCashAccounts();
    fetchBanks();

    const handleUpdate = () => {
      fetchReceiptSequence();
      fetchCashAccounts();
      fetchBanks();
    };
    window.addEventListener("abc_cash_transactions_updated", handleUpdate);
    window.addEventListener("abc_cash_accounts_updated", handleUpdate);
    window.addEventListener("abc_banks_updated", handleUpdate);
    return () => {
      window.removeEventListener("abc_cash_transactions_updated", handleUpdate);
      window.removeEventListener("abc_cash_accounts_updated", handleUpdate);
      window.removeEventListener("abc_banks_updated", handleUpdate);
    };
  }, [fetchReceiptSequence, fetchClients, fetchCashAccounts, fetchBanks]);

  // Handle Quick Add Customer to MongoDB
  const handleSaveCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newCustName.trim();
    if (!name) return;
    setIsSavingCust(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone: newCustPhone.trim(),
          email: newCustEmail.trim(),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const client = json.data?.client || json.data || { name, phone: newCustPhone };
        setDbClients((prev) => [client, ...prev]);
        setCustomerOrParty(name);
        setNewCustName("");
        setNewCustPhone("");
        setNewCustEmail("");
        setIsAddingCustomer(false);
      } else {
        // Fallback: still select the typed name
        setCustomerOrParty(name);
        setIsAddingCustomer(false);
      }
    } catch {
      setCustomerOrParty(name);
      setIsAddingCustomer(false);
    } finally {
      setIsSavingCust(false);
    }
  };

  const handleCreateAccount = async () => {
    const val = newAccountName.trim();
    if (!val) return;
    setIsSavingAccount(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/cash-accounts`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountName: val,
          description: "Created from Cash Transaction View",
          currency: "AED",
          openingBalance: 0,
        }),
      });

      if (res.ok) {
        if (!cashAccounts.includes(val)) {
          setCashAccounts((prev) => [...prev, val]);
        }
        setAccountName(val);
        setNewAccountName("");
        setIsAddingAccount(false);
        window.dispatchEvent(new Event("abc_cash_accounts_updated"));
      } else {
        const json = await res.json();
        alert(json.message || "Failed to add cash drawer.");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error adding cash drawer.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleReset = () => {
    setTxType("Cash In");
    setTxDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setCustomerOrParty("Walk-in Customer");
    setCategory("Customer Payment");
    setIsCustomCategory(false);
    setCustomCategoryText("");
    setDescription("");
    setToBank("-Select One-");
    setStatusMessage(null);
    fetchReceiptSequence();
  };

  const handleSaveTransaction = async () => {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      setStatusMessage({ type: "error", text: "Please enter a valid amount greater than 0." });
      return;
    }

    if ((txType === "Deposit to Bank" || txType === "Withdrawal from Bank") && (!toBank || toBank === "-Select One-")) {
      setStatusMessage({ type: "error", text: "Please select a bank for transfer." });
      return;
    }

    const finalCategory = isCustomCategory ? (customCategoryText.trim() || "General") : category;

    setIsSavingTx(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/cash-transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({
          txType,
          txDate,
          accountName: accountName || "Main Cash",
          amount: num,
          customerOrParty: customerOrParty.trim() || "Walk-in Customer",
          category: finalCategory,
          reference: reference.trim(),
          description: description.trim(),
          toBank: (txType === "Deposit to Bank" || txType === "Withdrawal from Bank") ? toBank : "",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || `Failed to save cash transaction (${res.status})`);
      }

      setStatusMessage({
        type: "success",
        text: `Cash Transaction (${txType}) #${reference} for AED ${num.toFixed(2)} recorded successfully in MongoDB!`,
      });
      setAmount("");
      setDescription("");
      fetchReceiptSequence();
      window.dispatchEvent(new Event("abc_cash_transactions_updated"));
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving cash transaction.",
      });
    } finally {
      setIsSavingTx(false);
    }
  };

  return (
    <div className="erp-invoice-window" aria-label="Cash Transaction Form">
      {/* WINDOW TITLE BAR - BLUE BOX HEADER */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect width="20" height="12" x="2" y="6" rx="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
          <span className="erp-window-title-text">Cash Transaction</span>
        </div>
        <div className="erp-window-controls">
          <button
            type="button"
            className="erp-win-btn close"
            aria-label="Close"
            onClick={onClose}
            tabIndex={-1}
          >
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

        <div className="erp-form-rows" style={{ maxWidth: 620, gap: 10 }}>
          {/* Top Group Box: Type */}
          <div className="erp-form-row">
            <div className="erp-group-box" style={{ width: "fit-content", minWidth: 380, padding: "8px 14px" }}>
              <span className="erp-group-box-title" style={{ color: "#2563eb" }}>
                Transaction Type
              </span>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="ct_type_radio"
                    checked={txType === "Cash In"}
                    onChange={() => {
                      setTxType("Cash In");
                      if (!isCustomCategory) setCategory("Customer Payment");
                    }}
                  />
                  Cash In (Received)
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="ct_type_radio"
                    checked={txType === "Cash Out"}
                    onChange={() => {
                      setTxType("Cash Out");
                      if (!isCustomCategory) setCategory("Office Expense");
                    }}
                  />
                  Cash Out (Paid)
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="ct_type_radio"
                    checked={txType === "Deposit to Bank"}
                    onChange={() => {
                      setTxType("Deposit to Bank");
                      if (!isCustomCategory) setCategory("Deposit to Bank");
                    }}
                  />
                  Deposit to Bank
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="ct_type_radio"
                    checked={txType === "Withdrawal from Bank"}
                    onChange={() => {
                      setTxType("Withdrawal from Bank");
                      if (!isCustomCategory) setCategory("Bank Withdrawal");
                    }}
                  />
                  Withdraw to Cash
                </label>
              </div>
            </div>
          </div>

          {/* Automatic Receipt No */}
          <div className="erp-form-row" style={{ marginTop: 2 }}>
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Receipt No *
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                className="erp-input erp-w-160 font-bold"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="REC-0001"
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#16a34a",
                  background: "#dcfce7",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontWeight: 700,
                  letterSpacing: "0.3px",
                }}
              >
                ✓ Automatic
              </span>
              {lastReceiptNo && lastReceiptNo !== "None" && (
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Last Added: <strong>{lastReceiptNo}</strong>
                </span>
              )}
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
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
            />
          </div>

          {/* Cash Register / Drawer */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Cash Register *
            </label>
            <div className="erp-input-with-tools" style={{ maxWidth: 360 }}>
              <select
                className="erp-select erp-flex-1"
                value={accountName}
                onChange={(e) => {
                  if (e.target.value === "__add_new__") {
                    setIsAddingAccount(true);
                  } else {
                    setAccountName(e.target.value);
                  }
                }}
              >
                {cashAccounts.length === 0 && <option value="Main Cash">Main Cash</option>}
                {cashAccounts.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: "#2563eb" }}>
                  + Add New Cash Register...
                </option>
              </select>
              <button
                type="button"
                className="erp-icon-btn erp-btn-orange"
                title="Add Cash Register to Database"
                onClick={() => setIsAddingAccount(true)}
              >
                +
              </button>
            </div>
          </div>

          {/* Inline Quick Add Cash Register */}
          {isAddingAccount && (
            <div
              style={{
                marginLeft: 130,
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
                placeholder="Register name (e.g. Counter Cash, Petty Cash)..."
                className="erp-input"
                style={{ flex: 1, fontSize: "0.82rem" }}
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
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
                disabled={isSavingAccount}
                onClick={handleCreateAccount}
              >
                {isSavingAccount ? "Adding..." : "Add"}
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
                  setIsAddingAccount(false);
                  setNewAccountName("");
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Customer / Party (Supports Walk-in, direct typing, DB lookup, & Quick Add) */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 130, paddingTop: 4 }}>
              Customer / Party
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 440 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="text"
                  className="erp-input"
                  style={{ flex: 1 }}
                  placeholder="Type walk-in or any customer name..."
                  value={customerOrParty}
                  onChange={(e) => setCustomerOrParty(e.target.value)}
                  list="db-customer-datalist"
                />
                <datalist id="db-customer-datalist">
                  <option value="Walk-in Customer" />
                  {dbClients.map((c, i) => (
                    <option key={c.id || c._id || i} value={c.name || c.identifier}>
                      {c.phone ? `${c.name} (${c.phone})` : c.name}
                    </option>
                  ))}
                </datalist>

                <button
                  type="button"
                  onClick={() => setCustomerOrParty("Walk-in Customer")}
                  title="Set as Walk-in Customer"
                  style={{
                    padding: "6px 10px",
                    background: customerOrParty === "Walk-in Customer" ? "#166534" : "#f1f5f9",
                    color: customerOrParty === "Walk-in Customer" ? "#ffffff" : "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  🚶 Walk-in
                </button>

                <button
                  type="button"
                  className="erp-icon-btn erp-btn-orange"
                  title="Add New Customer to Database"
                  onClick={() => setIsAddingCustomer((prev) => !prev)}
                >
                  +
                </button>
              </div>

              {/* Inline Quick Add Customer Form */}
              {isAddingCustomer && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#f8fafc",
                    border: "1px solid #94a3b8",
                    borderRadius: 6,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e293b" }}>
                    + Quick Add Customer to MongoDB
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <input
                      type="text"
                      placeholder="Customer Name *"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="erp-input"
                      style={{ fontSize: "0.78rem" }}
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Mobile No (050-XXXXXXX)"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="erp-input"
                      style={{ fontSize: "0.78rem" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomer(false)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.74rem",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingCust || !newCustName.trim()}
                      onClick={handleSaveCustomer}
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.74rem",
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 4,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isSavingCust ? "Saving..." : "Save & Select"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Amount (AED) *
            </label>
            <input
              type="number"
              step="0.01"
              className="erp-input erp-w-140 font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Category Dropdown with Flexibility */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 130, paddingTop: 4 }}>
              Category
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 360 }}>
              <div className="erp-input-with-tools">
                {!isCustomCategory ? (
                  <select
                    className="erp-select erp-flex-1"
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__" style={{ fontWeight: 600, color: "#2563eb" }}>
                      + Custom / Type Category...
                    </option>
                  </select>
                ) : (
                  <div style={{ display: "flex", gap: 4, width: "100%" }}>
                    <input
                      type="text"
                      className="erp-input erp-flex-1 font-semibold"
                      placeholder="Type custom category..."
                      value={customCategoryText}
                      onChange={(e) => setCustomCategoryText(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(false)}
                      title="Back to dropdown"
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.74rem",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      Presets
                    </button>
                  </div>
                )}
                {!isCustomCategory && (
                  <button
                    type="button"
                    className="erp-icon-btn erp-btn-orange"
                    title="Type custom category"
                    onClick={() => setIsCustomCategory(true)}
                  >
                    +
                  </button>
                )}
              </div>

              {/* Quick Category Chips for Fast Selection */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {["Customer Payment", "Sales", "Advance", "Office Expense", "Petty Cash"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(false);
                      setCategory(chip === "Sales" ? "Sales / Service Fee" : chip === "Advance" ? "Advance Receipt" : chip);
                    }}
                    style={{
                      padding: "2px 7px",
                      fontSize: "0.68rem",
                      background: category.includes(chip) && !isCustomCategory ? "#dbeafe" : "#f1f5f9",
                      color: category.includes(chip) && !isCustomCategory ? "#1e40af" : "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: 3,
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bank (Only shown for Deposit to Bank or Withdrawal from Bank) */}
          {(txType === "Deposit to Bank" || txType === "Withdrawal from Bank") && (
            <div className="erp-form-row">
              <label className="erp-label required" style={{ minWidth: 130 }}>
                Bank Account *
              </label>
              <select
                className="erp-select"
                style={{ maxWidth: 360 }}
                value={toBank}
                onChange={(e) => setToBank(e.target.value)}
              >
                <option value="-Select One-">-Select One-</option>
                {banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 130 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ maxWidth: 360 }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cash transaction memo / remarks..."
            />
          </div>
        </div>

        {/* BOTTOM METALLIC ACTION TOOLBAR */}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <div className="erp-classic-glossy-toolbar">
            <button
              type="button"
              className="erp-glossy-btn"
              onClick={handleSaveTransaction}
              disabled={isSavingTx}
            >
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
