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

      {/* Data Table */}
      <div className="admin-table-container bank-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th><span className="th-inner">Bank Name</span></th>
              <th><span className="th-inner">Account Holder</span></th>
              <th><span className="th-inner">Account Number</span></th>
              <th><span className="th-inner">IBAN / Swift</span></th>
              <th><span className="th-inner">Currency & Balance</span></th>
              <th><span className="th-inner">Status</span></th>
              <th style={{ textAlign: "right", width: "48px" }}><span className="th-inner">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="empty-admin-cell">
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
                <td colSpan={7} className="empty-admin-cell" style={{ color: "#dc2626" }}>
                  {error} — <button onClick={fetchBanks} className="text-blue-600 underline">Retry</button>
                </td>
              </tr>
            ) : filteredBanks.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-admin-cell">
                  {banks.length === 0
                    ? "No bank accounts added yet. Click '+ Add Bank Account' to create one."
                    : "No matching bank accounts found."}
                </td>
              </tr>
            ) : (
              filteredBanks.map((item) => (
                <tr key={item.id || item._id}>
                  <td>
                    <div className="bank-name-cell">
                      <div className="bank-icon-avatar">🏦</div>
                      <div>
                        <strong className="bank-name-text">{item.bankName}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="bank-holder-text">{item.accountName || "—"}</span>
                  </td>
                  <td>
                    {item.accountNumber ? (
                      <span className="bank-mono-text">{item.accountNumber}</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
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
                  <td>
                    <span className="bank-balance-tag">
                      {item.currency} {Number(item.openingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${item.status === "active" ? "active" : "inactive"}`}>
                      {item.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canDeleteData && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id || item._id!, item.bankName)}
                        disabled={deletingId === (item.id || item._id)}
                        className="personnel-delete-btn"
                        title="Delete Bank Account"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
