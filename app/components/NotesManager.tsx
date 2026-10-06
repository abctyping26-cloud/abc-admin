"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import type { SidebarTab, AdminProject } from "./DashboardSidebar";

export interface NoteConnection {
  id: string;
  type: "client" | "invoice" | "file" | "number";
  title: string;
  value: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

export interface StickyNoteItem {
  _id: string;
  title: string;
  content: string;
  color: "yellow" | "green" | "blue" | "peach" | "purple" | "rose" | "dark";
  x: number;
  y: number;
  zIndex: number;
  width: number;
  height: number;
  isPinned: boolean;
  project: string;
  createdBy?: string;
  createdByName?: string;
  connections: NoteConnection[];
  createdAt: string;
  updatedAt: string;
}

interface NotesManagerProps {
  user: any;
  selectedProject: AdminProject;
  onNavigateTab?: (tab: SidebarTab) => void;
  onOpenInvoiceModal?: (invoiceData: any) => void;
}

const COLOR_CONFIG: Record<
  StickyNoteItem["color"],
  {
    name: string;
    bg: string;
    headerBg: string;
    border: string;
    text: string;
    titleColor: string;
    dotColor: string;
    chipBg: string;
    chipBorder: string;
  }
> = {
  yellow: {
    name: "Warm Yellow",
    bg: "#fef9c3",
    headerBg: "#fef08a",
    border: "#fde047",
    text: "#713f12",
    titleColor: "#422006",
    dotColor: "#eab308",
    chipBg: "rgba(254, 240, 138, 0.6)",
    chipBorder: "#facc15",
  },
  green: {
    name: "Mint Green",
    bg: "#dcfce7",
    headerBg: "#bbf7d0",
    border: "#86efac",
    text: "#14532d",
    titleColor: "#052e16",
    dotColor: "#22c55e",
    chipBg: "rgba(187, 247, 208, 0.6)",
    chipBorder: "#4ade80",
  },
  blue: {
    name: "Sky Blue",
    bg: "#e0f2fe",
    headerBg: "#bae6fd",
    border: "#7dd3fc",
    text: "#0c4a6e",
    titleColor: "#082f49",
    dotColor: "#0ea5e9",
    chipBg: "rgba(186, 230, 253, 0.6)",
    chipBorder: "#38bdf8",
  },
  peach: {
    name: "Coral Peach",
    bg: "#ffedd5",
    headerBg: "#fed7aa",
    border: "#fdba74",
    text: "#7c2d12",
    titleColor: "#431407",
    dotColor: "#f97316",
    chipBg: "rgba(254, 215, 170, 0.6)",
    chipBorder: "#fb923c",
  },
  purple: {
    name: "Lavender",
    bg: "#f3e8ff",
    headerBg: "#e9d5ff",
    border: "#d8b4fe",
    text: "#581c87",
    titleColor: "#3b0764",
    dotColor: "#a855f7",
    chipBg: "rgba(233, 213, 255, 0.6)",
    chipBorder: "#c084fc",
  },
  rose: {
    name: "Rose Pink",
    bg: "#ffe4e6",
    headerBg: "#fecdd3",
    border: "#fda4af",
    text: "#881337",
    titleColor: "#4c0519",
    dotColor: "#f43f5e",
    chipBg: "rgba(254, 205, 211, 0.6)",
    chipBorder: "#fb7185",
  },
  dark: {
    name: "Dark Slate",
    bg: "#1e293b",
    headerBg: "#0f172a",
    border: "#334155",
    text: "#e2e8f0",
    titleColor: "#f8fafc",
    dotColor: "#64748b",
    chipBg: "rgba(51, 65, 85, 0.7)",
    chipBorder: "#475569",
  },
};

export default function NotesManager({
  user,
  selectedProject,
  onNavigateTab,
  onOpenInvoiceModal,
}: NotesManagerProps) {
  const [notes, setNotes] = useState<StickyNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [maxZIndex, setMaxZIndex] = useState(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Connect Dialog Modal State
  const [activeConnectNoteId, setActiveConnectNoteId] = useState<string | null>(null);
  const [connectTab, setConnectTab] = useState<"client" | "invoice" | "file" | "number">("client");
  const [connectSearch, setConnectSearch] = useState("");
  const [connectClients, setConnectClients] = useState<any[]>([]);
  const [connectInvoices, setConnectInvoices] = useState<any[]>([]);
  const [isSearchingConnectables, setIsSearchingConnectables] = useState(false);

  // Number Dialog State
  const [numberType, setNumberType] = useState<"phone" | "amount" | "tracking" | "custom">("phone");
  const [numberValue, setNumberValue] = useState("");
  const [numberLabel, setNumberLabel] = useState("");

  // File Upload State
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview details modal
  const [previewItem, setPreviewItem] = useState<{
    type: "client" | "invoice" | "file" | "number";
    title: string;
    details: any;
  } | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);

  // Autosave debounce timer ref
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const getAuthToken = (): string => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("abc_admin_token") || "";
  };

  // Sync to fallback cache whenever notes change
  const syncToLocalCache = (updatedNotes: StickyNoteItem[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`abc_notes_${selectedProject}`, JSON.stringify(updatedNotes));
      } catch {}
    }
  };

  // Fetch all notes from database with local cache fallback
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();

      // Check fallback cache first for instant render
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(`abc_notes_${selectedProject}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setNotes(parsed);
              const highest = parsed.reduce((max: number, n: StickyNoteItem) => Math.max(max, n.zIndex || 0), 10);
              setMaxZIndex(highest + 1);
            }
          } catch {}
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_BASE_URL}/api/v1/admin/notes?project=${selectedProject}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data?.notes)) {
          setNotes(json.data.notes);
          syncToLocalCache(json.data.notes);
          const highest = json.data.notes.reduce((max: number, n: StickyNoteItem) => {
            return Math.max(max, n.zIndex || 0);
          }, 10);
          setMaxZIndex(highest + 1);
        }
      }
    } catch (err) {
      console.warn("Notes fetch from API failed or timed out (using cache):", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Create new note centered in canvas viewport
  const handleCreateNote = async () => {
    const workspaceEl = workspaceRef.current;
    const rect = workspaceEl?.getBoundingClientRect();

    const scrollLeft = workspaceEl?.scrollLeft || 0;
    const scrollTop = workspaceEl?.scrollTop || 0;
    const canvasW = rect?.width && rect.width > 200 ? rect.width : (typeof window !== "undefined" ? window.innerWidth - 80 : 800);
    const canvasH = rect?.height && rect.height > 200 ? rect.height : (typeof window !== "undefined" ? window.innerHeight - 120 : 600);

    // Stagger slightly so multiple creates don't perfectly overlap
    const randomOffset = (Math.random() - 0.5) * 60;
    const centerX = Math.max(20, Math.round((canvasW - 290) / 2 + scrollLeft + randomOffset));
    const centerY = Math.max(20, Math.round((canvasH - 260) / 2 + scrollTop + randomOffset));

    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);

    const tempId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newNote: StickyNoteItem = {
      _id: tempId,
      title: "",
      content: "",
      color: "yellow",
      x: centerX,
      y: centerY,
      zIndex: newZ,
      width: 290,
      height: 260,
      isPinned: false,
      project: selectedProject,
      createdBy: user?.id || "admin",
      createdByName: user?.name || user?.identifier || "Admin",
      connections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. INSTANT OPTIMISTIC DISPLAY: Note appears on canvas immediately
    setIsLoading(false);
    setColorFilter("all");
    setSearchQuery("");
    setNotes((prev) => {
      const next = [...prev, newNote];
      syncToLocalCache(next);
      return next;
    });
    showToast("Sticky note created");

    // 2. Persist to real backend
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "",
          content: "",
          color: "yellow",
          x: centerX,
          y: centerY,
          zIndex: newZ,
          project: selectedProject,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data?.note) {
          // Replace tempId with real MongoDB _id
          setNotes((prev) => {
            const updated = prev.map((n) =>
              n._id === tempId ? { ...json.data.note, ...n, _id: json.data.note._id } : n
            );
            syncToLocalCache(updated);
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn("Backend save deferred:", err);
    }
  };

  // Bring note to front on click / drag
  const bringToFront = (noteId: string) => {
    const newZ = maxZIndex + 1;
    setMaxZIndex(newZ);
    setNotes((prev) => {
      const next = prev.map((n) => (n._id === noteId ? { ...n, zIndex: newZ } : n));
      syncToLocalCache(next);
      return next;
    });

    const token = getAuthToken();
    fetch(`${API_BASE_URL}/api/v1/admin/notes/${noteId}/position`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ zIndex: newZ }),
    }).catch(() => {});
  };

  // Bulletproof Drag & Drop using Window Pointer Events
  const handlePointerDown = (note: StickyNoteItem, e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only primary mouse button

    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.closest(".note-connection-chip")
    ) {
      return;
    }

    bringToFront(note._id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = Number.isFinite(note.x) ? note.x : 100;
    const initialY = Number.isFinite(note.y) ? note.y : 100;
    let hasMoved = false;

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaX = moveEvt.clientX - startX;
      const deltaY = moveEvt.clientY - startY;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        hasMoved = true;
      }

      const nextX = Math.max(0, Math.round(initialX + deltaX));
      const nextY = Math.max(0, Math.round(initialY + deltaY));

      setNotes((prev) =>
        prev.map((n) => (n._id === note._id ? { ...n, x: nextX, y: nextY } : n))
      );
    };

    const onPointerUp = (upEvt: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (hasMoved) {
        const deltaX = upEvt.clientX - startX;
        const deltaY = upEvt.clientY - startY;
        const finalX = Math.max(0, Math.round(initialX + deltaX));
        const finalY = Math.max(0, Math.round(initialY + deltaY));

        setNotes((prev) => {
          const next = prev.map((n) =>
            n._id === note._id ? { ...n, x: finalX, y: finalY } : n
          );
          syncToLocalCache(next);
          return next;
        });

        // Persist final position in backend
        const token = getAuthToken();
        fetch(`${API_BASE_URL}/api/v1/admin/notes/${note._id}/position`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ x: finalX, y: finalY }),
        }).catch(() => {});
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Debounced update for title & content typing
  const handleTextChange = (noteId: string, field: "title" | "content", value: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n._id === noteId ? { ...n, [field]: value } : n));
      syncToLocalCache(next);
      return next;
    });

    if (saveTimeoutRef.current[noteId]) {
      clearTimeout(saveTimeoutRef.current[noteId]);
    }

    saveTimeoutRef.current[noteId] = setTimeout(async () => {
      try {
        const token = getAuthToken();
        await fetch(`${API_BASE_URL}/api/v1/admin/notes/${noteId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [field]: value }),
        });
      } catch (err) {
        console.warn("Auto-save sync deferred:", err);
      }
    }, 600);
  };

  // Change note color
  const handleChangeColor = async (noteId: string, color: StickyNoteItem["color"]) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n._id === noteId ? { ...n, color } : n));
      syncToLocalCache(next);
      return next;
    });

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/v1/admin/notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ color }),
      });
    } catch (err) {
      console.warn("Color update deferred:", err);
    }
  };

  // Toggle pin
  const handleTogglePin = async (noteId: string, currentPin: boolean) => {
    const nextPin = !currentPin;
    setNotes((prev) => {
      const next = prev.map((n) => (n._id === noteId ? { ...n, isPinned: nextPin } : n));
      syncToLocalCache(next);
      return next;
    });

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/v1/admin/notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPinned: nextPin }),
      });
    } catch (err) {
      console.warn("Pin toggle deferred:", err);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this sticky note?")) return;

    setNotes((prev) => {
      const next = prev.filter((n) => n._id !== noteId);
      syncToLocalCache(next);
      return next;
    });
    showToast("Note deleted");

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/v1/admin/notes/${noteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn("Delete note deferred:", err);
    }
  };

  // Search real clients and invoices from live backend endpoints
  const searchConnectables = useCallback(
    async (type: "client" | "invoice", query: string) => {
      try {
        setIsSearchingConnectables(true);
        const token = getAuthToken();
        const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        if (type === "client") {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/clients`, {
            headers: authHeader,
          });
          if (res.ok) {
            const json = await res.json();
            const allClients = json.data?.clients || [];
            const filtered = query.trim()
              ? allClients.filter(
                  (c: any) =>
                    (c.name || "").toLowerCase().includes(query.toLowerCase()) ||
                    (c.phone || "").toLowerCase().includes(query.toLowerCase()) ||
                    (c.identifier || "").toLowerCase().includes(query.toLowerCase())
                )
              : allClients;
            setConnectClients(
              filtered.slice(0, 25).map((c: any) => ({
                id: c.id || c._id,
                identifier: c.identifier,
                name: c.name || c.identifier || "Client",
                phone: c.phone || "",
                email: c.email || "",
                completed: c.completed,
              }))
            );
          }
        } else if (type === "invoice") {
          const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices`, {
            headers: authHeader,
          });
          if (res.ok) {
            const json = await res.json();
            const allInvoices = json.data?.invoices || [];
            const filtered = query.trim()
              ? allInvoices.filter(
                  (inv: any) =>
                    String(inv.invoiceNo || "").toLowerCase().includes(query.toLowerCase()) ||
                    String(inv.customer?.name || inv.customerName || "").toLowerCase().includes(query.toLowerCase())
                )
              : allInvoices;
            setConnectInvoices(
              filtered.slice(0, 25).map((inv: any) => ({
                id: inv.id || inv._id,
                invoiceNo: inv.invoiceNo,
                customerName: inv.customer?.name || inv.customerName || "Customer",
                grandTotal: inv.financialSummary?.grossAmount || inv.financialSummary?.total || inv.grandTotal || "0.00",
                status: inv.status || "Pending",
              }))
            );
          }
        }
      } catch (err) {
        console.warn("Search connectables failed:", err);
      } finally {
        setIsSearchingConnectables(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!activeConnectNoteId) return;
    if (connectTab === "client" || connectTab === "invoice") {
      const timer = setTimeout(() => {
        searchConnectables(connectTab, connectSearch);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [activeConnectNoteId, connectTab, connectSearch, searchConnectables]);

  // Connect client to active note
  const handleConnectClient = async (client: any) => {
    if (!activeConnectNoteId) return;

    const newConn: NoteConnection = {
      id: `conn_client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "client",
      title: client.name || client.identifier,
      value: client.id,
      subtitle: client.phone || client.email || "Client",
      metadata: {
        email: client.email,
        phone: client.phone,
        completed: client.completed,
      },
    };

    setNotes((prev) => {
      const next = prev.map((n) =>
        n._id === activeConnectNoteId
          ? { ...n, connections: [...(n.connections || []), newConn] }
          : n
      );
      syncToLocalCache(next);
      return next;
    });

    setActiveConnectNoteId(null);
    showToast(`Connected client "${client.name}"`);

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/v1/admin/notes/${activeConnectNoteId}/connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newConn),
      });
    } catch {}
  };

  // Connect invoice to active note
  const handleConnectInvoice = async (inv: any) => {
    if (!activeConnectNoteId) return;

    const newConn: NoteConnection = {
      id: `conn_inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "invoice",
      title: `Invoice #${inv.invoiceNo}`,
      value: inv.id,
      subtitle: `AED ${inv.grandTotal} (${inv.customerName})`,
      metadata: {
        invoiceNo: inv.invoiceNo,
        customerName: inv.customerName,
        grandTotal: inv.grandTotal,
        status: inv.status,
      },
    };

    setNotes((prev) => {
      const next = prev.map((n) =>
        n._id === activeConnectNoteId
          ? { ...n, connections: [...(n.connections || []), newConn] }
          : n
      );
      syncToLocalCache(next);
      return next;
    });

    setActiveConnectNoteId(null);
    showToast(`Connected invoice #${inv.invoiceNo}`);

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/v1/admin/notes/${activeConnectNoteId}/connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newConn),
      });
    } catch {}
  };

  // Connect number (phone, amount, tracking, etc.)
  const handleConnectNumber = async () => {
    if (!activeConnectNoteId || !numberValue.trim()) return;

    let titleLabel = "";
    if (numberType === "phone") {
      titleLabel = numberLabel.trim() || "Phone";
    } else if (numberType === "amount") {
      titleLabel = numberLabel.trim() || "Amount";
    } else if (numberType === "tracking") {
      titleLabel = numberLabel.trim() || "Tracking #";
    } else {
      titleLabel = numberLabel.trim() || "Number";
    }

    const newConn: NoteConnection = {
      id: `conn_num_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: "number",
      title: `${titleLabel}: ${numberValue.trim()}`,
      value: numberValue.trim(),
      subtitle: titleLabel,
      metadata: {
        numberType,
        label: titleLabel,
        rawNumber: numberValue.trim(),
      },
    };

    setNotes((prev) => {
      const next = prev.map((n) =>
        n._id === activeConnectNoteId
          ? { ...n, connections: [...(n.connections || []), newConn] }
          : n
      );
      syncToLocalCache(next);
      return next;
    });

    setActiveConnectNoteId(null);
    setNumberValue("");
    setNumberLabel("");
    showToast(`Added number "${numberValue.trim()}"`);

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/v1/admin/notes/${activeConnectNoteId}/connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newConn),
      });
    } catch {}
  };

  // Upload or attach file to note
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeConnectNoteId) return;

    try {
      setIsUploadingFile(true);
      const newConns: NoteConnection[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileUrl = URL.createObjectURL(file);
        const formatSize = (bytes: number) => {
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        };

        const fileConn: NoteConnection = {
          id: `conn_file_${Date.now()}_${i}`,
          type: "file",
          title: file.name,
          value: fileUrl,
          subtitle: formatSize(file.size),
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          },
        };
        newConns.push(fileConn);
      }

      setNotes((prev) => {
        const next = prev.map((n) =>
          n._id === activeConnectNoteId
            ? { ...n, connections: [...(n.connections || []), ...newConns] }
            : n
        );
        syncToLocalCache(next);
        return next;
      });

      setActiveConnectNoteId(null);
      showToast(`${newConns.length} file(s) attached`);

      // Attempt streaming to Cloudinary via backend if online
      try {
        const token = getAuthToken();
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append("files", files[i]);
        }
        await fetch(`${API_BASE_URL}/api/v1/admin/notes/${activeConnectNoteId}/files`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } catch {}
    } catch (err) {
      console.warn("File attachment deferred:", err);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Disconnect / remove connection
  const handleRemoveConnection = async (noteId: string, connId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setNotes((prev) => {
      const next = prev.map((n) =>
        n._id === noteId
          ? { ...n, connections: (n.connections || []).filter((c) => c.id !== connId) }
          : n
      );
      syncToLocalCache(next);
      return next;
    });

    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/api/v1/admin/notes/${noteId}/connections/${connId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {}
  };

  // Handle clicking a connection chip
  const handleConnectionClick = (conn: NoteConnection) => {
    if (conn.type === "file") {
      window.open(conn.value, "_blank");
      return;
    }

    if (conn.type === "number") {
      if (conn.metadata?.numberType === "phone") {
        const cleanPhone = conn.value.replace(/[^0-9]/g, "");
        const shouldCall = window.confirm(`Open WhatsApp conversation or copy number?\n\nNumber: ${conn.value}`);
        if (shouldCall) {
          window.open(`https://wa.me/${cleanPhone}`, "_blank");
        } else {
          navigator.clipboard.writeText(conn.value);
          showToast(`Copied ${conn.value}`);
        }
        return;
      }
      navigator.clipboard.writeText(conn.value);
      showToast(`Copied "${conn.value}" to clipboard`);
      return;
    }

    // Client or Invoice preview modal
    setPreviewItem({
      type: conn.type,
      title: conn.title,
      details: conn.metadata || {},
    });
  };

  // Filter notes by search query and color
  const filteredNotes = notes.filter((n) => {
    if (colorFilter !== "all" && n.color !== colorFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (n.title || "").toLowerCase().includes(q);
    const contentMatch = (n.content || "").toLowerCase().includes(q);
    const connMatch = (n.connections || []).some(
      (c) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.subtitle || "").toLowerCase().includes(q) ||
        (c.value || "").toLowerCase().includes(q)
    );
    return titleMatch || contentMatch || connMatch;
  });

  return (
    <div className="notes-canvas-container">
      {/* Toast Notification */}
      {toastMessage && <div className="notes-toast-pill">{toastMessage}</div>}

      {/* Floating Canvas Top Toolbar */}
      <header className="notes-canvas-toolbar" role="toolbar" aria-label="Notes Toolbar">
        <div className="notes-toolbar-left">
          <div className="notes-title-group">
            <div className="notes-title-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
                <path d="M15 3v6h6" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <div className="notes-title-meta">
              <span className="notes-header-title">Sticky Notes</span>
              <span className="notes-badge-count">{filteredNotes.length}</span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="notes-search-wrapper">
            <svg
              className="notes-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search notes, clients, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="notes-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="notes-search-clear-btn"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Color Filter Swatches */}
          <div className="notes-color-filter-group" title="Filter by note color">
            <button
              type="button"
              onClick={() => setColorFilter("all")}
              className={`notes-color-filter-chip ${colorFilter === "all" ? "active" : ""}`}
            >
              All
            </button>
            {(Object.keys(COLOR_CONFIG) as Array<StickyNoteItem["color"]>).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setColorFilter(col)}
                className={`notes-color-filter-dot ${colorFilter === col ? "active" : ""}`}
                style={{ backgroundColor: COLOR_CONFIG[col].dotColor }}
                title={COLOR_CONFIG[col].name}
              />
            ))}
          </div>
        </div>

        {/* Center / Right Action: Big '+' Add Sticky Note Button */}
        <div className="notes-toolbar-right">
          <button
            type="button"
            onClick={handleCreateNote}
            className="notes-create-btn"
            title="Create sticky note in center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Sticky Note</span>
          </button>
        </div>
      </header>

      {/* Infinite Canvas Workspace with Dot Grid Background */}
      <div className="notes-canvas-workspace" ref={workspaceRef}>
        {isLoading && notes.length === 0 ? (
          <div className="notes-loading-state">
            <div className="notes-spinner" />
            <span>Loading notes canvas...</span>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="notes-empty-state">
            <div className="notes-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
                <path d="M15 3v6h6" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
            </div>
            <h3>No Sticky Notes Found</h3>
            <p>
              {searchQuery || colorFilter !== "all"
                ? "Try clearing your search or color filter."
                : "Create your first sticky note in the center and drag it anywhere on the canvas!"}
            </p>
            <button type="button" onClick={handleCreateNote} className="notes-create-btn-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Note in Center</span>
            </button>
          </div>
        ) : null}

        {/* Draggable Sticky Notes */}
        {filteredNotes.map((note) => {
          const cfg = COLOR_CONFIG[note.color] || COLOR_CONFIG.yellow;
          const posX = Number.isFinite(note.x) ? note.x : 100;
          const posY = Number.isFinite(note.y) ? note.y : 100;

          return (
            <div
              key={note._id}
              className={`sticky-note-card color-${note.color} ${note.isPinned ? "is-pinned" : ""}`}
              style={{
                position: "absolute",
                left: `${posX}px`,
                top: `${posY}px`,
                zIndex: note.zIndex || 1,
                width: note.width || 290,
                backgroundColor: cfg.bg,
                borderColor: cfg.border,
                color: cfg.text,
              }}
              onPointerDown={(e) => handlePointerDown(note, e)}
              onClick={() => bringToFront(note._id)}
            >
              {/* Note Header / Drag Grip */}
              <div
                className="sticky-note-header"
                style={{ backgroundColor: cfg.headerBg, borderBottomColor: cfg.border }}
              >
                {/* Drag Grip Handle */}
                <div className="sticky-drag-handle" title="Drag to move anywhere">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="6" r="1.2" />
                    <circle cx="15" cy="6" r="1.2" />
                    <circle cx="9" cy="12" r="1.2" />
                    <circle cx="15" cy="12" r="1.2" />
                    <circle cx="9" cy="18" r="1.2" />
                    <circle cx="15" cy="18" r="1.2" />
                  </svg>
                </div>

                {/* Color Swatch Picker */}
                <div className="sticky-color-swatches">
                  {(Object.keys(COLOR_CONFIG) as Array<StickyNoteItem["color"]>).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeColor(note._id, c);
                      }}
                      className={`sticky-color-dot ${note.color === c ? "active" : ""}`}
                      style={{ backgroundColor: COLOR_CONFIG[c].dotColor }}
                      title={`Change color to ${COLOR_CONFIG[c].name}`}
                    />
                  ))}
                </div>

                {/* Pin Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePin(note._id, note.isPinned);
                  }}
                  className={`sticky-pin-btn ${note.isPinned ? "active" : ""}`}
                  title={note.isPinned ? "Unpin note" : "Pin note to top"}
                >
                  <svg viewBox="0 0 24 24" fill={note.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v10" />
                    <path d="m15 9 4 4" />
                    <path d="M5 13l4-4" />
                    <path d="M19 13v7" />
                  </svg>
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note._id);
                  }}
                  className="sticky-delete-btn"
                  title="Delete sticky note"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              {/* Note Content (Title & Body) */}
              <div className="sticky-note-body">
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={note.title}
                  onChange={(e) => handleTextChange(note._id, "title", e.target.value)}
                  className="sticky-title-input"
                  style={{ color: cfg.titleColor }}
                />
                <textarea
                  placeholder="Write your note, tasks, reminders..."
                  value={note.content}
                  onChange={(e) => handleTextChange(note._id, "content", e.target.value)}
                  className="sticky-content-textarea"
                  style={{ color: cfg.text }}
                  rows={4}
                />
              </div>

              {/* Connected Items Section (Clients, Invoices, Files, Numbers) */}
              <div className="sticky-connections-section">
                {note.connections && note.connections.length > 0 && (
                  <div className="sticky-connections-list">
                    {note.connections.map((conn) => (
                      <div
                        key={conn.id}
                        className={`note-connection-chip type-${conn.type}`}
                        style={{ backgroundColor: cfg.chipBg, borderColor: cfg.chipBorder }}
                        onClick={() => handleConnectionClick(conn)}
                        title={`Click to open ${conn.type}: ${conn.title}`}
                      >
                        <span className="conn-chip-icon" aria-hidden="true">
                          {conn.type === "client" && "👤"}
                          {conn.type === "invoice" && "📄"}
                          {conn.type === "file" && "📎"}
                          {conn.type === "number" && (conn.metadata?.numberType === "phone" ? "📞" : "🔢")}
                        </span>
                        <div className="conn-chip-text">
                          <span className="conn-chip-title">{conn.title}</span>
                          {conn.subtitle && <span className="conn-chip-sub">{conn.subtitle}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveConnection(note._id, conn.id, e)}
                          className="conn-chip-remove-btn"
                          title="Remove connection"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prominent '+' Connect Button inside the Note */}
                <div className="sticky-connect-trigger-row">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveConnectNoteId(note._id);
                      setConnectTab("client");
                      setConnectSearch("");
                    }}
                    className="sticky-add-connection-btn"
                    style={{ borderColor: cfg.border }}
                    title="Connect client, invoice, file, or number"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Connect item</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden File Input for File Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        style={{ display: "none" }}
      />

      {/* Connection Picker Modal / Popover */}
      {activeConnectNoteId && (
        <div
          className="connect-modal-backdrop"
          onClick={() => setActiveConnectNoteId(null)}
        >
          <div
            className="connect-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="connect-modal-header">
              <div className="connect-modal-title-group">
                <h3>Connect to Sticky Note</h3>
                <p>Link real commercial clients, invoices, files, or custom numbers.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveConnectNoteId(null)}
                className="connect-modal-close-btn"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {/* Connection Tabs */}
            <div className="connect-modal-tabs">
              <button
                type="button"
                onClick={() => setConnectTab("client")}
                className={`connect-tab-btn ${connectTab === "client" ? "active" : ""}`}
              >
                👤 Clients
              </button>
              <button
                type="button"
                onClick={() => setConnectTab("invoice")}
                className={`connect-tab-btn ${connectTab === "invoice" ? "active" : ""}`}
              >
                📄 Invoices
              </button>
              <button
                type="button"
                onClick={() => setConnectTab("file")}
                className={`connect-tab-btn ${connectTab === "file" ? "active" : ""}`}
              >
                📎 Files
              </button>
              <button
                type="button"
                onClick={() => setConnectTab("number")}
                className={`connect-tab-btn ${connectTab === "number" ? "active" : ""}`}
              >
                🔢 Numbers
              </button>
            </div>

            {/* Modal Body */}
            <div className="connect-modal-body">
              {/* TAB 1: CLIENTS */}
              {connectTab === "client" && (
                <div className="connect-tab-pane">
                  <div className="connect-search-box">
                    <input
                      type="text"
                      placeholder="Search client by name, phone, or email..."
                      value={connectSearch}
                      onChange={(e) => setConnectSearch(e.target.value)}
                      className="connect-search-input"
                      autoFocus
                    />
                  </div>

                  <div className="connect-list-container">
                    {isSearchingConnectables ? (
                      <div className="connect-loading">Searching clients...</div>
                    ) : connectClients.length === 0 ? (
                      <div className="connect-empty">No clients found matching query</div>
                    ) : (
                      connectClients.map((client) => (
                        <div
                          key={client.id}
                          className="connect-item-card"
                          onClick={() => handleConnectClient(client)}
                        >
                          <div className="connect-item-left">
                            <span className="connect-item-avatar">
                              {client.name ? client.name[0].toUpperCase() : "C"}
                            </span>
                            <div className="connect-item-meta">
                              <span className="connect-item-name">{client.name}</span>
                              <span className="connect-item-sub">
                                {client.phone || client.email || client.identifier}
                              </span>
                            </div>
                          </div>
                          <button type="button" className="connect-item-action-btn">
                            + Connect
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: INVOICES */}
              {connectTab === "invoice" && (
                <div className="connect-tab-pane">
                  <div className="connect-search-box">
                    <input
                      type="text"
                      placeholder="Search invoice by # or customer name..."
                      value={connectSearch}
                      onChange={(e) => setConnectSearch(e.target.value)}
                      className="connect-search-input"
                      autoFocus
                    />
                  </div>

                  <div className="connect-list-container">
                    {isSearchingConnectables ? (
                      <div className="connect-loading">Searching invoices...</div>
                    ) : connectInvoices.length === 0 ? (
                      <div className="connect-empty">No invoices found</div>
                    ) : (
                      connectInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="connect-item-card"
                          onClick={() => handleConnectInvoice(inv)}
                        >
                          <div className="connect-item-left">
                            <span className="connect-item-avatar invoice-avatar">INV</span>
                            <div className="connect-item-meta">
                              <span className="connect-item-name">Invoice #{inv.invoiceNo}</span>
                              <span className="connect-item-sub">
                                {inv.customerName} • AED {inv.grandTotal}
                              </span>
                            </div>
                          </div>
                          <button type="button" className="connect-item-action-btn">
                            + Connect
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FILES */}
              {connectTab === "file" && (
                <div className="connect-tab-pane">
                  <div className="connect-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <h4>Upload File to Sticky Note</h4>
                    <p>PDFs, Images, Word documents, Excel sheets</p>
                    <button
                      type="button"
                      className="connect-upload-btn"
                      disabled={isUploadingFile}
                    >
                      {isUploadingFile ? "Attaching..." : "Choose Files..."}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: NUMBERS */}
              {connectTab === "number" && (
                <div className="connect-tab-pane">
                  <div className="connect-number-form">
                    <div className="connect-form-group">
                      <label>Number Type</label>
                      <div className="connect-number-type-pills">
                        <button
                          type="button"
                          onClick={() => setNumberType("phone")}
                          className={`connect-pill-btn ${numberType === "phone" ? "active" : ""}`}
                        >
                          📞 Phone Number
                        </button>
                        <button
                          type="button"
                          onClick={() => setNumberType("amount")}
                          className={`connect-pill-btn ${numberType === "amount" ? "active" : ""}`}
                        >
                          💰 Amount / Currency
                        </button>
                        <button
                          type="button"
                          onClick={() => setNumberType("tracking")}
                          className={`connect-pill-btn ${numberType === "tracking" ? "active" : ""}`}
                        >
                          🏷️ Tracking / Ref #
                        </button>
                        <button
                          type="button"
                          onClick={() => setNumberType("custom")}
                          className={`connect-pill-btn ${numberType === "custom" ? "active" : ""}`}
                        >
                          🔢 Custom Number
                        </button>
                      </div>
                    </div>

                    <div className="connect-form-group">
                      <label>
                        {numberType === "phone" && "Phone Number (e.g. +971 50 123 4567)"}
                        {numberType === "amount" && "Amount (e.g. AED 1,250.00)"}
                        {numberType === "tracking" && "Tracking / Reference Code"}
                        {numberType === "custom" && "Value / Number"}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          numberType === "phone"
                            ? "+971 50 123 4567"
                            : numberType === "amount"
                            ? "AED 1,500.00"
                            : "REF-2026-0042"
                        }
                        value={numberValue}
                        onChange={(e) => setNumberValue(e.target.value)}
                        className="connect-form-input"
                        autoFocus
                      />
                    </div>

                    <div className="connect-form-group">
                      <label>Optional Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Client Mobile, Advance Payment, DHL Tracking..."
                        value={numberLabel}
                        onChange={(e) => setNumberLabel(e.target.value)}
                        className="connect-form-input"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleConnectNumber}
                      disabled={!numberValue.trim()}
                      className="connect-submit-btn"
                    >
                      Add Number to Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Item Dialog */}
      {previewItem && (
        <div className="connect-modal-backdrop" onClick={() => setPreviewItem(null)}>
          <div className="connect-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="connect-modal-header">
              <div className="connect-modal-title-group">
                <h3>{previewItem.title}</h3>
                <span className="connect-type-badge">{previewItem.type.toUpperCase()}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="connect-modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="connect-modal-body">
              <div className="preview-details-box">
                {Object.entries(previewItem.details).map(([k, v]) => (
                  <div key={k} className="preview-row">
                    <span className="preview-key">{k}:</span>
                    <span className="preview-val">{String(v)}</span>
                  </div>
                ))}
              </div>
              <div className="preview-actions">
                {previewItem.type === "client" && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewItem(null);
                      if (onNavigateTab) onNavigateTab("clients");
                    }}
                    className="preview-jump-btn"
                  >
                    Open in Clients Section →
                  </button>
                )}
                {previewItem.type === "invoice" && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewItem(null);
                      if (onNavigateTab) onNavigateTab("accounting_invoices");
                    }}
                    className="preview-jump-btn"
                  >
                    Open in Invoices Section →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
