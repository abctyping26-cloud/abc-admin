"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export type PersonnelType = "salesman" | "referrer" | "division" | "supplier";

export interface PersonnelItem {
  id: string;
  _id?: string;
  type: PersonnelType;
  name: string;
  phone?: string;
  code?: string;
  status: "active" | "inactive";
  createdAt?: string;
}

interface PersonnelManagerProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function PersonnelManager({ getAuthHeaders }: PersonnelManagerProps) {
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

  const [personnel, setPersonnel] = useState<PersonnelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<"all" | PersonnelType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<PersonnelType>("salesman");
  const [modalName, setModalName] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalCode, setModalCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Personnel from MongoDB
  const fetchPersonnel = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load personnel (${res.status})`);
      }
      const json = await res.json();
      if (json.data?.personnel) {
        setPersonnel(json.data.personnel);
      }
    } catch (err: unknown) {
      console.error("Error loading personnel:", err);
      setError(err instanceof Error ? err.message : "Error connecting to database");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchPersonnel();
    const handleUpdate = () => {
      fetchPersonnel();
    };
    window.addEventListener("abc_personnel_updated", handleUpdate);
    return () => {
      window.removeEventListener("abc_personnel_updated", handleUpdate);
    };
  }, [fetchPersonnel]);

  // Create Personnel in MongoDB
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      setModalError("Name is required.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: modalType,
          name: modalName.trim(),
          phone: modalPhone.trim(),
          code: modalCode.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to create record in database.");
      }

      if (json.data?.item) {
        setPersonnel((prev) => [json.data.item, ...prev]);
        window.dispatchEvent(new Event("abc_personnel_updated"));
      }

      setModalName("");
      setModalPhone("");
      setModalCode("");
      setIsModalOpen(false);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error creating record");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Personnel from MongoDB
  const handleDelete = async (id: string, name: string) => {
    if (!canDeleteData) {
      alert("Permission denied: Your worker admin account does not have permission to delete data.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${name}" from the database?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/personnel/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to delete record.");
      }

      setPersonnel((prev) => prev.filter((p) => p.id !== id && p._id !== id));
      window.dispatchEvent(new Event("abc_personnel_updated"));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete record");
    } finally {
      setDeletingId(null);
    }
  };

  // Filter Personnel
  const filteredItems = personnel.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.phone && item.phone.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q))
    );
  });

  const salesmanCount = personnel.filter((p) => p.type === "salesman").length;
  const referrerCount = personnel.filter((p) => p.type === "referrer").length;
  const divisionCount = personnel.filter((p) => p.type === "division").length;
  const supplierCount = personnel.filter((p) => p.type === "supplier").length;

  return (
    <div className="personnel-manager-container">
      {/* Top Toolbar: Filter Chips + Search + Create Button */}
      <div className="personnel-toolbar-row">
        <div className="personnel-filter-chips" role="tablist">
          <button
            type="button"
            className={`personnel-chip ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All <span className="chip-badge">{personnel.length}</span>
          </button>
          <button
            type="button"
            className={`personnel-chip ${filterType === "salesman" ? "active" : ""}`}
            onClick={() => setFilterType("salesman")}
          >
            👔 Salesmen <span className="chip-badge">{salesmanCount}</span>
          </button>
          <button
            type="button"
            className={`personnel-chip ${filterType === "referrer" ? "active" : ""}`}
            onClick={() => setFilterType("referrer")}
          >
            🤝 Referrers <span className="chip-badge">{referrerCount}</span>
          </button>
          <button
            type="button"
            className={`personnel-chip ${filterType === "division" ? "active" : ""}`}
            onClick={() => setFilterType("division")}
          >
            🏢 Divisions <span className="chip-badge">{divisionCount}</span>
          </button>
          <button
            type="button"
            className={`personnel-chip ${filterType === "supplier" ? "active" : ""}`}
            onClick={() => setFilterType("supplier")}
          >
            🚚 Suppliers <span className="chip-badge">{supplierCount}</span>
          </button>
        </div>

        <div className="personnel-actions-right">
          <div className="personnel-search-box">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748b" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, phone, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="personnel-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="personnel-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setModalType(filterType === "all" ? "salesman" : filterType);
              setIsModalOpen(true);
            }}
            className="capsule-btn-black"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Personnel / Division</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "130px" }}>
                <span className="th-inner">Role / Type</span>
              </th>
              <th>
                <span className="th-inner">Name</span>
              </th>
              <th>
                <span className="th-inner">Mobile / Number</span>
              </th>
              <th>
                <span className="th-inner">Code / Identifier</span>
              </th>
              <th>
                <span className="th-inner">Date Added</span>
              </th>
              <th style={{ textAlign: "right", width: "80px" }}>
                <span className="th-inner">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="empty-admin-cell">
                  Loading personnel from database...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="empty-admin-cell" style={{ color: "#dc2626" }}>
                  {error} — <button onClick={fetchPersonnel} className="text-blue-600 underline">Retry</button>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-admin-cell">
                  No {filterType === "all" ? "personnel or divisions" : filterType + "s"} found in database.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id || item._id}>
                  <td>
                    <span className={`personnel-role-badge badge-${item.type}`}>
                      {item.type === "salesman" && "👔 Salesman"}
                      {item.type === "referrer" && "🤝 Referrer"}
                      {item.type === "division" && "🏢 Division"}
                      {item.type === "supplier" && "🚚 Supplier"}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: "#0f172a" }}>{item.name}</strong>
                  </td>
                  <td>
                    {item.phone ? (
                      <span className="personnel-phone-text">{item.phone}</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td>
                    {item.code ? (
                      <span className="personnel-code-text">{item.code}</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canDeleteData && (
                      <button
                        type="button"
                        className="personnel-delete-btn"
                        onClick={() => handleDelete(item.id || item._id || "", item.name)}
                        disabled={deletingId === (item.id || item._id)}
                        title="Delete from database"
                      >
                        {deletingId === (item.id || item._id) ? "..." : "Delete"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" style={{ zIndex: 9999 }}>
          <div className="admin-modal-card personnel-create-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">+ Add New Personnel / Division</h2>
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
                <label className="admin-form-label">Category / Role *</label>
                <select
                  className="admin-form-input"
                  value={modalType}
                  onChange={(e) => setModalType(e.target.value as PersonnelType)}
                >
                  <option value="salesman">👔 Salesman</option>
                  <option value="referrer">🤝 Referrer (Referred By)</option>
                  <option value="division">🏢 Division</option>
                  <option value="supplier">🚚 Supplier</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  {modalType === "division"
                    ? "Division Name *"
                    : modalType === "supplier"
                    ? "Supplier Name *"
                    : "Full Name *"}
                </label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder={
                    modalType === "division"
                      ? "e.g. Typing Division"
                      : modalType === "supplier"
                      ? "e.g. Tasheel Center / Amer"
                      : "e.g. Ahmed Al Mansoori"
                  }
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {modalType !== "division" && (
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    {modalType === "supplier" ? "Contact Number / Mobile" : "Mobile / Phone Number"}
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. 050-1234567"
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                  />
                </div>
              )}

              {(modalType === "division" || modalType === "supplier") && (
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    {modalType === "supplier" ? "Supplier Code / TRN / Tax ID" : "Division Code / Identifier"}
                  </label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder={modalType === "supplier" ? "e.g. SUP-01 or 100-XXXX-XXXX" : "e.g. DIV-01"}
                    value={modalCode}
                    onChange={(e) => setModalCode(e.target.value)}
                  />
                </div>
              )}

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
