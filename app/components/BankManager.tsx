"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface BankItem {
  id: string;
  _id?: string;
  bankName: string;
  accountName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  currency: string;
  openingBalance: number;
  status: "active" | "inactive";
  createdAt?: string;
}

export interface BankTransactionItem {
  id: string;
  date: string;
  type: string;
  category: "income" | "expense" | "transfer" | "deposit" | "withdrawal" | "invoice";
  reference: string;
  description: string;
  paymentType: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface BankManagerProps {
  getAuthHeaders?: () => Record<string, string>;
  user?: {
    id?: string;
    identifier?: string;
    role?: string;
    name?: string;
  } | null;
}

export default function BankManager({ getAuthHeaders, user }: BankManagerProps) {
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

  const [banks, setBanks] = useState<BankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Bank & Transactions State
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [bankSummary, setBankSummary] = useState<{
    openingBalance: number;
    totalCredit: number;
    totalDebit: number;
    currentBalance: number;
  } | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalBankName, setModalBankName] = useState("");
  const [modalAccountName, setModalAccountName] = useState("");
  const [modalAccountNumber, setModalAccountNumber] = useState("");
  const [modalIban, setModalIban] = useState("");
  const [modalSwiftCode, setModalSwiftCode] = useState("");
  const [modalCurrency, setModalCurrency] = useState("AED");
  const [modalOpeningBalance, setModalOpeningBalance] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
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

  // Fetch Banks from MongoDB
  const fetchBanks = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/banks`, {
        headers: resolveHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load banks (${res.status})`);
      }
      const json = await res.json();
      if (json.data?.banks) {
        setBanks(json.data.banks);
      }
    } catch (err: unknown) {
      console.error("Error loading banks:", err);
      setError(err instanceof Error ? err.message : "Error connecting to database");
    } finally {
      setIsLoading(false);
    }
  }, [resolveHeaders]);

  useEffect(() => {
    fetchBanks();
    const handleUpdate = () => {
      fetchBanks();
    };
    window.addEventListener("abc_banks_updated", handleUpdate);
    return () => {
      window.removeEventListener("abc_banks_updated", handleUpdate);
    };
  }, [fetchBanks]);

  // Fetch Transactions for Selected Bank directly from MongoDB
  const fetchTransactions = useCallback(
    async (targetBankName: string) => {
      setIsLoadingTransactions(true);
      setTransactionsError("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/admin/accounting/bank-transactions?bankName=${encodeURIComponent(targetBankName)}`,
          { headers: resolveHeaders() }
        );
        if (!res.ok) {
          throw new Error(`Failed to load bank transactions (${res.status})`);
        }
        const json = await res.json();
        if (json.data?.transactions) {
          setTransactions(json.data.transactions);
        }
        if (json.data?.bank) {
          setBankSummary({
            openingBalance: json.data.bank.openingBalance || 0,
            totalCredit: json.data.bank.totalCredit || 0,
            totalDebit: json.data.bank.totalDebit || 0,
            currentBalance: json.data.bank.currentBalance ?? json.data.bank.openingBalance,
          });
        }
      } catch (err: unknown) {
        console.error("Error loading bank transactions:", err);
        setTransactionsError(err instanceof Error ? err.message : "Error connecting to database");
      } finally {
        setIsLoadingTransactions(false);
      }
    },
    [resolveHeaders]
  );

  useEffect(() => {
    if (selectedBank) {
      fetchTransactions(selectedBank.bankName);
    } else {
      setTransactions([]);
      setBankSummary(null);
    }
  }, [selectedBank, fetchTransactions]);

  useEffect(() => {
    const handleTxUpdate = () => {
      if (selectedBank) {
        fetchTransactions(selectedBank.bankName);
      }
    };
    window.addEventListener("abc_bank_transactions_updated", handleTxUpdate);
    return () => {
      window.removeEventListener("abc_bank_transactions_updated", handleTxUpdate);
    };
  }, [selectedBank, fetchTransactions]);

  // Create Bank in MongoDB
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBankName.trim()) {
      setModalError("Bank name is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/banks`, {
        method: "POST",
        headers: {
          ...resolveHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankName: modalBankName.trim(),
          accountName: modalAccountName.trim(),
          accountNumber: modalAccountNumber.trim(),
          iban: modalIban.trim(),
          swiftCode: modalSwiftCode.trim(),
          currency: modalCurrency.trim() || "AED",
          openingBalance: Number(modalOpeningBalance) || 0,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to create bank");
      }

      const json = await res.json();
      if (json.data?.bank) {
        setBanks((prev) => [json.data.bank, ...prev]);
      }

      // Reset & Close
      setModalBankName("");
      setModalAccountName("");
      setModalAccountNumber("");
      setModalIban("");
      setModalSwiftCode("");
      setModalCurrency("AED");
      setModalOpeningBalance("0");
      setIsModalOpen(false);

      // Notify all components
      window.dispatchEvent(new Event("abc_banks_updated"));
    } catch (err: unknown) {
      console.error("Error creating bank:", err);
      setModalError(err instanceof Error ? err.message : "Error saving bank");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Bank from MongoDB
  const handleDelete = async (id: string, name: string) => {
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
    if (!confirm(`Are you sure you want to remove '${name}' from MongoDB banks?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/banks/${id}`, {
        method: "DELETE",
        headers: resolveHeaders(),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to delete bank");
      }

      setBanks((prev) => prev.filter((b) => (b.id || b._id) !== id));
      setSelectedBank((prev) => (prev && (prev.id === id || prev._id === id) ? null : prev));
      window.dispatchEvent(new Event("abc_banks_updated"));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete bank");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBanks = banks.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.bankName.toLowerCase().includes(q) ||
      (b.accountName && b.accountName.toLowerCase().includes(q)) ||
      (b.accountNumber && b.accountNumber.toLowerCase().includes(q)) ||
      (b.iban && b.iban.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bank-manager-container">
      {/* Header Row */}
      <div className="content-header-row bank-header-row">
        <div>
          <h1 className="content-title">Bank Accounts</h1>
          <p className="bank-header-subtitle">
            Manage corporate accounts, IBANs, and payment ledgers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setModalError("");
            setIsModalOpen(true);
          }}
          className="capsule-btn-black"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add Bank Account</span>
        </button>
      </div>

      {/* Toolbar: Search + Count */}
      <div className="bank-toolbar-row">
        <div className="bank-stats-chip">
          <span>Total Accounts:</span>
          <strong>{banks.length}</strong>
        </div>

        <div className="bank-search-box">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748b" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by bank name, IBAN, account #..."
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

      {/* Data Table / Split Layout */}
      <div className={selectedBank ? "bank-split-layout" : "bank-full-layout"}>
        {/* LEFT COLUMN: Bank Accounts List */}
        <div className="bank-list-panel">
          <div className="admin-table-container bank-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th><span className="th-inner">Bank Name</span></th>
                  {!selectedBank && <th><span className="th-inner">Account Holder</span></th>}
                  <th><span className="th-inner">{selectedBank ? "Account / IBAN" : "Account Number"}</span></th>
                  {!selectedBank && <th><span className="th-inner">IBAN / Swift</span></th>}
                  <th><span className="th-inner">Balance</span></th>
                  {!selectedBank && <th><span className="th-inner">Status</span></th>}
                  <th style={{ textAlign: "right", width: selectedBank ? "36px" : "48px" }}>
                    <span className="th-inner">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={selectedBank ? 4 : 7} className="empty-admin-cell">
                      <div className="db-spinner-svg" style={{ margin: "0 auto 8px" }}>
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                          <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </div>
                      Loading bank accounts from MongoDB...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={selectedBank ? 4 : 7} className="empty-admin-cell" style={{ color: "#dc2626" }}>
                      {error} — <button onClick={fetchBanks} className="text-blue-600 underline">Retry</button>
                    </td>
                  </tr>
                ) : filteredBanks.length === 0 ? (
                  <tr>
                    <td colSpan={selectedBank ? 4 : 7} className="empty-admin-cell">
                      {banks.length === 0
                        ? "No bank accounts added yet. Click '+ Add Bank Account' to create one."
                        : "No matching bank accounts found."}
                    </td>
                  </tr>
                ) : (
                  filteredBanks.map((item) => {
                    const isSelected = selectedBank?.bankName === item.bankName;
                    return (
                      <tr
                        key={item.id || item._id}
                        onClick={() => setSelectedBank(item)}
                        className={`bank-row-clickable ${isSelected ? "bank-row-active" : ""}`}
                        title="Click to view connected transactions"
                      >
                        <td>
                          <div className="bank-name-cell">
                            <div
                              className="bank-icon-avatar"
                              style={isSelected ? { background: "#dbeafe", borderColor: "#3b82f6" } : undefined}
                            >
                              🏦
                            </div>
                            <div>
                              <strong className="bank-name-text">{item.bankName}</strong>
                              {selectedBank && item.accountName && (
                                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{item.accountName}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {!selectedBank && (
                          <td>
                            <span className="bank-holder-text">{item.accountName || "—"}</span>
                          </td>
                        )}
                        <td>
                          {selectedBank ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span className="bank-mono-text" style={{ fontSize: "0.76rem" }}>
                                {item.accountNumber || "—"}
                              </span>
                              {item.iban && (
                                <span style={{ fontSize: "0.68rem", color: "#64748b", fontFamily: "monospace" }}>
                                  {item.iban}
                                </span>
                              )}
                            </div>
                          ) : item.accountNumber ? (
                            <span className="bank-mono-text">{item.accountNumber}</span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        {!selectedBank && (
                          <td>
                            {item.iban ? (
                              <div className="bank-iban-box">
                                <span className="bank-mono-text font-bold">{item.iban}</span>
                                {item.swiftCode && <span className="bank-swift-text">SWIFT: {item.swiftCode}</span>}
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>
                        )}
                        <td>
                          <span
                            className="bank-balance-tag"
                            style={selectedBank ? { fontSize: "0.76rem", padding: "2px 6px" } : undefined}
                          >
                            {item.currency}{" "}
                            {Number(item.openingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        {!selectedBank && (
                          <td>
                            <span className={`status-pill ${item.status === "active" ? "active" : "inactive"}`}>
                              {item.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                        )}
                        <td style={{ textAlign: "right" }}>
                          {canDeleteData && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id || item._id!, item.bankName);
                              }}
                              disabled={deletingId === (item.id || item._id)}
                              className="personnel-delete-btn"
                              title="Delete Bank Account"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
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
          {!selectedBank && filteredBanks.length > 0 && (
            <div style={{ marginTop: 8, fontSize: "0.76rem", color: "#64748b", textAlign: "center" }}>
              💡 <em>Tip: Click any bank in the list to inspect its connected transactions ledger on the right.</em>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Transactions Table for Selected Bank */}
        {selectedBank && (
          <div className="bank-transactions-panel">
            {/* Header */}
            <div className="bank-tx-header">
              <div className="bank-tx-title-area">
                <div
                  className="bank-icon-avatar"
                  style={{ width: 34, height: 34, background: "#ecfdf5", borderColor: "#a7f3d0", fontSize: "1rem" }}
                >
                  💳
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 className="bank-tx-title">{selectedBank.bankName}</h3>
                    <span className="status-pill active" style={{ fontSize: "0.68rem", padding: "1px 7px" }}>
                      Active
                    </span>
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: "#64748b" }}>
                    {selectedBank.accountNumber ? `A/C: ${selectedBank.accountNumber}` : ""}
                    {selectedBank.iban ? ` • IBAN: ${selectedBank.iban}` : ""}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="bank-tx-close-btn"
                  onClick={() => setSelectedBank(null)}
                  title="Close transactions panel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Financial Summary Row */}
            <div className="bank-tx-summary-row">
              <div className="bank-tx-summary-card">
                <span className="summary-card-label">Opening</span>
                <strong className="summary-card-val">
                  {selectedBank.currency}{" "}
                  {Number(bankSummary?.openingBalance ?? selectedBank.openingBalance).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div className="bank-tx-summary-card credit-card">
                <span className="summary-card-label">Total In (+)</span>
                <strong className="summary-card-val text-green">
                  +{selectedBank.currency}{" "}
                  {Number(bankSummary?.totalCredit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="bank-tx-summary-card debit-card">
                <span className="summary-card-label">Total Out (-)</span>
                <strong className="summary-card-val text-red">
                  -{selectedBank.currency}{" "}
                  {Number(bankSummary?.totalDebit || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="bank-tx-summary-card balance-card">
                <span className="summary-card-label">Net Balance</span>
                <strong className="summary-card-val text-balance">
                  {selectedBank.currency}{" "}
                  {Number(bankSummary?.currentBalance ?? selectedBank.openingBalance).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="admin-table-container" style={{ maxHeight: "540px", overflowY: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "95px" }}><span className="th-inner">Date</span></th>
                    <th style={{ width: "115px" }}><span className="th-inner">Ref / Type</span></th>
                    <th><span className="th-inner">Description / Party</span></th>
                    <th style={{ textAlign: "right", width: "100px" }}><span className="th-inner">In (+)</span></th>
                    <th style={{ textAlign: "right", width: "100px" }}><span className="th-inner">Out (-)</span></th>
                    <th style={{ textAlign: "right", width: "110px" }}><span className="th-inner">Balance</span></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTransactions ? (
                    <tr>
                      <td colSpan={6} className="empty-admin-cell" style={{ padding: "32px 16px" }}>
                        <div className="db-spinner-svg" style={{ margin: "0 auto 8px" }}>
                          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                            <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        </div>
                        Loading transactions for {selectedBank.bankName}...
                      </td>
                    </tr>
                  ) : transactionsError ? (
                    <tr>
                      <td colSpan={6} className="empty-admin-cell" style={{ color: "#dc2626" }}>
                        {transactionsError} —{" "}
                        <button
                          onClick={() => fetchTransactions(selectedBank.bankName)}
                          className="text-blue-600 underline"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-admin-cell" style={{ padding: "36px 16px" }}>
                        <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>📑</div>
                        <strong>No transactions connected to {selectedBank.bankName} yet.</strong>
                        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                          Incomes, expenses, customer invoices, and bank deposits/transfers mapped to this bank will automatically show here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
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
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span
                              className={`tx-badge tx-badge-${tx.category}`}
                              style={{
                                fontSize: "0.7rem",
                                padding: "1px 6px",
                                borderRadius: 4,
                                display: "inline-block",
                                width: "fit-content",
                              }}
                            >
                              {tx.reference || tx.type}
                            </span>
                            <span style={{ fontSize: "0.66rem", color: "#94a3b8" }}>{tx.type}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.82rem", color: "#1e293b", fontWeight: 500 }}>
                            {tx.description}
                          </div>
                          {tx.paymentType && (
                            <span style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "capitalize" }}>
                              Mode: {tx.paymentType}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {tx.credit > 0 ? (
                            <span className="bank-tx-credit">
                              +{Number(tx.credit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {tx.debit > 0 ? (
                            <span className="bank-tx-debit">
                              -{Number(tx.debit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="bank-tx-balance">
                            {Number(tx.runningBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create Bank */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="admin-modal-card bank-create-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">🏦 Add New Bank Account</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="admin-modal-body">
              {modalError && (
                <div className="personnel-modal-error">{modalError}</div>
              )}

              <div className="admin-form-group">
                <label className="admin-form-label">Bank Name *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. Emirates NBD, ADCB, FAB Bank"
                  value={modalBankName}
                  onChange={(e) => setModalBankName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Account Holder Name</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. ABC Documents Clearing LLC"
                  value={modalAccountName}
                  onChange={(e) => setModalAccountName(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Account Number</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. 101234567890"
                  value={modalAccountNumber}
                  onChange={(e) => setModalAccountNumber(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">IBAN Number</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. AE070331234567890123456"
                  value={modalIban}
                  onChange={(e) => setModalIban(e.target.value)}
                />
              </div>

              <div className="bank-modal-grid-2">
                <div className="admin-form-group">
                  <label className="admin-form-label">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. EBBDAEAD"
                    value={modalSwiftCode}
                    onChange={(e) => setModalSwiftCode(e.target.value)}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Currency</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="AED"
                    value={modalCurrency}
                    onChange={(e) => setModalCurrency(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="admin-form-input"
                  placeholder="0.00"
                  value={modalOpeningBalance}
                  onChange={(e) => setModalOpeningBalance(e.target.value)}
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving to DB..." : "Save to MongoDB"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
