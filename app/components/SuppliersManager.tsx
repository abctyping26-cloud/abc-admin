"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface SupplierItem {
  id: string;
  _id?: string;
  type: "supplier";
  name: string;
  phone?: string;
  code?: string;
  email?: string;
  address?: string;
  category?: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

interface SuppliersManagerProps {
  getAuthHeaders?: () => Record<string, string>;
  onNavigateTab?: (tab: any) => void;
}

export default function SuppliersManager({ getAuthHeaders, onNavigateTab }: SuppliersManagerProps) {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalName, setModalName] = useState("");
  const [modalCode, setModalCode] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [modalCategory, setModalCategory] = useState("Amer / Government");
  const [modalAddress, setModalAddress] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Detail Drawer / Modal State
  const [activeSupplierDetail, setActiveSupplierDetail] = useState<SupplierItem | null>(null);

  const getHeaders = useCallback(() => {
    if (getAuthHeaders) return getAuthHeaders();
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }, [getAuthHeaders]);

  // Fetch Suppliers from MongoDB (Collection: accounting-personnel)
  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel?type=supplier`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load suppliers (${res.status})`);
      }
      const json = await res.json();
      if (json.data?.personnel) {
        setSuppliers(json.data.personnel);
      }
    } catch (err: unknown) {
      console.error("Error loading suppliers:", err);
      setError(err instanceof Error ? err.message : "Error connecting to MongoDB database");
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchSuppliers();
    const handleUpdate = () => fetchSuppliers();
    window.addEventListener("abc_personnel_updated", handleUpdate);
    return () => window.removeEventListener("abc_personnel_updated", handleUpdate);
  }, [fetchSuppliers]);

  // Create Supplier in MongoDB
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      setModalError("Supplier name is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "supplier",
          name: modalName.trim(),
          code: modalCode.trim() || `SUP-${Math.floor(100 + Math.random() * 900)}`,
          phone: modalPhone.trim(),
          email: modalEmail.trim(),
          category: modalCategory,
          address: modalAddress.trim(),
          notes: modalNotes.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to create supplier in database.");
      }

      // Reset and close
      setModalName("");
      setModalCode("");
      setModalPhone("");
      setModalEmail("");
      setModalAddress("");
      setModalNotes("");
      setIsModalOpen(false);

      // Refresh real MongoDB list
      fetchSuppliers();
      window.dispatchEvent(new Event("abc_personnel_updated"));
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Failed to create supplier in database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Supplier from MongoDB
  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}" from MongoDB?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setSuppliers((prev) => prev.filter((s) => (s.id || s._id) !== id));
        if (activeSupplierDetail && (activeSupplierDetail.id === id || activeSupplierDetail._id === id)) {
          setActiveSupplierDetail(null);
        }
        window.dispatchEvent(new Event("abc_personnel_updated"));
      } else {
        alert("Failed to delete supplier from database.");
      }
    } catch (err) {
      console.error("Error deleting supplier:", err);
      alert("Error deleting supplier.");
    }
  };

  // Select all logic
  const handleSelectAll = () => {
    if (selectedIds.size === filteredSuppliers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSuppliers.map((s) => s.id || s._id || "")));
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

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q));

    const matchesCategory =
      filterCategory === "all" ||
      (s.category && s.category.toLowerCase().includes(filterCategory.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="suppliers-manager-container" style={{ width: "100%" }}>
      {/* Header Row: Title on Left, Capsule Button on Right (Worker Admins style) */}
      <div className="content-header-row">
        <div>
          <h1 className="content-title">Suppliers</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Vendors, Government Centers (Amer, Tasheel, DED, GDRFA) &amp; External Services
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
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Toolbar: Category Filter Pills + Search Box */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, margin: "16px 0", flexWrap: "wrap" }}>
        <div className="clients-filter-pills">
          <button
            type="button"
            className={`client-filter-pill ${filterCategory === "all" ? "active" : ""}`}
            onClick={() => setFilterCategory("all")}
          >
            <span>All Suppliers</span>
            <span className="pill-count">{suppliers.length}</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterCategory === "Amer" ? "active" : ""}`}
            onClick={() => setFilterCategory("Amer")}
          >
            <span>Amer / Gov Centers</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterCategory === "Utilities" ? "active" : ""}`}
            onClick={() => setFilterCategory("Utilities")}
          >
            <span>Utilities &amp; Telecom</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterCategory === "Private" ? "active" : ""}`}
            onClick={() => setFilterCategory("Private")}
          >
            <span>Private Vendors</span>
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
            placeholder="Search supplier by name, code, phone, email..."
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
                  checked={filteredSuppliers.length > 0 && selectedIds.size === filteredSuppliers.length}
                  onChange={handleSelectAll}
                  disabled={filteredSuppliers.length === 0}
                  aria-label="Select all suppliers"
                />
              </th>
              <th>
                <span className="th-inner">Supplier Name</span>
              </th>
              <th>
                <span className="th-inner">Category</span>
              </th>
              <th>
                <span className="th-inner">Code / Ref</span>
              </th>
              <th>
                <span className="th-inner">Phone &amp; Email</span>
              </th>
              <th>
                <span className="th-inner">Location / Address</span>
              </th>
              <th>
                <span className="th-inner">Status</span>
              </th>
              <th style={{ textAlign: "right", width: "80px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="empty-admin-cell">
                  Loading suppliers from MongoDB...
                </td>
              </tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-admin-cell">
                  {error ? error : "No suppliers found in database. Click \"+ Add Supplier\" above to register one."}
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((sup) => {
                const id = sup.id || sup._id || "";
                const initials = sup.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={id}
                    className="worker-admin-clickable-row"
                    onClick={() => setActiveSupplierDetail(sup)}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={selectedIds.has(id)}
                        onChange={() => handleToggleSelect(id)}
                        aria-label={`Select ${sup.name}`}
                      />
                    </td>
                    <td>
                      <div className="admin-user-cell">
                        <div
                          className="admin-avatar-photo"
                          style={{
                            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                            color: "#ffffff",
                            fontWeight: 700,
                          }}
                        >
                          {initials || "SU"}
                        </div>
                        <div className="admin-user-info">
                          <span className="admin-user-name">{sup.name}</span>
                          <span className="admin-user-email">
                            {sup.email || (sup.phone ? `📞 ${sup.phone}` : "No direct email")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="setup-pill completed" style={{ background: "#fef3c7", color: "#92400e" }}>
                        {sup.category || "Vendor"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", fontFamily: "monospace", fontWeight: 600, color: "#475569" }}>
                        {sup.code || "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                        {sup.phone ? `📞 ${sup.phone}` : "—"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: sup.address ? "#334155" : "#94a3b8" }}>
                        {sup.address || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`setup-pill ${sup.status === "active" ? "completed" : "pending"}`}>
                        {sup.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="erp-mini-btn"
                          onClick={() => setActiveSupplierDetail(sup)}
                          title="View Details & Transactions"
                        >
                          👁️
                        </button>
                        <button
                          type="button"
                          className="erp-mini-btn delete"
                          onClick={() => handleDeleteSupplier(id, sup.name)}
                          title="Delete Supplier from Database"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE SUPPLIER MODAL */}
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
              <h2 className="admin-modal-title">+ Add New Supplier</h2>
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

            <form onSubmit={handleCreateSupplier} className="admin-modal-body" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Supplier / Center Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amer Center Al Nahda, GDRFA, Tasheel, DEWA"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Category
                    </label>
                    <select
                      value={modalCategory}
                      onChange={(e) => setModalCategory(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    >
                      <option value="Amer / Government">Amer / Government Center</option>
                      <option value="Tasheel / Labor">Tasheel / Labor</option>
                      <option value="Dubai Economy (DED)">Dubai Economy (DED)</option>
                      <option value="Utilities & Telecom">Utilities &amp; Telecom</option>
                      <option value="Private Vendor">Private Vendor / Equipment</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Supplier Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SUP-001"
                      value={modalCode}
                      onChange={(e) => setModalCode(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+971 4 000 0000"
                      value={modalPhone}
                      onChange={(e) => setModalPhone(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="contact@supplier.com"
                      value={modalEmail}
                      onChange={(e) => setModalEmail(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Office Address / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Al Nahda 2, Dubai / Deira Branch"
                    value={modalAddress}
                    onChange={(e) => setModalAddress(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Notes / Bank Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="IBAN, contact person, or notes..."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
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
                  {isSubmitting ? "Saving to MongoDB..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER DETAIL DRAWER */}
      {activeSupplierDetail && (
        <div className="admin-modal-overlay" onClick={() => setActiveSupplierDetail(null)}>
          <div
            className="admin-modal-card"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="admin-avatar-photo"
                  style={{ background: "#ea580c", color: "#ffffff", fontWeight: 700 }}
                >
                  {activeSupplierDetail.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="admin-modal-title" style={{ fontSize: "1.1rem" }}>
                    {activeSupplierDetail.name}
                  </h2>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {activeSupplierDetail.category || "Supplier"} • Code: {activeSupplierDetail.code || "—"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setActiveSupplierDetail(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "18px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Phone Number</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {activeSupplierDetail.phone || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Email</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {activeSupplierDetail.email || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Address</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {activeSupplierDetail.address || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Account Status</span>
                  <span className={`setup-pill ${activeSupplierDetail.status === "active" ? "completed" : "pending"}`}>
                    {activeSupplierDetail.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {activeSupplierDetail.notes && (
                <div style={{ marginTop: 14, background: "#fffbeb", padding: "10px 14px", borderRadius: 6, border: "1px solid #fef3c7" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#b45309", display: "block" }}>Notes &amp; Banking Details:</span>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#78350f" }}>
                    {activeSupplierDetail.notes}
                  </p>
                </div>
              )}

              {/* Transactions with this Supplier */}
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                  Recent Transactions &amp; Payment Vouchers
                </h3>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "20px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem", background: "#f8fafc" }}>
                  Connected live to Payment Vouchers &amp; Expenses. Use &quot;Payment Voucher&quot; in Accounting Hub to record payments to this supplier.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="simple-cancel-btn"
                  onClick={() => setActiveSupplierDetail(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
