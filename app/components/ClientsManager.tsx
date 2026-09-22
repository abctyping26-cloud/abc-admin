"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../config/api";

export interface ClientFile {
  _id?: string;
  public_id: string;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface ClientPhoto {
  public_id: string;
  url: string;
}

export interface ClientItem {
  id: string;
  identifier: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  pin: string;
  completed: boolean;
  photo?: ClientPhoto | null;
  files: ClientFile[];
  fileCount: number;
  source: "website" | "manual";
  createdBy?: {
    _id?: string;
    id?: string;
    name?: string;
    identifier?: string;
    role?: string;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

interface ClientsManagerProps {
  user: {
    id?: string;
    identifier?: string;
    role?: string;
    name?: string;
  } | null;
  isMaster: boolean;
}

function FileThumbnail({ file }: { file: ClientFile }) {
  const [thumbError, setThumbError] = useState(false);
  const isImage =
    file.fileType?.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.fileName);
  const isPdf =
    file.fileType?.includes("pdf") ||
    /\.pdf$/i.test(file.fileName);

  if (isImage) {
    return (
      <div className="file-preview-thumb-box image-thumb">
        {!thumbError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={file.url}
            alt={file.fileName}
            className="file-preview-thumb-img"
            loading="lazy"
            onError={() => setThumbError(true)}
          />
        ) : (
          <div className="file-thumb-generic">🖼️</div>
        )}
      </div>
    );
  }

  if (isPdf) {
    // Cloudinary can generate a rasterized image of the first page by replacing .pdf with .jpg
    const pdfThumbUrl = file.url.replace(/\.pdf(\?.*)?$/i, ".jpg$1");

    return (
      <div className="file-preview-thumb-box pdf-thumb">
        {!thumbError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={pdfThumbUrl}
            alt={file.fileName}
            className="file-preview-thumb-img"
            loading="lazy"
            onError={() => setThumbError(true)}
          />
        ) : (
          <div className="file-thumb-pdf-fallback">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
        )}
        <span className="file-badge-overlay pdf">PDF</span>
      </div>
    );
  }

  const isExcel =
    file.fileType?.includes("sheet") ||
    file.fileType?.includes("excel") ||
    /\.(xlsx?|csv)$/i.test(file.fileName);
  const isWord =
    file.fileType?.includes("word") ||
    /\.(docx?)$/i.test(file.fileName);

  return (
    <div className={`file-preview-thumb-box ${isExcel ? "excel-thumb" : isWord ? "word-thumb" : "doc-thumb"}`}>
      <span className="file-thumb-emoji">
        {isExcel ? "📊" : isWord ? "📝" : "📄"}
      </span>
      <span className={`file-badge-overlay ${isExcel ? "excel" : isWord ? "word" : "doc"}`}>
        {isExcel ? "XLS" : isWord ? "DOC" : "FILE"}
      </span>
    </div>
  );
}

export default function ClientsManager({ user, isMaster }: ClientsManagerProps) {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "in_progress" | "completed" | "website" | "manual">("all");

  const canDeleteClient = (client: ClientItem | null): boolean => {
    if (!client) return false;
    if (isMaster) return true;
    const creatorId = client.createdBy?._id || client.createdBy?.id;
    if (creatorId && user?.id && creatorId.toString() === user.id.toString()) return true;
    return false;
  };

  // Add Client Form State (Inline in content section)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addError, setAddError] = useState("");
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    pin: "",
    completed: false,
  });

  // Selected Client (Drawer / Details Modal)
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [isUpdatingClient, setIsUpdatingClient] = useState(false);

  // Mobile accordion card expansion tracking (shrunken by default)
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());

  const toggleClientExpand = (clientId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    pin: "",
    completed: false,
  });

  // File Upload State
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Status toggle inline loading
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Helper to build auth headers
  const getAuthHeaders = useCallback((): Record<string, string> => {
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
  }, [user]);

  // Initial load from MongoDB
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/api/v1/admin/clients`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.data?.clients) {
          setClients(data.data.clients);
        }
      })
      .catch((err) => {
        console.error("Error fetching clients from database:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getAuthHeaders]);

  // Filter clients locally for instant responsiveness
  const filteredClients = clients.filter((c) => {
    // Status / source filter
    if (filterTab === "in_progress" && c.completed) return false;
    if (filterTab === "completed" && !c.completed) return false;
    if (filterTab === "website" && c.source !== "website") return false;
    if (filterTab === "manual" && c.source !== "manual") return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.identifier && c.identifier.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.pin && c.pin.includes(q))
    );
  });

  // Metric counts
  const totalCount = clients.length;
  const completedCount = clients.filter((c) => c.completed).length;
  const inProgressCount = totalCount - completedCount;

  // Quick toggle completed status
  const handleToggleCompleted = async (clientId: string, currentCompleted: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTogglingClientId(clientId);
    try {
      const newStatus = !currentCompleted;
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients/${clientId}/status`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: newStatus }),
      });

      if (res.ok) {
        // Update local list
        setClients((prev) =>
          prev.map((c) => (c.id === clientId ? { ...c, completed: newStatus } : c))
        );
        if (selectedClient && selectedClient.id === clientId) {
          setSelectedClient((prev) => (prev ? { ...prev, completed: newStatus } : null));
          setEditFormData((prev) => ({ ...prev, completed: newStatus }));
        }
        window.dispatchEvent(new Event("abc_client_updated"));
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    } finally {
      setTogglingClientId(null);
    }
  };

  // Create new client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!newClient.name.trim() && !newClient.email.trim() && !newClient.phone.trim()) {
      setAddError("Please provide at least a Name, Phone number, or Email.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newClient),
      });

      const json = await res.json();
      if (!res.ok) {
        setAddError(json.message || "Failed to create client.");
        return;
      }

      // Add to list and close inline form
      if (json.data?.client) {
        setClients((prev) => [json.data.client, ...prev]);
        window.dispatchEvent(new Event("abc_client_updated"));
      }
      setIsAddFormOpen(false);
      setNewClient({
        name: "",
        email: "",
        phone: "",
        address: "",
        pin: "",
        completed: false,
      });
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Open details full content view
  const openClientDetails = async (client: ClientItem) => {
    setSelectedClient(client);
    setEditFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      pin: client.pin || "",
      completed: client.completed,
    });
    setUploadError("");
    setSaveSuccess(false);

    // Fetch fresh copy from MongoDB to ensure newest file attachments & details
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients/${client.id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.client) {
          setSelectedClient(json.data.client);
          setEditFormData({
            name: json.data.client.name || "",
            email: json.data.client.email || "",
            phone: json.data.client.phone || "",
            address: json.data.client.address || "",
            pin: json.data.client.pin || "",
            completed: json.data.client.completed,
          });
        }
      }
    } catch (err) {
      console.error("Error refreshing client details:", err);
    }
  };

  // Update client details
  const handleSaveClientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsUpdatingClient(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients/${selectedClient.id}`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (res.ok && json.data?.client) {
        const updated = json.data.client;
        setSelectedClient((prev) => (prev ? { ...prev, ...updated } : null));
        setClients((prev) =>
          prev.map((c) => (c.id === selectedClient.id ? { ...c, ...updated } : c))
        );
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        window.dispatchEvent(new Event("abc_client_updated"));
      }
    } catch (err) {
      console.error("Failed to update client:", err);
    } finally {
      setIsUpdatingClient(false);
    }
  };

  // Upload files list to Cloudinary
  const uploadFilesList = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || !selectedClient) return;

    setUploadError("");
    setIsUploadingFiles(true);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/clients/${selectedClient.id}/files`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      const json = await res.json();
      if (!res.ok) {
        setUploadError(json.message || "File upload failed.");
        return;
      }

      if (json.data?.files) {
        setSelectedClient((prev) =>
          prev ? { ...prev, files: json.data.files, fileCount: json.data.files.length } : null
        );
        setClients((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id
              ? { ...c, files: json.data.files, fileCount: json.data.files.length }
              : c
          )
        );
        window.dispatchEvent(new Event("abc_client_updated"));
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload files.");
    } finally {
      setIsUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFilesList(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFilesList(e.dataTransfer.files);
    }
  };

  // Delete file from Cloudinary and MongoDB
  const handleDeleteFile = async (fileId: string) => {
    if (!selectedClient) return;
    if (!window.confirm("Are you sure you want to permanently delete this file from cloud storage?")) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/clients/${selectedClient.id}/files/${fileId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const updatedFiles = json.data?.files || [];
        setSelectedClient((prev) =>
          prev ? { ...prev, files: updatedFiles, fileCount: updatedFiles.length } : null
        );
        setClients((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id
              ? { ...c, files: updatedFiles, fileCount: updatedFiles.length }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  // Upload Profile Photo to Cloudinary
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/clients/${selectedClient.id}/photo`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      const json = await res.json();
      if (res.ok && json.data?.photo) {
        setSelectedClient((prev) =>
          prev ? { ...prev, photo: json.data.photo } : null
        );
        setClients((prev) =>
          prev.map((c) =>
            c.id === selectedClient.id ? { ...c, photo: json.data.photo } : c
          )
        );
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // Delete entire client
  const handleDeleteClient = async (clientId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const target = clients.find((c) => c.id === clientId) || selectedClient;
    if (!canDeleteClient(target)) {
      alert("Only the creator or a Master Admin has permission to delete this client record.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this client? All associated files in Cloudinary will also be permanently deleted.")) {
      return;
    }

    setDeletingClientId(clientId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients/${clientId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== clientId));
        if (selectedClient && selectedClient.id === clientId) {
          setSelectedClient(null);
        }
        window.dispatchEvent(new Event("abc_client_updated"));
      } else {
        const errorData = await res.json().catch(() => null);
        alert(errorData?.message || "Failed to delete client record.");
      }
    } catch (err) {
      console.error("Failed to delete client:", err);
      alert("Network error: Could not reach the server to delete client.");
    } finally {
      setDeletingClientId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  return (
    <div className="clients-manager-container">
      {selectedClient ? (
        /* ====================================================================
           FULL-CONTENT CLIENT DETAILS & CLOUDINARY FILE MANAGER WORKSPACE
           (Replaces content section - no modal popup)
           ==================================================================== */
        <div className="client-details-content-view">
          {/* Top Navigation Bar */}
          <div className="client-details-top-bar">
            <button
              type="button"
              onClick={() => {
                setSelectedClient(null);
                setSaveSuccess(false);
              }}
              className="client-back-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back to Clients</span>
            </button>

            <div className="client-top-actions">
              <button
                type="button"
                onClick={() => handleToggleCompleted(selectedClient.id, selectedClient.completed)}
                disabled={togglingClientId === selectedClient.id}
                className={`client-status-btn ${selectedClient.completed ? "status-completed" : "status-in-progress"}`}
                title="Click to toggle service status in database"
              >
                <span className="status-dot" />
                <span>
                  {togglingClientId === selectedClient.id
                    ? "Updating..."
                    : selectedClient.completed
                    ? "Service Completed"
                    : "In Progress"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteClient(selectedClient.id)}
                disabled={deletingClientId === selectedClient.id || !canDeleteClient(selectedClient)}
                className="client-delete-action-btn"
                title={
                  canDeleteClient(selectedClient)
                    ? "Delete client and all Cloudinary files"
                    : "Only the creator or a Master Admin can delete this client"
                }
                style={{
                  opacity: canDeleteClient(selectedClient) ? 1 : 0.45,
                  cursor: canDeleteClient(selectedClient) ? "pointer" : "not-allowed",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Delete Client</span>
              </button>
            </div>
          </div>

          {/* Client Hero Card */}
          <div className="client-hero-card">
            <div className="client-hero-left">
              {/* Photo Upload Thumbnail */}
              <div className="client-photo-wrapper hero-photo">
                {selectedClient.photo?.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedClient.photo.url}
                    alt={selectedClient.name || "Client"}
                    className="client-photo-hero"
                  />
                ) : (
                  <div className="client-photo-hero-placeholder">
                    {selectedClient.name
                      ? selectedClient.name.substring(0, 2).toUpperCase()
                      : selectedClient.identifier.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="photo-upload-overlay-btn hero-photo-btn"
                  title="Upload profile photo to Cloudinary"
                >
                  {isUploadingPhoto ? "..." : "📷"}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
              </div>

              {/* Title & Metadata */}
              <div className="client-hero-info">
                <div className="client-hero-title-row">
                  <h1 className="client-hero-name">
                    {selectedClient.name || "Unnamed Client"}
                  </h1>
                  <span className={`client-status-badge ${selectedClient.completed ? "badge-completed" : "badge-in-progress"}`}>
                    {selectedClient.completed ? "✓ Completed" : "⏳ In Progress"}
                  </span>
                </div>

                <div className="client-hero-meta">
                  <span className="client-meta-tag">
                    <strong>ID:</strong> {selectedClient.identifier}
                  </span>
                  <span className="client-meta-separator">•</span>
                  <span className="client-meta-tag">
                    <span className={`client-source-pill ${selectedClient.source === "website" ? "automatic" : "manual"}`}>
                      {selectedClient.source === "website" ? "Automatic" : "Manual"}
                    </span>
                  </span>
                  {selectedClient.createdBy && (
                    <>
                      <span className="client-meta-separator">•</span>
                      <span className="client-meta-tag">
                        <strong>Added by:</strong> {selectedClient.createdBy.name || selectedClient.createdBy.identifier}
                      </span>
                    </>
                  )}
                  <span className="client-meta-separator">•</span>
                  <span className="client-meta-tag">
                    Added {new Date(selectedClient.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                  <span className="client-meta-separator">•</span>
                  <span className="client-meta-tag">
                    📎 {selectedClient.files?.length || 0} files in Cloudinary
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Profile on Left, Cloudinary Files on Right */}
          <div className="client-details-grid">
            {/* LEFT COLUMN: Profile Form */}
            <div className="client-card-section">
              <div className="client-card-header">
                <div>
                  <h2 className="client-card-title">Profile & Contact Information</h2>
                  <p className="client-card-subtitle">
                    Update phone, email, address, and service completion in MongoDB.
                  </p>
                </div>
              </div>

              {saveSuccess && (
                <div className="client-save-success-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Profile updated successfully in database!</span>
                </div>
              )}

              <form onSubmit={handleSaveClientDetails} className="client-edit-form">
                <div className="admin-form-field">
                  <label className="admin-form-label">Full Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="admin-form-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="admin-form-field">
                    <label className="admin-form-label">Phone Number</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="admin-form-input"
                    />
                  </div>

                  <div className="admin-form-field">
                    <label className="admin-form-label">Email Address</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="e.g. client@example.com"
                      className="admin-form-input"
                    />
                  </div>
                </div>

                <div className="admin-form-field">
                  <label className="admin-form-label">Street / Office Address</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="e.g. 42 Commercial Plaza, MG Road"
                    className="admin-form-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div className="admin-form-field">
                    <label className="admin-form-label">Postal / ZIP Code (PIN)</label>
                    <input
                      type="text"
                      value={editFormData.pin}
                      onChange={(e) => setEditFormData({ ...editFormData, pin: e.target.value })}
                      placeholder="e.g. 682001"
                      className="admin-form-input"
                    />
                  </div>

                  <div className="admin-form-field" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <label className="client-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editFormData.completed}
                        onChange={(e) => setEditFormData({ ...editFormData, completed: e.target.checked })}
                      />
                      <span>Mark Service Completed</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: "20px" }}>
                  <button
                    type="submit"
                    disabled={isUpdatingClient}
                    className="capsule-btn-black"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {isUpdatingClient ? "Saving Changes to Database..." : "Save Profile Details"}
                  </button>
                </div>
              </form>

              {/* Delete Client */}
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  disabled={deletingClientId === selectedClient.id || !canDeleteClient(selectedClient)}
                  className="client-delete-action-btn"
                  title={
                    canDeleteClient(selectedClient)
                      ? "Permanently delete this client"
                      : "Only the creator or a Master Admin can delete this client"
                  }
                  style={{
                    opacity: canDeleteClient(selectedClient) ? 1 : 0.45,
                    cursor: canDeleteClient(selectedClient) ? "pointer" : "not-allowed",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>{deletingClientId === selectedClient.id ? "Deleting..." : "Delete Client"}</span>
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: File Attachments */}
            <div className="client-card-section">
              <div className="client-card-header">
                <h2 className="client-card-title">Files & Documents</h2>
              </div>

              {uploadError && (
                <div className="admin-modal-error" style={{ marginBottom: "16px" }}>
                  {uploadError}
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                className={`cloudinary-upload-dropzone ${isDragging ? "dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                <div className="upload-dropzone-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="upload-dropzone-text">
                  <strong>
                    {isUploadingFiles
                      ? "Streaming to Cloudinary..."
                      : "Click or Drag & Drop files here to upload"}
                  </strong>
                  <span>
                    PDF, Word, Excel, Images, etc. (up to 25MB each)
                  </span>
                </div>
              </div>

              {/* Files List */}
              <div className="cloudinary-files-container">
                {selectedClient.files && selectedClient.files.length > 0 ? (
                  <div className="cloudinary-files-grid">
                    {selectedClient.files.map((file, idx) => (
                      <div key={file.public_id || file._id || idx} className="client-file-card">
                        <div className="file-card-main">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-thumb-link"
                            title={`Preview ${file.fileName}`}
                          >
                            <FileThumbnail file={file} />
                          </a>
                          <div className="file-details">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-title-link"
                              title={file.fileName}
                            >
                              {file.fileName}
                            </a>
                            <div className="file-meta-sub">
                              <span>{formatFileSize(file.fileSize)}</span>
                              <span>•</span>
                              <span>
                                {file.uploadedAt
                                  ? new Date(file.uploadedAt).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "Uploaded"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="file-actions-group">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-action-view-btn"
                            title="Open file in new tab (Cloudinary)"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            <span>View</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file._id || file.public_id)}
                            className="file-delete-btn"
                            title="Permanently delete from Cloudinary & Database"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-files-container">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    <h4>No files uploaded yet</h4>
                    <p>Upload invoices, ID proofs, contracts, or images to Cloudinary for this client.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Page Title & Actions */}
          <div className="content-header-row" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="content-title">Clients & File Management</h1>
          <p className="content-subtitle">
            Manage online users, offline client profiles, service completion statuses, and Cloudinary attachments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAddError("");
            setIsAddFormOpen((prev) => !prev);
          }}
          className={isAddFormOpen ? "capsule-btn-outline" : "capsule-btn-black"}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {isAddFormOpen ? (
            <>
              <span>✕</span>
              <span>Cancel</span>
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Client</span>
            </>
          )}
        </button>
      </div>

      {/* ====================================================================
          INLINE ADD CLIENT FORM (Inside content section, not a popup)
          ==================================================================== */}
      {isAddFormOpen && (
        <div className="client-inline-form-card">
          <div className="client-inline-form-header">
            <div>
              <h2 className="client-inline-form-title">Add New Client</h2>
              <p className="client-inline-form-subtitle">
                Create a client record with available details. You can add more info or attachments anytime.
              </p>
            </div>
            <button
              type="button"
              className="client-inline-close-btn"
              onClick={() => setIsAddFormOpen(false)}
              title="Close form"
            >
              ✕
            </button>
          </div>

          {addError && (
            <div className="admin-modal-error" style={{ marginBottom: "16px" }}>
              {addError}
            </div>
          )}

          <form onSubmit={handleCreateClient} className="admin-modal-form">
            <div className="admin-form-field">
              <label className="admin-form-label">Full Name</label>
              <input
                type="text"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="admin-form-input"
                autoFocus
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="admin-form-field">
                <label className="admin-form-label">Phone Number</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="admin-form-input"
                />
              </div>

              <div className="admin-form-field">
                <label className="admin-form-label">Email Address</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="e.g. client@example.com"
                  className="admin-form-input"
                />
              </div>
            </div>

            <div className="admin-form-field">
              <label className="admin-form-label">Street / Office Address</label>
              <input
                type="text"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                placeholder="e.g. 42 Commercial Plaza, MG Road"
                className="admin-form-input"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div className="admin-form-field">
                <label className="admin-form-label">Postal / ZIP Code (PIN)</label>
                <input
                  type="text"
                  value={newClient.pin}
                  onChange={(e) => setNewClient({ ...newClient, pin: e.target.value })}
                  placeholder="e.g. 682001"
                  className="admin-form-input"
                />
              </div>

              <div className="admin-form-field" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <label className="client-checkbox-label">
                  <input
                    type="checkbox"
                    checked={newClient.completed}
                    onChange={(e) => setNewClient({ ...newClient, completed: e.target.checked })}
                  />
                  <span>Service Already Completed?</span>
                </label>
              </div>
            </div>

            <div className="admin-modal-actions" style={{ marginTop: "24px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="capsule-btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="capsule-btn-black"
              >
                {isCreating ? "Saving to Database..." : "Create Client"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metric / Filter Tabs & Search Bar */}
      <div className="clients-toolbar">
        <div className="clients-filter-pills">
          <button
            type="button"
            className={`client-filter-pill ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All Clients <span className="pill-count">{totalCount}</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterTab === "in_progress" ? "active" : ""}`}
            onClick={() => setFilterTab("in_progress")}
          >
            <span className="legend-dot orange" />
            In Progress <span className="pill-count">{inProgressCount}</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterTab === "completed" ? "active" : ""}`}
            onClick={() => setFilterTab("completed")}
          >
            <span className="legend-dot green" />
            Completed <span className="pill-count">{completedCount}</span>
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterTab === "website" ? "active" : ""}`}
            onClick={() => setFilterTab("website")}
          >
            Automatic
          </button>
          <button
            type="button"
            className={`client-filter-pill ${filterTab === "manual" ? "active" : ""}`}
            onClick={() => setFilterTab("manual")}
          >
            Manual
          </button>
        </div>

        {/* Search Input */}
        <div className="clients-search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone, email, PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="clients-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Clients Table / Grid */}
      {isLoading ? (
        <div className="clients-empty-state">
          <div className="db-spinner-svg" style={{ margin: "0 auto 12px" }}>
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <circle cx="12" cy="12" r="10" stroke="#cbd5e1" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <p>Loading real-time records from MongoDB...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="clients-empty-state">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3>No clients found</h3>
          <p>
            {searchQuery
              ? `No records match your search query "${searchQuery}".`
              : "No clients currently in this category. Click 'Add Client' to create one."}
          </p>
        </div>
      ) : (
        <div className="clients-table-wrapper">
          {/* Status Legend Bar above the table box */}
          <div className="clients-table-legend-bar">
            <div className="legend-items">
              <span className="legend-title">Status:</span>
              <span className="legend-item">
                <span className="legend-dot orange" />
                <span>Orange for Progress</span>
              </span>
              <span className="legend-separator">•</span>
              <span className="legend-item">
                <span className="legend-dot green" />
                <span>Green for Completed</span>
              </span>
            </div>
            <span className="legend-hint">Click anywhere on a row to open files & details</span>
          </div>

          <div className="clients-table-card">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Address & PIN</th>
                  <th>Source</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Files</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const isToggling = togglingClientId === client.id;
                  const initials = client.name
                    ? client.name.substring(0, 2).toUpperCase()
                    : client.identifier.substring(0, 2).toUpperCase();

                  return (
                    <tr
                      key={client.id}
                      onClick={() => openClientDetails(client)}
                      className="client-table-row"
                    >
                      {/* Avatar & Name */}
                      <td>
                        <div className="client-identity-cell">
                          {client.photo?.url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={client.photo.url}
                              alt={client.name || "Client"}
                              className="client-avatar-img"
                            />
                          ) : (
                            <div className="client-avatar-placeholder">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="client-name-title">
                              {client.name || "Unnamed Client"}
                            </div>
                            <div className="client-id-sub">
                              ID: {client.identifier}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="client-contact-cell">
                          {client.phone && (
                            <div className="client-contact-item">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="client-contact-item">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                              <span>{client.email}</span>
                            </div>
                          )}
                          {!client.phone && !client.email && (
                            <span className="text-muted">—</span>
                          )}
                        </div>
                      </td>

                      {/* Address & PIN */}
                      <td>
                        <div className="client-address-cell">
                          <div>{client.address || "—"}</div>
                          {client.pin && <div className="client-pin-sub">PIN: {client.pin}</div>}
                        </div>
                      </td>

                      {/* Source Origin: Manual or Automatic */}
                      <td>
                        <span className={`client-source-pill ${client.source === "website" ? "automatic" : "manual"}`}>
                          {client.source === "website" ? "Automatic" : "Manual"}
                        </span>
                        {client.createdBy && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                            by {client.createdBy.name || client.createdBy.identifier}
                          </div>
                        )}
                      </td>

                      {/* Status: Color dot only (no text) */}
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleCompleted(client.id, client.completed, e)}
                          disabled={isToggling}
                          className={`client-status-dot-btn ${client.completed ? "status-green" : "status-orange"}`}
                          title={
                            isToggling
                              ? "Updating status in database..."
                              : client.completed
                              ? "Completed (Click to set In Progress)"
                              : "In Progress (Click to set Completed)"
                          }
                          aria-label={client.completed ? "Completed" : "In Progress"}
                        >
                          <span className="status-dot-indicator" />
                        </button>
                      </td>

                      {/* Files count */}
                      <td style={{ textAlign: "center" }}>
                        <div className="client-files-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                            <polyline points="13 2 13 9 20 9" />
                          </svg>
                          <span>{client.fileCount || client.files?.length || 0}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Card View (Default shrunken, expands on chevron click) */}
          <div className="clients-mobile-list">
            {filteredClients.map((client) => {
              const isExpanded = expandedClientIds.has(client.id);
              const isToggling = togglingClientId === client.id;
              const initials = client.name
                ? client.name.substring(0, 2).toUpperCase()
                : client.identifier.substring(0, 2).toUpperCase();

              return (
                <div
                  key={`mobile-${client.id}`}
                  className={`client-mobile-card ${isExpanded ? "is-expanded" : ""}`}
                >
                  {/* Shrunken Header: Name, Avatar, Status Dot & Angle Down Chevron */}
                  <div
                    className="client-mobile-card-header"
                    onClick={(e) => toggleClientExpand(client.id, e)}
                  >
                    <div className="client-mobile-header-left">
                      {client.photo?.url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={client.photo.url}
                          alt={client.name || "Client"}
                          className="client-avatar-img"
                        />
                      ) : (
                        <div className="client-avatar-placeholder">
                          {initials}
                        </div>
                      )}
                      <span className="client-mobile-name">
                        {client.name || "Unnamed Client"}
                      </span>
                    </div>

                    <div className="client-mobile-header-right">
                      <span
                        className={`client-mobile-status-dot ${client.completed ? "status-green" : "status-orange"}`}
                        title={client.completed ? "Completed" : "In Progress"}
                      />
                      <button
                        type="button"
                        className={`client-mobile-expand-btn ${isExpanded ? "rotated" : ""}`}
                        onClick={(e) => toggleClientExpand(client.id, e)}
                        aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Body: All Details matching Laptop view */}
                  {isExpanded && (
                    <div className="client-mobile-card-body">
                      {/* ID */}
                      <div className="client-mobile-detail-row">
                        <span className="detail-label">Client ID</span>
                        <span className="detail-value mono">{client.identifier}</span>
                      </div>

                      {/* Contact: Phone & Email */}
                      {(client.phone || client.email) && (
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Contact</span>
                          <div className="detail-value contact-group">
                            {client.phone && (
                              <div className="contact-item">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <span>{client.phone}</span>
                              </div>
                            )}
                            {client.email && (
                              <div className="contact-item">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                                <span>{client.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Address & PIN */}
                      {(client.address || client.pin) && (
                        <div className="client-mobile-detail-row">
                          <span className="detail-label">Address</span>
                          <div className="detail-value">
                            <div>{client.address || "—"}</div>
                            {client.pin && <div className="client-pin-sub">PIN: {client.pin}</div>}
                          </div>
                        </div>
                      )}

                      {/* Source */}
                      <div className="client-mobile-detail-row">
                        <span className="detail-label">Source</span>
                        <div className="detail-value">
                          <span className={`client-source-pill ${client.source === "website" ? "automatic" : "manual"}`}>
                            {client.source === "website" ? "Automatic" : "Manual"}
                          </span>
                          {client.createdBy && (
                            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                              by {client.createdBy.name || client.createdBy.identifier}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Toggle */}
                      <div className="client-mobile-detail-row">
                        <span className="detail-label">Status</span>
                        <div className="detail-value">
                          <button
                            type="button"
                            onClick={(e) => handleToggleCompleted(client.id, client.completed, e)}
                            disabled={isToggling}
                            className={`client-mobile-status-badge ${client.completed ? "status-green" : "status-orange"}`}
                            title="Tap to toggle status"
                          >
                            <span className="status-dot-indicator" />
                            <span>{client.completed ? "Completed" : "In Progress"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Files Count */}
                      <div className="client-mobile-detail-row">
                        <span className="detail-label">Attached Files</span>
                        <div className="detail-value">
                          <div className="client-files-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                              <polyline points="13 2 13 9 20 9" />
                            </svg>
                            <span>{client.fileCount || client.files?.length || 0} files</span>
                          </div>
                        </div>
                      </div>

                      {/* Open Files & Details Action Button */}
                      <button
                        type="button"
                        onClick={() => openClientDetails(client)}
                        className="client-mobile-open-btn"
                      >
                        <span>Open Files & Details</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

        </>
      )}
    </div>
  );
}
