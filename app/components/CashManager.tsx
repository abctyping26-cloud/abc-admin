"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface CashAccountItem {
  id?: string;
  _id?: string;
  accountName: string;
  description?: string;
  currency: string;
  openingBalance: number;
  status: "active" | "inactive";
  createdBy?: {
    name?: string;
    identifier?: string;
    role?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashTransactionItem {
  id: string;
  date: string | Date;
  type: string;
  category: "income" | "expense" | "transfer" | "deposit" | "withdrawal" | "invoice";
  reference: string;
  description: string;
  customerOrParty?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface CashManagerProps {
  getAuthHeaders?: () => Record<string, string>;
  user?: {
    id?: string;
    role?: string;
    identifier?: string;
  } | null;
  onNavigateTab?: (tab: any) => void;
}

export default function CashManager({ getAuthHeaders, user, onNavigateTab }: CashManagerProps) {
  let effectiveUser = user;
  if (!effectiveUser) {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("abc_admin_user") : null;
      if (raw) effectiveUser = JSON.parse(raw);
    } catch {}
  }
  const isMaster =
    effectiveUser?.role === "master_admin" ||
    effectiveUser?.role === "superadmin" ||
    effectiveUser?.identifier === "masteradmin@abc.com";
  const canDeleteData = isMaster || (effectiveUser as any)?.canDeleteData !== false;

  const [cashAccounts, setCashAccounts] = useState<CashAccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Cash Account & Transactions State
  const [selectedAccount, setSelectedAccount] = useState<CashAccountItem | null>(null);
  const [transactions, setTransactions] = useState<CashTransactionItem[]>([]);
  const [accountSummary, setAccountSummary] = useState<{
    openingBalance: number;
    totalCredit: number;
    totalDebit: number;
    currentBalance: number;
  } | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resolveHeaders = useCallback((): Record<string, string> => {
    if (getAuthHeaders) return getAuthHeaders();
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
  }, [getAuthHeaders, user]);

  // Fetch Cash Accounts from MongoDB
  const fetchCashAccounts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/cash-accounts`, {
        headers: resolveHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load cash accounts (${res.status})`);
      }
      const json = await res.json();
      if (json.data?.cashAccounts) {
        setCashAccounts(json.data.cashAccounts);
        // Default select first account if none is selected
        setSelectedAccount((prev) => prev || json.data.cashAccounts[0] || null);
      }
    } catch (err: unknown) {
      console.error("Error loading cash accounts:", err);
      setError(err instanceof Error ? err.message : "Error connecting to database");
    } finally {
      setIsLoading(false);
    }
  }, [resolveHeaders]);

  useEffect(() => {
    fetchCashAccounts();
    const handleUpdate = () => {
      fetchCashAccounts();
    };
    window.addEventListener("abc_cash_accounts_updated", handleUpdate);
    return () => {
      window.removeEventListener("abc_cash_accounts_updated", handleUpdate);
    };
  }, [fetchCashAccounts]);

  // Fetch Transactions for Selected Cash Account directly from MongoDB
  const fetchTransactions = useCallback(
    async (targetAccountName: string) => {
      setIsLoadingTransactions(true);
      setTransactionsError("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/admin/accounting/cash-transactions?accountName=${encodeURIComponent(targetAccountName)}`,
          { headers: resolveHeaders() }
        );
        if (!res.ok) {
          throw new Error(`Failed to load cash transactions (${res.status})`);
        }
        const json = await res.json();
        if (json.data?.transactions) {
          setTransactions(json.data.transactions);
        }
        if (json.data?.account) {
          setAccountSummary({
            openingBalance: json.data.account.openingBalance || 0,
            totalCredit: json.data.account.totalCredit || 0,
            totalDebit: json.data.account.totalDebit || 0,
            currentBalance: json.data.account.currentBalance ?? json.data.account.openingBalance,
          });
        }
      } catch (err: unknown) {
        console.error("Error loading cash transactions:", err);
        setTransactionsError(err instanceof Error ? err.message : "Error connecting to database");
      } finally {
        setIsLoadingTransactions(false);
      }
    },
    [resolveHeaders]
  );

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions(selectedAccount.accountName);
    } else {
      setTransactions([]);
      setAccountSummary(null);
    }
  }, [selectedAccount, fetchTransactions]);

  useEffect(() => {
    const handleTxUpdate = () => {
      if (selectedAccount) {
        fetchTransactions(selectedAccount.accountName);
      }
    };
    window.addEventListener("abc_cash_transactions_updated", handleTxUpdate);
    return () => {
      window.removeEventListener("abc_cash_transactions_updated", handleTxUpdate);
    };
  }, [selectedAccount, fetchTransactions]);

  // Delete Cash Account from MongoDB
  const handleDeleteAccount = async (id: string, name: string) => {
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
    if (name === "Main Cash") {
      alert("The primary 'Main Cash' register cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to remove '${name}' from MongoDB cash accounts?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/cash-accounts/${id}`, {
        method: "DELETE",
        headers: resolveHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to delete cash account");
      }

      setCashAccounts((prev) => prev.filter((b) => (b.id || b._id) !== id));
      setSelectedAccount((prev) => (prev && (prev.id === id || prev._id === id) ? null : prev));
      window.dispatchEvent(new Event("abc_cash_accounts_updated"));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete cash account");
    } finally {
      setDeletingId(null);
    }
  };

  const [filterType, setFilterType] = useState<"all" | "in" | "out" | "transfer">("all");

  const filteredTransactions = transactions.filter((tx) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matches =
        (tx.reference && tx.reference.toLowerCase().includes(q)) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        (tx.customerOrParty && tx.customerOrParty.toLowerCase().includes(q)) ||
        (tx.type && tx.type.toLowerCase().includes(q)) ||
        (tx.category && tx.category.toLowerCase().includes(q));
      if (!matches) return false;
    }

    if (filterType === "in") return tx.credit > 0;
    if (filterType === "out") return tx.debit > 0;
    if (filterType === "transfer") return tx.category === "transfer" || tx.type.toLowerCase().includes("bank");

    return true;
  });

  return (
    <div className="bank-manager-container" style={{ width: "100%" }}>
      {/* Header Row */}
      <div className="content-header-row bank-header-row">
        <div>
          <h1 className="content-title">Cash Transactions</h1>
          <p className="bank-header-subtitle">
            Live Cash In-Hand, Walk-in Payments, Customer Receipts &amp; Disbursements
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("abc_accounting_category", "finance");
                sessionStorage.setItem("abc_accounting_finance_action", "cash_transaction");
              } catch {}
              window.dispatchEvent(
                new CustomEvent("abc_navigate_accounting", {
                  detail: { category: "finance", financeAction: "cash_transaction" },
                })
              );
            }
            if (onNavigateTab) {
              onNavigateTab("accounting");
            }
          }}
          className="capsule-btn-black"
          style={{ backgroundColor: "#15803d" }}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Record Cash Entry</span>
        </button>
      </div>

      {/* ITEMS ABOVE TABLE: Financial Summary Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, margin: "16px 0" }}>
        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Opening Balance</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#475569", marginTop: 4 }}>
            {selectedAccount?.currency || "AED"}{" "}
            {Number(accountSummary?.openingBalance ?? selectedAccount?.openingBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
            Drawer starting cash ({selectedAccount?.accountName || "Main Cash"})
          </span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Cash In (+)</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
            +{selectedAccount?.currency || "AED"}{" "}
            {Number(accountSummary?.totalCredit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Walk-in, receipts &amp; payments</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Cash Out (-)</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
            -{selectedAccount?.currency || "AED"}{" "}
            {Number(accountSummary?.totalDebit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Disbursements &amp; bank deposits</span>
        </div>

        <div style={{ background: "#ffffff", padding: "14px 18px", borderRadius: 10, border: "2px solid #22c55e", boxShadow: "0 1px 4px rgba(34,197,94,0.12)" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>Net Cash In-Hand</span>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
            {selectedAccount?.currency || "AED"}{" "}
            {Number(accountSummary?.currentBalance ?? selectedAccount?.openingBalance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: 600 }}>Active drawer cash</span>
        </div>
      </div>

      {/* ITEMS ABOVE TABLE: Toolbar with Filter Pills + Register Switcher + Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        {/* Left: Filter Pills */}
        <div className="clients-filter-pills">
          <button
            type="button"
            className={`client-filter-pill ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            <span>All Cash ({transactions.length})</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterType === "in" ? "active" : ""}`}
            onClick={() => setFilterType("in")}
          >
            <span>⬇️ Cash In</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterType === "out" ? "active" : ""}`}
            onClick={() => setFilterType("out")}
          >
            <span>⬆️ Cash Out</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterType === "transfer" ? "active" : ""}`}
            onClick={() => setFilterType("transfer")}
          >
            <span>🏦 Bank Transfers</span>
          </button>
        </div>

        {/* Right: Register Switcher & Search Box */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {cashAccounts.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>Register:</span>
              <select
                className="admin-form-input"
                style={{ padding: "5px 10px", fontSize: "0.8rem", width: "auto" }}
                value={selectedAccount?.accountName || "Main Cash"}
                onChange={(e) => {
                  const acc = cashAccounts.find((a) => a.accountName === e.target.value);
                  if (acc) setSelectedAccount(acc);
                }}
              >
                {cashAccounts.map((a) => (
                  <option key={a.id || a._id || a.accountName} value={a.accountName}>
                    {a.accountName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bank-search-box" style={{ maxWidth: 320 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748b" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by ref #, customer, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bank-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="bank-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FULL-WIDTH TRANSACTIONS TABLE (Normal Format) */}
      <div className="admin-table-container" style={{ width: "100%", overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "105px" }}><span className="th-inner">Date</span></th>
              <th style={{ width: "120px" }}><span className="th-inner">Receipt / Ref</span></th>
              <th style={{ width: "135px" }}><span className="th-inner">Type</span></th>
              <th style={{ width: "170px" }}><span className="th-inner">Customer / Party</span></th>
              <th><span className="th-inner">Description / Remarks</span></th>
              <th style={{ textAlign: "right", width: "120px" }}><span className="th-inner">Cash In (+)</span></th>
              <th style={{ textAlign: "right", width: "120px" }}><span className="th-inner">Cash Out (-)</span></th>
              <th style={{ textAlign: "right", width: "130px" }}><span className="th-inner">Balance</span></th>
            </tr>
          </thead>
          <tbody>
            {isLoadingTransactions ? (
              <tr>
                <td colSpan={8} className="empty-admin-cell" style={{ padding: "40px 16px" }}>
                  <div className="db-spinner-svg" style={{ margin: "0 auto 8px" }}>
                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                      <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  Loading cash transactions from MongoDB...
                </td>
              </tr>
            ) : transactionsError ? (
              <tr>
                <td colSpan={8} className="empty-admin-cell" style={{ color: "#dc2626" }}>
                  {transactionsError} —{" "}
                  <button
                    onClick={() => selectedAccount && fetchTransactions(selectedAccount.accountName)}
                    className="text-blue-600 underline"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-admin-cell" style={{ padding: "44px 16px" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>💵</div>
                  <strong>No cash transactions found.</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Walk-in cash payments, cash invoices, cash incomes, cash expenses, and bank cash transfers will automatically show here.
                  </p>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span style={{ fontSize: "0.8rem", color: "#475569", whiteSpace: "nowrap" }}>
                      {new Date(tx.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>
                      {tx.reference}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`tx-badge tx-badge-${tx.category}`}
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 7px",
                        borderRadius: 4,
                        display: "inline-block",
                        fontWeight: 600,
                      }}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                      {tx.customerOrParty || "Walk-in Customer"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                      {tx.description}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {tx.credit > 0 ? (
                      <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.84rem" }}>
                        +{tx.credit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {tx.debit > 0 ? (
                      <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.84rem" }}>
                        -{tx.debit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "0.84rem",
                        fontWeight: 800,
                        color: tx.runningBalance >= 0 ? "#0f172a" : "#dc2626",
                      }}
                    >
                      {tx.runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
