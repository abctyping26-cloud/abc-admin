"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from "../config/api";

export interface RequiredDocItem {
  _id?: string;
  title: string;
  description: string;
  mandatory: boolean;
}

export interface FAQItem {
  _id?: string;
  question: string;
  answer: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  shortName: string;
}

export interface ServiceItem {
  _id?: string;
  slug: string;
  serviceId: string;
  name: string;
  category: ServiceCategory;
  tagline: string;
  requiredDocuments: RequiredDocItem[];
  faqs?: FAQItem[];
  isCustomized: boolean;
  order: number;
  updatedAt?: string;
  updatedBy?: {
    _id?: string;
    id?: string;
    name?: string;
    identifier?: string;
    role?: string;
  } | null;
}

interface ServicesManagerProps {
  user: {
    id?: string;
    identifier?: string;
    role?: string;
    name?: string;
  } | null;
  isMaster: boolean;
}

export default function ServicesManager({ user }: ServicesManagerProps) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "customized" | "default">("all");

  // Detail view state (In content area - NO popup modal)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  // Editing state for selected service
  const [editTagline, setEditTagline] = useState("");
  const [editDocs, setEditDocs] = useState<RequiredDocItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Add new document inline form state
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDesc, setNewDocDesc] = useState("");
  const [newDocMandatory, setNewDocMandatory] = useState(true);

  // Interactive preview state inside detail view
  const [previewCheckedDocs, setPreviewCheckedDocs] = useState<Record<number, boolean>>({});

  // Helper: admin authentication headers
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
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
  }, [user]);

  // Load all services from MongoDB
  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/services`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load services (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data?.services) {
        setServices(json.data.services);
      } else {
        throw new Error(json.message || "Failed to parse services data");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to backend database";
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Handle selecting a service -> open in content area
  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service);
    setEditTagline(service.tagline || "");
    setEditDocs(
      service.requiredDocuments
        ? service.requiredDocuments.map((d) => ({
            _id: d._id,
            title: d.title,
            description: d.description || "",
            mandatory: Boolean(d.mandatory),
          }))
        : []
    );
    setSaveSuccess(false);
    setErrorMessage(null);
    setConfirmReset(false);
    setIsAddingDoc(false);
    setNewDocTitle("");
    setNewDocDesc("");
    setNewDocMandatory(true);
    setPreviewCheckedDocs({});
  };

  // Close detail view -> back to list
  const handleBackToList = () => {
    setSelectedService(null);
    setSaveSuccess(false);
    setErrorMessage(null);
    setConfirmReset(false);
  };

  // Document checklist modification helpers
  const handleDocTitleChange = (index: number, val: string) => {
    setEditDocs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], title: val };
      return next;
    });
  };

  const handleDocDescChange = (index: number, val: string) => {
    setEditDocs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], description: val };
      return next;
    });
  };

  const handleToggleDocMandatory = (index: number) => {
    setEditDocs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], mandatory: !next[index].mandatory };
      return next;
    });
  };

  const handleMoveDocUp = (index: number) => {
    if (index === 0) return;
    setEditDocs((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDocDown = (index: number) => {
    if (index >= editDocs.length - 1) return;
    setEditDocs((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleDeleteDoc = (index: number) => {
    setEditDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    setEditDocs((prev) => [
      ...prev,
      {
        title: newDocTitle.trim(),
        description: newDocDesc.trim(),
        mandatory: newDocMandatory,
      },
    ]);

    setNewDocTitle("");
    setNewDocDesc("");
    setNewDocMandatory(true);
    setIsAddingDoc(false);
  };

  // Save changes to MongoDB
  const handleSaveChanges = async () => {
    if (!selectedService) return;

    // Validate that no document has an empty title
    for (let i = 0; i < editDocs.length; i++) {
      if (!editDocs[i].title.trim()) {
        setErrorMessage(`Document #${i + 1} cannot have an empty title.`);
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload = {
        tagline: editTagline.trim(),
        requiredDocuments: editDocs.map((d) => ({
          title: d.title.trim(),
          description: d.description.trim(),
          mandatory: Boolean(d.mandatory),
        })),
      };

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/services/${selectedService.slug}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update service in database");
      }

      const updatedService: ServiceItem = json.data.service;

      // Update local state
      setSelectedService(updatedService);
      setServices((prev) =>
        prev.map((s) => (s.slug === updatedService.slug ? updatedService : s))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving changes to database";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default baseline catalog
  const handleResetToDefault = async () => {
    if (!selectedService) return;

    setIsResetting(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/services/${selectedService.slug}/reset`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to reset service documentation");
      }

      const resetService: ServiceItem = json.data.service;

      // Update local state
      setSelectedService(resetService);
      setEditTagline(resetService.tagline || "");
      setEditDocs(
        resetService.requiredDocuments.map((d) => ({
          _id: d._id,
          title: d.title,
          description: d.description || "",
          mandatory: Boolean(d.mandatory),
        }))
      );
      setServices((prev) =>
        prev.map((s) => (s.slug === resetService.slug ? resetService : s))
      );
      setConfirmReset(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error resetting service";
      setErrorMessage(msg);
    } finally {
      setIsResetting(false);
    }
  };

  // Distinct categories list for filter dropdown
  const categoriesList = useMemo(() => {
    const map = new Map<string, string>();
    services.forEach((s) => {
      if (s.category?.id && s.category?.name) {
        map.set(s.category.id, s.category.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Category filter
      if (selectedCategory !== "all" && s.category?.id !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === "customized" && !s.isCustomized) return false;
      if (statusFilter === "default" && s.isCustomized) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCategory =
          s.category?.name.toLowerCase().includes(q) ||
          s.category?.shortName.toLowerCase().includes(q);
        const matchesDocs = s.requiredDocuments?.some((d) =>
          d.title.toLowerCase().includes(q)
        );
        const matchesTagline = s.tagline?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesDocs && !matchesTagline) {
          return false;
        }
      }

      return true;
    });
  }, [services, selectedCategory, statusFilter, searchQuery]);

  // Overall counts
  const totalCustomized = useMemo(
    () => services.filter((s) => s.isCustomized).length,
    [services]
  );
  const totalDocsCount = useMemo(
    () =>
      services.reduce(
        (acc, curr) => acc + (curr.requiredDocuments?.length || 0),
        0
      ),
    [services]
  );

  return (
    <div className="services-manager-container">
      {selectedService ? (
        /* ====================================================================
           IN-CONTENT SERVICE DETAILS & DOCUMENTATION WORKSPACE
           (Replaces content section - strictly NO popup modal)
           ==================================================================== */
        <div className="service-details-workspace">
          {/* Top Bar with Back and Actions */}
          <div className="service-details-top-bar">
            <button
              type="button"
              onClick={handleBackToList}
              className="client-back-btn"
              title="Return to Services List"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back to Services</span>
            </button>

            <div className="service-top-actions">
              <span
                className={`service-status-pill ${
                  selectedService.isCustomized ? "customized" : "default"
                }`}
              >
                {selectedService.isCustomized ? "⚡ Customized in DB" : "Standard Catalog"}
              </span>

              {/* View Live on Public Website */}
              <a
                href={`https://abctyping.ae/services/${selectedService.slug}`}
                target="_blank"
                rel="noreferrer"
                className="service-view-live-btn"
                title="View live service page in new tab"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>View on Website</span>
              </a>

              {/* Reset to Default Button */}
              {selectedService.isCustomized && (
                confirmReset ? (
                  <div className="service-confirm-reset-box">
                    <span className="reset-warn-text">Reset all docs to defaults?</span>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      disabled={isResetting}
                      className="service-confirm-reset-btn"
                    >
                      {isResetting ? "Resetting..." : "Yes, Reset"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      disabled={isResetting}
                      className="service-cancel-reset-btn"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="service-reset-btn"
                    title="Revert documentation checklist back to standard system catalog"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    <span>Reset to Defaults</span>
                  </button>
                )
              )}

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="service-save-btn"
              >
                {isSaving ? (
                  <>
                    <span className="service-save-spinner" />
                    <span>Saving to MongoDB...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Toast Notification Alert */}
          {saveSuccess && (
            <div className="service-alert-toast success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>Successfully saved documentation to MongoDB collection &apos;services&apos;! Live site reflects this immediately.</span>
            </div>
          )}

          {errorMessage && (
            <div className="service-alert-toast error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Service Header Info Card */}
          <div className="service-header-card">
            <div className="service-header-main">
              <div className="service-header-badge-row">
                <span className="service-category-tag">
                  {selectedService.category?.name || "General"}
                </span>
                <span className="service-id-tag">ID: {selectedService.serviceId}</span>
                <span className="service-slug-tag">/{selectedService.slug}</span>
              </div>
              <h1 className="service-title-display">{selectedService.name}</h1>
              {selectedService.updatedBy && (
                <p className="service-meta-text">
                  Last updated by <strong>{selectedService.updatedBy.name || selectedService.updatedBy.identifier}</strong> on{" "}
                  {selectedService.updatedAt
                    ? new Date(selectedService.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Recently"}
                </p>
              )}
            </div>

            <div className="service-tagline-box">
              <label htmlFor="service-tagline-input" className="service-label">
                Service Tagline (Displayed on Customer Hero)
              </label>
              <textarea
                id="service-tagline-input"
                className="service-tagline-textarea"
                rows={2}
                value={editTagline}
                onChange={(e) => setEditTagline(e.target.value)}
                placeholder="Brief description of the service displayed prominently to applicants..."
              />
            </div>
          </div>

          {/* Two-Column Editor Layout: Left is Checklist Editor, Right is Real Customer Preview */}
          <div className="service-editor-grid">
            {/* LEFT COLUMN: Checklist Manager */}
            <div className="service-editor-col">
              <div className="service-card-section">
                <div className="service-card-section-header">
                  <div>
                    <h2 className="service-section-title">
                      Required Documentation Checklist
                    </h2>
                    <p className="service-section-desc">
                      Configure the exact documents required for this service. You can edit titles, descriptions, reorder items, and mark requirements as Mandatory or Optional.
                    </p>
                  </div>
                  {!isAddingDoc && (
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(true)}
                      className="service-add-doc-trigger-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Add Document</span>
                    </button>
                  )}
                </div>

                {/* Inline Add Document Form */}
                {isAddingDoc && (
                  <form onSubmit={handleAddNewDoc} className="service-new-doc-form">
                    <div className="new-doc-form-header">
                      <span className="new-doc-form-title">Add New Document Requirement</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingDoc(false)}
                        className="new-doc-close-btn"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="new-doc-inputs">
                      <div className="form-group">
                        <label className="form-label">
                          Document Title <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          placeholder="e.g. Sponsor's Original Emirates ID & Passport Copy"
                          className="service-input"
                          autoFocus
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Description / Guidelines (Optional)</label>
                        <textarea
                          rows={2}
                          value={newDocDesc}
                          onChange={(e) => setNewDocDesc(e.target.value)}
                          placeholder="e.g. Valid residency visa page and Emirates ID."
                          className="service-textarea"
                        />
                      </div>

                      <div className="new-doc-toggle-row">
                        <label className="form-label mb-0">Requirement Type:</label>
                        <button
                          type="button"
                          onClick={() => setNewDocMandatory(!newDocMandatory)}
                          className={`doc-mandatory-toggle-btn ${newDocMandatory ? "is-mandatory" : "is-optional"}`}
                        >
                          <span className="doc-toggle-dot" />
                          <span>{newDocMandatory ? "MANDATORY" : "OPTIONAL"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="new-doc-actions">
                      <button
                        type="button"
                        onClick={() => setIsAddingDoc(false)}
                        className="service-btn-secondary"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="service-btn-primary">
                        Add to Checklist
                      </button>
                    </div>
                  </form>
                )}

                {/* Existing Documents List */}
                <div className="service-doc-items-list">
                  {editDocs.length === 0 ? (
                    <div className="service-doc-empty-state">
                      <p>No documents specified for this service yet.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddingDoc(true)}
                        className="service-btn-secondary"
                      >
                        + Add First Document
                      </button>
                    </div>
                  ) : (
                    editDocs.map((doc, idx) => (
                      <div key={idx} className="service-doc-edit-card">
                        {/* Left column: order index & reorder buttons */}
                        <div className="doc-order-controls">
                          <button
                            type="button"
                            onClick={() => handleMoveDocUp(idx)}
                            disabled={idx === 0}
                            className="doc-order-btn"
                            title="Move Up"
                            aria-label="Move document up"
                          >
                            ▲
                          </button>
                          <span className="doc-order-num">{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleMoveDocDown(idx)}
                            disabled={idx === editDocs.length - 1}
                            className="doc-order-btn"
                            title="Move Down"
                            aria-label="Move document down"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Middle: Title & Description inputs */}
                        <div className="doc-fields-main">
                          <div className="doc-title-row">
                            <input
                              type="text"
                              value={doc.title}
                              onChange={(e) => handleDocTitleChange(idx, e.target.value)}
                              placeholder="Document title (required)"
                              className="doc-title-input"
                              aria-label={`Title for document #${idx + 1}`}
                            />
                            {/* Mandatory toggle pill */}
                            <button
                              type="button"
                              onClick={() => handleToggleDocMandatory(idx)}
                              className={`doc-mandatory-toggle-btn ${
                                doc.mandatory ? "is-mandatory" : "is-optional"
                              }`}
                              title="Click to toggle Mandatory vs Optional"
                            >
                              <span className="doc-toggle-dot" />
                              <span>{doc.mandatory ? "MANDATORY" : "OPTIONAL"}</span>
                            </button>
                          </div>

                          <textarea
                            rows={2}
                            value={doc.description}
                            onChange={(e) => handleDocDescChange(idx, e.target.value)}
                            placeholder="Description, attestation guidelines, or instructions..."
                            className="doc-desc-textarea"
                            aria-label={`Description for document #${idx + 1}`}
                          />
                        </div>

                        {/* Right: Delete button */}
                        <div className="doc-delete-col">
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(idx)}
                            className="doc-remove-btn"
                            title="Remove this document from checklist"
                            aria-label={`Remove document #${idx + 1}`}
                          >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Add button */}
                {!isAddingDoc && editDocs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingDoc(true)}
                    className="service-add-doc-bottom-btn"
                  >
                    + Add Another Document
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Real-Time Live Preview */}
            <div className="service-preview-col">
              <div className="service-preview-sticky-box">
                <div className="service-preview-header">
                  <div className="preview-badge-row">
                    <span className="live-preview-pill">👁️ Live Customer Preview</span>
                    <span className="preview-note">Exactly as rendered on website</span>
                  </div>
                  <p className="preview-helper-text">
                    This preview automatically reflects your edits above. The design, fonts, checkboxes, and badges match the live public site.
                  </p>
                </div>

                {/* Render identical to ServiceDetailView.tsx */}
                <div className="preview-customer-checklist-container">
                  <div className="preview-checklist-top-label">
                    <div>
                      <span className="preview-kicker">CHECKLIST</span>
                      <h3 className="preview-heading">Required Documentation</h3>
                    </div>
                    <span className="preview-sub-hint">Click items to mark ready</span>
                  </div>

                  <div className="preview-cards-list">
                    {editDocs.length === 0 ? (
                      <div className="preview-no-docs">No documents to preview</div>
                    ) : (
                      editDocs.map((doc, idx) => {
                        const isChecked = !!previewCheckedDocs[idx];
                        return (
                          <div
                            key={idx}
                            className={`preview-doc-card ${isChecked ? "is-checked" : ""}`}
                            onClick={() =>
                              setPreviewCheckedDocs((p) => ({ ...p, [idx]: !p[idx] }))
                            }
                            role="button"
                            tabIndex={0}
                          >
                            <div className="preview-doc-main">
                              <div className="preview-doc-checkbox">
                                {isChecked && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <div className="preview-doc-text">
                                <h4 className="preview-doc-title">
                                  {doc.title || "Untitled Document"}
                                </h4>
                                {doc.description && (
                                  <p className="preview-doc-desc">{doc.description}</p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`preview-doc-badge ${
                                doc.mandatory ? "mandatory" : "optional"
                              }`}
                            >
                              {doc.mandatory ? "MANDATORY" : "OPTIONAL"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Bottom Save Reminder in Preview */}
                <div className="preview-save-banner">
                  <div className="save-banner-text">
                    <strong>{editDocs.length} Documents</strong> ({editDocs.filter((d) => d.mandatory).length} Mandatory)
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="service-save-btn btn-sm"
                  >
                    {isSaving ? "Saving..." : "Save to MongoDB"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ====================================================================
           SERVICES LIST WORKSPACE
           ==================================================================== */
        <div className="services-list-workspace">
          {/* Header Row */}
          <div className="content-header-row">
            <div>
              <h1 className="content-main-title">Services & Documentation</h1>
              <p className="content-sub-title">
                Manage required documentation checklists and prerequisites across all {services.length} official services.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="services-metrics-grid">
            <div className="service-metric-card">
              <span className="metric-label">Total Services</span>
              <span className="metric-value">{services.length || 69}</span>
              <span className="metric-sub">Across {categoriesList.length || 9} Categories</span>
            </div>
            <div className="service-metric-card">
              <span className="metric-label">Customized Checklists</span>
              <span className="metric-value text-accent">{totalCustomized}</span>
              <span className="metric-sub">Edited in MongoDB</span>
            </div>
            <div className="service-metric-card">
              <span className="metric-label">Standard Checklists</span>
              <span className="metric-value">{services.length - totalCustomized}</span>
              <span className="metric-sub">Using baseline catalog</span>
            </div>
            <div className="service-metric-card">
              <span className="metric-label">Total Required Documents</span>
              <span className="metric-value">{totalDocsCount}</span>
              <span className="metric-sub">Checklist items configured</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="services-toolbar">
            {/* Search Input */}
            <div className="services-search-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services, category names, or document titles..."
                className="services-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="services-search-clear"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Select */}
            <div className="services-filter-group">
              <label htmlFor="category-filter-select" className="filter-label">
                Category:
              </label>
              <select
                id="category-filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="services-category-select"
              >
                <option value="all">All Categories ({categoriesList.length})</option>
                {categoriesList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Buttons */}
            <div className="services-status-pills">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`status-filter-pill ${statusFilter === "all" ? "active" : ""}`}
              >
                All ({services.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("customized")}
                className={`status-filter-pill ${statusFilter === "customized" ? "active" : ""}`}
              >
                Customized ({totalCustomized})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("default")}
                className={`status-filter-pill ${statusFilter === "default" ? "active" : ""}`}
              >
                Default ({services.length - totalCustomized})
              </button>
            </div>
          </div>

          {/* Error Message */}
          {fetchError && (
            <div className="service-alert-toast error">
              <span>{fetchError}</span>
              <button
                type="button"
                onClick={fetchServices}
                className="service-btn-secondary btn-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="services-grid-skeleton">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="service-card-skeleton" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            /* Empty State */
            <div className="services-empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No services match your filters</h3>
              <p>Try searching for a different keyword or select &ldquo;All Categories&rdquo;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setStatusFilter("all");
                }}
                className="service-btn-secondary"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            /* Services Grid */
            <div className="services-cards-grid">
              {filteredServices.map((service) => {
                const docCount = service.requiredDocuments?.length || 0;
                const mandatoryCount =
                  service.requiredDocuments?.filter((d) => d.mandatory).length || 0;

                return (
                  <div
                    key={service.slug}
                    className={`service-overview-card ${service.isCustomized ? "is-customized" : ""}`}
                    onClick={() => handleSelectService(service)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectService(service);
                      }
                    }}
                  >
                    <div className="card-top-meta">
                      <span className="card-category-badge">
                        {service.category?.shortName || service.category?.name || "Service"}
                      </span>
                      {service.isCustomized ? (
                        <span className="card-customized-badge" title="Customized in database">
                          ⚡ Customized
                        </span>
                      ) : (
                        <span className="card-default-badge">Default</span>
                      )}
                    </div>

                    <h3 className="card-service-title">{service.name}</h3>

                    <p className="card-service-tagline">
                      {service.tagline || "Professional UAE government & typing service."}
                    </p>

                    <div className="card-bottom-footer">
                      <div className="card-doc-count-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>
                          {docCount} docs ({mandatoryCount} mandatory)
                        </span>
                      </div>

                      <span className="card-arrow-link">
                        Manage Docs →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
