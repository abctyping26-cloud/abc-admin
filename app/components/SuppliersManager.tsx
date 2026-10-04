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

const DRAFT_STORAGE_KEY = "abc_supplier_form_draft";

interface SupplierDraftData {
  isEditing: boolean;
  editingId?: string;
  name: string;
  code: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export default function SuppliersManager({ getAuthHeaders }: SuppliersManagerProps) {
  // Current user permissions check
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

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline Content Form Box State (Zero Popups, Border Box in Content)
  const [isBoxOpen, setIsBoxOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields (All details preserved)
  const [modalName, setModalName] = useState("");
  const [modalCode, setModalCode] = useState("");
  const [modalCategory, setModalCategory] = useState("Stationery & Office");
  const [modalPhone, setModalPhone] = useState("");
  const [modalEmail, setModalEmail] = useState("");
  const [modalAddress, setModalAddress] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  // Drawer / View Details state
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
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to load suppliers from MongoDB.");
      }
      const list = json.data?.items || json.data?.personnel || [];
      setSuppliers(list);
    } catch (err: unknown) {
      console.error("Error loading suppliers:", err);
      setError(err instanceof Error ? err.message : "Error loading suppliers.");
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchSuppliers();
    const handleUpdate = () => {
      fetchSuppliers();
    };
    window.addEventListener("abc_personnel_updated", handleUpdate);
    return () => {
      window.removeEventListener("abc_personnel_updated", handleUpdate);
    };
  }, [fetchSuppliers]);

  // --------------------------------------------------------------------------
  // Draft Persistence: Restore draft on mount so work is never lost on refresh
  // --------------------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft: SupplierDraftData = JSON.parse(raw);
        if (
          draft &&
          (draft.name || draft.code || draft.phone || draft.email || draft.address || draft.notes)
        ) {
          setModalName(draft.name || "");
          setModalCode(draft.code || "");
          setModalCategory(draft.category || "Stationery & Office");
          setModalPhone(draft.phone || "");
          setModalEmail(draft.email || "");
          setModalAddress(draft.address || "");
          setModalNotes(draft.notes || "");
          setIsEditing(Boolean(draft.isEditing));
          setEditingId(draft.editingId || null);
          setIsBoxOpen(true);
          setHasDraft(true);
        }
      }
    } catch {}
  }, []);

  // --------------------------------------------------------------------------
  // Auto-Save Draft to localStorage whenever user modifies any input
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isBoxOpen) return;

    const hasContent = Boolean(
      modalName.trim() ||
      modalCode.trim() ||
      modalPhone.trim() ||
      modalEmail.trim() ||
      modalAddress.trim() ||
      modalNotes.trim()
    );

    if (hasContent) {
      const draft: SupplierDraftData = {
        isEditing,
        editingId: editingId || undefined,
        name: modalName,
        code: modalCode,
        category: modalCategory,
        phone: modalPhone,
        email: modalEmail,
        address: modalAddress,
        notes: modalNotes,
      };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setHasDraft(true);
      } catch {}
    }
  }, [
    isBoxOpen,
    isEditing,
    editingId,
    modalName,
    modalCode,
    modalCategory,
    modalPhone,
    modalEmail,
    modalAddress,
    modalNotes,
  ]);

  // Discard draft and reset form
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setHasDraft(false);
    setModalName("");
    setModalCode("");
    setModalCategory("Stationery & Office");
    setModalPhone("");
    setModalEmail("");
    setModalAddress("");
    setModalNotes("");
    setIsEditing(false);
    setEditingId(null);
    setModalError("");
    setIsBoxOpen(false);
  };

  // Open Form to Edit a Supplier
  const handleOpenEdit = (sup: SupplierItem) => {
    const id = sup.id || sup._id || "";
    setIsEditing(true);
    setEditingId(id);
    setModalName(sup.name || "");
    setModalCode(sup.code || "");
    setModalCategory(sup.category || "Stationery & Office");
    setModalPhone(sup.phone || "");
    setModalEmail(sup.email || "");
    setModalAddress(sup.address || "");
    setModalNotes(sup.notes || "");
    setModalError("");
    setIsBoxOpen(true);
  };

  // Submit Supplier to MongoDB (Create or Update)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      setModalError("Supplier name is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");

    const payload = {
      type: "supplier",
      name: modalName.trim(),
      code: modalCode.trim(),
      category: modalCategory.trim(),
      phone: modalPhone.trim(),
      email: modalEmail.trim(),
      address: modalAddress.trim(),
      notes: modalNotes.trim(),
    };

    try {
      const url = isEditing && editingId
        ? `${API_BASE_URL}/api/v1/admin/accounting/personnel/${editingId}`
        : `${API_BASE_URL}/api/v1/admin/accounting/personnel`;

      const method = isEditing && editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to save supplier to MongoDB.");
      }

      // Success: clear draft & close box
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
      setHasDraft(false);
      setModalName("");
      setModalCode("");
      setModalPhone("");
      setModalEmail("");
      setModalAddress("");
      setModalNotes("");
      setIsEditing(false);
      setEditingId(null);
      setIsBoxOpen(false);

      fetchSuppliers();
      window.dispatchEvent(new Event("abc_personnel_updated"));
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error saving supplier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Supplier from MongoDB
  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
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
        const errJson = await res.json().catch(() => null);
        alert(errJson?.message || "Failed to delete supplier from database.");
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
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code && s.code.toLowerCase().includes(q)) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="suppliers-manager-container" style={{ width: "100%" }}>
      {/* Header Row: Title on Left, Capsule Button on Right */}
      <div className="content-header-row">
        <div>
          <h1 className="content-title">Suppliers</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Vendors, Government Centers (Amer, Tasheel, DED, GDRFA) &amp; Service Providers
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isBoxOpen && !isEditing) {
              // Toggle close
              setIsBoxOpen(false);
            } else {
              setIsEditing(false);
              setEditingId(null);
              setIsBoxOpen(true);
            }
          }}
          className="capsule-btn-black"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{isBoxOpen && !isEditing ? "Close Box" : "Add Supplier"}</span>
        </button>
      </div>

      {/* Search Bar on the Left directly under Title */}
      <div style={{ margin: "16px 0 14px", display: "flex", justifyContent: "flex-start" }}>
        <div className="clients-search-box" style={{ maxWidth: "380px", width: "100%" }}>
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

      {/* -------------------------------------------------------------
          INLINE CREATE / EDIT BORDER BOX IN THE CONTENT SECTION
          (Zero popup overlays; auto-draft preserved across refreshes)
          ------------------------------------------------------------- */}
      {isBoxOpen && (
        <div
          className="supplier-content-box"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px 24px",
            marginTop: "16px",
            marginBottom: "20px",
            boxShadow: "none",
          }}
        >
          {/* Header of Content Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {isEditing ? "Edit Supplier" : "Add New Supplier"}
              </h2>

              {hasDraft && (
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#0369a1",
                    backgroundColor: "#e0f2fe",
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    border: "1px solid #bae6fd",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title="Form draft auto-saved in browser. Page refreshes will not wipe your in-progress inputs."
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#0284c7" }} />
                  Draft Auto-Saved (Refreshes Safe)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsBoxOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: "1.1rem",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
              aria-label="Close box"
              title="Hide box"
            >
              ✕
            </button>
          </div>

          {modalError && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                fontSize: "0.82rem",
                padding: "8px 12px",
                borderRadius: "6px",
                marginBottom: "16px",
                border: "1px solid #fecaca",
              }}
            >
              {modalError}
            </div>
          )}

          {/* Complete Supplier Details Form */}
          <form onSubmit={handleSaveSupplier}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Row 1: Name & Code */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
                <div className="admin-form-field">
                  <label className="admin-form-label">Supplier / Vendor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al Noor Stationery LLC, Amer Center Al Nahda, DEWA"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="admin-form-input"
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Code / Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. SUP-101"
                    value={modalCode}
                    onChange={(e) => setModalCode(e.target.value)}
                    className="admin-form-input"
                  />
                </div>
              </div>

              {/* Row 2: Category, Phone & Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "14px" }}>
                <div className="admin-form-field">
                  <label className="admin-form-label">Category</label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="admin-form-input"
                  >
                    <option value="Stationery & Office">Stationery &amp; Office</option>
                    <option value="Amer / Government">Amer / Government Center</option>
                    <option value="Tasheel / Labor">Tasheel / Labor</option>
                    <option value="Dubai Economy (DED)">Dubai Economy (DED)</option>
                    <option value="Utilities & Telecom">Utilities &amp; Telecom</option>
                    <option value="Private Vendor">Private Vendor / Equipment</option>
                    <option value="Other">Other Services</option>
                  </select>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+971 50 123 4567"
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    className="admin-form-input"
                  />
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="orders@supplier.com"
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    className="admin-form-input"
                  />
                </div>
              </div>

              {/* Row 3: Office Address / Location */}
              <div className="admin-form-field">
                <label className="admin-form-label">Office Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Area 3, Sharjah / Al Nahda 2, Dubai"
                  value={modalAddress}
                  onChange={(e) => setModalAddress(e.target.value)}
                  className="admin-form-input"
                />
              </div>

              {/* Row 4: Notes / Bank Details */}
              <div className="admin-form-field">
                <label className="admin-form-label">Notes &amp; Bank Details</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary vendor for A4 printing paper and printer toners. IBAN: AE0000000000000000..."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontFamily: "inherit",
                    fontSize: "0.88rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Row 5: Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "8px",
                  paddingTop: "14px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <div>
                  {hasDraft && (
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        padding: "6px 0",
                      }}
                    >
                      Discard Draft
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    type="button"
                    className="cancel-link-btn"
                    onClick={() => setIsBoxOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="capsule-btn-black"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Saving to MongoDB..."
                      : isEditing
                      ? "Update Supplier"
                      : "Save Supplier"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}


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
              <th style={{ textAlign: "right", width: "90px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="empty-admin-cell">
                  Loading suppliers from MongoDB...
                </td>
              </tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-admin-cell">
                  {error ? error : 'No suppliers found in database. Click "+ Add Supplier" above to register one.'}
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
                            {sup.email || (sup.phone ? `📞 ${sup.phone}` : "No email")}
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
                        {sup.phone ? `📞 ${sup.phone}` : sup.email ? sup.email : "—"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: sup.address ? "#334155" : "#94a3b8" }}>
                        {sup.address || "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          className="table-action-btn edit"
                          onClick={() => handleOpenEdit(sup)}
                          title="Edit Supplier"
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#ffffff",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#334155",
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        {canDeleteData && (
                          <button
                            type="button"
                            className="table-action-btn delete"
                            onClick={() => handleDeleteSupplier(id, sup.name)}
                            title="Delete Supplier from Database"
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              backgroundColor: "#fff5f5",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#dc2626",
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
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

      {/* SUPPLIER DETAIL DRAWER (View on row click) */}
      {activeSupplierDetail && (
        <div className="admin-modal-backdrop" onClick={() => setActiveSupplierDetail(null)}>
          <div
            className="admin-modal-box"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
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
                className="admin-modal-close-btn"
                onClick={() => setActiveSupplierDetail(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={{ paddingTop: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: "14px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Phone Number</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {activeSupplierDetail.phone || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Email Address</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {activeSupplierDetail.email || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Office Location</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {activeSupplierDetail.address || "—"}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Category</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {activeSupplierDetail.category || "Vendor"}
                  </span>
                </div>
              </div>

              {activeSupplierDetail.notes && (
                <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                  <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: 3 }}>
                    Notes &amp; Bank Details
                  </span>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", whiteSpace: "pre-wrap" }}>
                    {activeSupplierDetail.notes}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="cancel-link-btn"
                  onClick={() => setActiveSupplierDetail(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="capsule-btn-black"
                  onClick={() => {
                    const toEdit = activeSupplierDetail;
                    setActiveSupplierDetail(null);
                    handleOpenEdit(toEdit);
                  }}
                >
                  Edit Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
