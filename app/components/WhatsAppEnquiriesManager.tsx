"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface WhatsAppConversation {
  _id: string;
  customerPhone: string;
  customerName?: string;
  lastMessage?: string;
  lastMessageType: string;
  lastDirection: "incoming" | "outgoing";
  lastTimestamp: string;
  totalMessages: number;
  lastStatus: string;
  isPending: boolean;
  status: "pending" | "responded";
  firstMessage?: string;
  firstTimestamp?: string;
}

export interface WhatsAppMessageItem {
  _id: string;
  messageId: string;
  customerPhone: string;
  customerName?: string;
  direction: "incoming" | "outgoing";
  type: string;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFileName?: string;
  mediaFileSize?: number;
  status: string;
  timestamp: string;
}

export interface ActiveConversationDetail {
  customerPhone: string;
  customerName: string;
  isWindowOpen: boolean;
  lastIncomingTime: string | null;
  messages: WhatsAppMessageItem[];
}

interface WhatsAppEnquiriesManagerProps {
  user?: any;
  onPendingCountChange?: (count: number) => void;
}

export interface QuickReplyItem {
  _id: string;
  title: string;
  text: string;
  category?: string;
  order?: number;
  createdAt?: string;
}

export default function WhatsAppEnquiriesManager({
  onPendingCountChange,
}: WhatsAppEnquiriesManagerProps) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [counts, setCounts] = useState<{ total: number; pending: number; responded: number }>({
    total: 0,
    pending: 0,
    responded: 0,
  });
  const [filter, setFilter] = useState<"all" | "pending" | "responded">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ActiveConversationDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAutoPoll, setIsAutoPoll] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [directPhoneInput, setDirectPhoneInput] = useState("");
  const [showDirectPhoneBox, setShowDirectPhoneBox] = useState(false);

  // Quick Replies Dynamic State
  const [quickReplies, setQuickReplies] = useState<QuickReplyItem[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [activeView, setActiveView] = useState<"chats" | "replies">("chats");

  // New Quick Reply Form State
  const [newReplyTitle, setNewReplyTitle] = useState("");
  const [newReplyText, setNewReplyText] = useState("");
  const [newReplyCategory, setNewReplyCategory] = useState("general");
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [replyFormError, setReplyFormError] = useState<string | null>(null);
  const [replyFormSuccess, setReplyFormSuccess] = useState<string | null>(null);

  // Edit Quick Reply State
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [isUpdatingReply, setIsUpdatingReply] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll strictly inside the chat container (keeps page static without jumping)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeChat?.messages]);

  // Ensure window stays at top on mount without outer scrolling
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch conversations list from MongoDB
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/conversations`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConversations(json.data);
        if (json.counts) {
          setCounts(json.counts);
          onPendingCountChange?.(json.counts.pending || 0);
        }

        // Auto-select first conversation if none selected
        setSelectedPhone((currentSelected) => {
          if (!currentSelected && json.data.length > 0) {
            return json.data[0].customerPhone;
          }
          return currentSelected;
        });
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp conversations:", err);
    } finally {
      setIsLoadingList(false);
    }
  }, [onPendingCountChange]);

  // Fetch full message thread for the selected phone number
  const fetchActiveMessages = useCallback(async (phone: string) => {
    try {
      setIsChatLoading(true);
      const clean = phone.replace(/\D/g, "");
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/messages/${clean}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setActiveChat(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp messages for chat:", err);
    } finally {
      setIsChatLoading(false);
    }
  }, []);

  // Sync Meta WABA Webhook
  const handleSyncWaba = useCallback(async () => {
    setIsSubscribing(true);
    setSyncStatus(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/subscribe-waba`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSyncStatus("Meta WhatsApp Account linked successfully!");
      } else {
        setSyncStatus(json.error || json.message || "Failed to link Meta WABA account.");
      }
    } catch (err: any) {
      setSyncStatus(err.message || "Network error syncing Meta account.");
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-polling interval
  useEffect(() => {
    if (!isAutoPoll) return;

    const interval = setInterval(() => {
      fetchConversations();
      if (selectedPhone) {
        fetchActiveMessages(selectedPhone);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchActiveMessages, selectedPhone, isAutoPoll]);

  // When selected phone changes, fetch active messages
  useEffect(() => {
    if (selectedPhone) {
      fetchActiveMessages(selectedPhone);
    } else {
      setActiveChat(null);
    }
  }, [selectedPhone, fetchActiveMessages]);

  // Send WhatsApp Reply via Meta API
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPhone) {
      setSendError("Please select a recipient phone number first.");
      return;
    }
    if (!replyText.trim()) {
      setSendError("Reply message cannot be empty.");
      return;
    }

    setIsSending(true);
    setSendError(null);

    const messageToSend = replyText.trim();
    const phoneToUse = selectedPhone.replace(/\D/g, "");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: phoneToUse,
          text: messageToSend,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to deliver WhatsApp reply.");
      }

      setReplyText("");
      // Refresh chat & conversation list immediately
      await fetchActiveMessages(phoneToUse);
      await fetchConversations();
    } catch (err: any) {
      setSendError(err.message || "Error sending WhatsApp reply");
    } finally {
      setIsSending(false);
    }
  };

  // Delete Conversation Thread
  const handleDeleteConversation = async (phone: string) => {
    if (!confirm(`Are you sure you want to delete all messages with +${phone}? This action cannot be undone.`)) {
      return;
    }

    try {
      const clean = phone.replace(/\D/g, "");
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/conversations/${clean}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedPhone === phone) {
          setSelectedPhone(null);
          setActiveChat(null);
        }
        await fetchConversations();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Start chat with direct phone input
  const handleStartDirectChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directPhoneInput.replace(/\D/g, "");
    if (!clean) return;
    setSelectedPhone(clean);
    setDirectPhoneInput("");
    setShowDirectPhoneBox(false);
  };

  // Fetch Quick Replies from MongoDB
  const fetchQuickReplies = useCallback(async () => {
    try {
      setIsLoadingReplies(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/quick-replies`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setQuickReplies(json.data);
      }
    } catch (err) {
      console.error("Failed to load quick replies:", err);
    } finally {
      setIsLoadingReplies(false);
    }
  }, []);

  // Fetch quick replies on initial mount
  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  // Create new quick reply in MongoDB
  const handleCreateQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyTitle.trim() || !newReplyText.trim()) {
      setReplyFormError("Please enter both a title and message template.");
      return;
    }

    try {
      setIsSavingReply(true);
      setReplyFormError(null);
      setReplyFormSuccess(null);

      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/quick-replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newReplyTitle.trim(),
          text: newReplyText.trim(),
          category: newReplyCategory.trim() || "general",
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setReplyFormSuccess(`Quick reply "${json.data.title}" saved to database!`);
        setNewReplyTitle("");
        setNewReplyText("");
        setNewReplyCategory("general");
        await fetchQuickReplies();
      } else {
        setReplyFormError(json.message || "Failed to save quick reply");
      }
    } catch (err: any) {
      setReplyFormError(err?.message || "Failed to save quick reply");
    } finally {
      setIsSavingReply(false);
    }
  };

  // Start editing a quick reply
  const handleStartEditingReply = (reply: QuickReplyItem) => {
    setEditingReplyId(reply._id);
    setEditTitle(reply.title);
    setEditText(reply.text);
    setEditCategory(reply.category || "general");
  };

  // Save edited quick reply in MongoDB
  const handleSaveEditingReply = async (id: string) => {
    if (!editTitle.trim() || !editText.trim()) return;
    try {
      setIsUpdatingReply(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/quick-replies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          text: editText.trim(),
          category: editCategory.trim(),
        }),
      });
      if (res.ok) {
        setEditingReplyId(null);
        await fetchQuickReplies();
      }
    } catch (err) {
      console.error("Failed to update quick reply:", err);
    } finally {
      setIsUpdatingReply(false);
    }
  };

  // Delete quick reply from MongoDB
  const handleDeleteQuickReply = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the quick reply "${title}"?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/quick-replies/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchQuickReplies();
      }
    } catch (err) {
      console.error("Failed to delete quick reply:", err);
    }
  };

  // Apply Quick Reply snippet with dynamic variable substitution
  const handleApplySnippet = (template: string) => {
    let replaced = template;
    const customerName = activeChat?.customerName || "";
    const phone = selectedPhone ? `+${selectedPhone}` : "";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    replaced = replaced.replace(/\{\{\s*customerName\s*\}\}/gi, customerName || "there");
    replaced = replaced.replace(/\{\{\s*phone\s*\}\}/gi, phone);
    replaced = replaced.replace(/\{\{\s*date\s*\}\}/gi, dateStr);
    replaced = replaced.replace(/\{\{\s*time\s*\}\}/gi, timeStr);

    setReplyText(replaced);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    // Status filter
    if (filter === "pending" && !conv.isPending) return false;
    if (filter === "responded" && conv.isPending) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (q === "pending" && conv.isPending) return true;
      if (q === "responded" && !conv.isPending) return true;
      const phone = (conv.customerPhone || "").toLowerCase();
      const name = (conv.customerName || "").toLowerCase();
      const msg = (conv.lastMessage || "").toLowerCase();
      const first = (conv.firstMessage || "").toLowerCase();
      return phone.includes(q) || name.includes(q) || msg.includes(q) || first.includes(q);
    }

    return true;
  });

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
        ", " +
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      );
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      if (diffSec < 60) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  return (
    <div className="wa-manager-root">
      {/* Header Row */}
      <div className="content-header-row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="content-title" style={{ margin: 0 }}>
              WhatsApp Enquiries
            </h1>
            <span className="wa-status-badge live">
              <span className={`wa-pulse-dot ${isAutoPoll ? "pulsing" : "paused"}`} />
              {isAutoPoll ? "Live-Sync ON" : "Live-Sync Paused"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Quick Replies Manager Button (Left of Link Meta WABA) */}
          <button
            type="button"
            onClick={() => setActiveView((v) => (v === "replies" ? "chats" : "replies"))}
            className={`flat-secondary-btn ${activeView === "replies" ? "active-wa-view-btn" : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            title="Manage dynamic quick replies and variables in database"
          >
            <span>{activeView === "replies" ? "💬 Back to Chats" : "⚡ Quick Replies"}</span>
          </button>

          {/* Sync WABA Button */}
          <button
            type="button"
            onClick={handleSyncWaba}
            disabled={isSubscribing}
            className="flat-secondary-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            title="Link Meta WhatsApp Business Account to Webhook"
          >
            <span>{isSubscribing ? "Linking..." : "🔗 Link Meta WABA"}</span>
          </button>

          {/* Auto-poll Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoPoll((p) => !p)}
            className="flat-secondary-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            title="Toggle real-time auto-polling"
          >
            <span>{isAutoPoll ? "Pause Auto-Sync" : "Resume Auto-Sync"}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => {
              fetchConversations();
              if (selectedPhone) fetchActiveMessages(selectedPhone);
            }}
            disabled={isLoadingList}
            className="flat-secondary-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Refresh WhatsApp enquiries"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "14px", height: "14px" }}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{isLoadingList ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="wa-notification-bar">
          <span>{syncStatus}</span>
          <button
            type="button"
            onClick={() => setSyncStatus(null)}
            className="wa-notification-close"
          >
            &times;
          </button>
        </div>
      )}

      {/* View Switch: Quick Replies Manager vs Live Chat Split Container */}
      {activeView === "replies" ? (
        <div className="wa-quick-replies-view">
          <div className="wa-qr-header">
            <div>
              <h2 className="wa-qr-title">Quick Replies & Dynamic Variables</h2>
              <p className="wa-qr-subtitle">
                Create and manage custom response templates. Use variable placeholders like{" "}
                <code>{"{{customerName}}"}</code>, <code>{"{{phone}}"}</code>, <code>{"{{date}}"}</code>, and{" "}
                <code>{"{{time}}"}</code> that automatically fill with each customer&apos;s real information when clicked.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView("chats")}
              className="flat-secondary-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>← Back to Chats</span>
            </button>
          </div>

          <div className="wa-qr-split-grid">
            {/* Create New Quick Reply Form */}
            <div className="wa-qr-card form-card">
              <h3 className="wa-qr-section-title">+ Add Custom Quick Reply</h3>

              {replyFormError && (
                <div className="wa-qr-alert error">{replyFormError}</div>
              )}
              {replyFormSuccess && (
                <div className="wa-qr-alert success">{replyFormSuccess}</div>
              )}

              <form onSubmit={handleCreateQuickReply} className="wa-qr-form">
                <div className="wa-qr-form-group">
                  <label className="wa-qr-label">Title / Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Greeting, Payment Link, Location"
                    value={newReplyTitle}
                    onChange={(e) => setNewReplyTitle(e.target.value)}
                    className="wa-qr-input"
                    required
                  />
                </div>

                <div className="wa-qr-form-group">
                  <label className="wa-qr-label">Category</label>
                  <select
                    value={newReplyCategory}
                    onChange={(e) => setNewReplyCategory(e.target.value)}
                    className="wa-qr-select"
                  >
                    <option value="general">General</option>
                    <option value="documents">Documents</option>
                    <option value="pricing">Pricing & Quotes</option>
                    <option value="updates">Status Updates</option>
                    <option value="services">Services</option>
                  </select>
                </div>

                <div className="wa-qr-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label className="wa-qr-label" style={{ margin: 0 }}>Message Template</label>
                    <span className="wa-qr-hint">Click variable to insert:</span>
                  </div>

                  {/* Variable Helper Pills */}
                  <div className="wa-qr-variable-tags">
                    <button
                      type="button"
                      onClick={() => setNewReplyText((prev) => prev + "{{customerName}}")}
                      className="wa-var-tag"
                      title="Inserts customer's name (fallback: 'there')"
                    >
                      + {"{{customerName}}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewReplyText((prev) => prev + "{{phone}}")}
                      className="wa-var-tag"
                      title="Inserts customer's phone number"
                    >
                      + {"{{phone}}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewReplyText((prev) => prev + "{{date}}")}
                      className="wa-var-tag"
                      title="Inserts today's date"
                    >
                      + {"{{date}}"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewReplyText((prev) => prev + "{{time}}")}
                      className="wa-var-tag"
                      title="Inserts current time"
                    >
                      + {"{{time}}"}
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    placeholder="e.g. Hello {{customerName}}, thank you for reaching out..."
                    value={newReplyText}
                    onChange={(e) => setNewReplyText(e.target.value)}
                    className="wa-qr-textarea"
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="submit"
                    disabled={isSavingReply}
                    className="flat-primary-btn"
                    style={{ padding: "8px 18px" }}
                  >
                    {isSavingReply ? "Saving to Database..." : "Save Quick Reply"}
                  </button>
                </div>
              </form>
            </div>

            {/* List of Existing Quick Replies */}
            <div className="wa-qr-card list-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 className="wa-qr-section-title" style={{ margin: 0 }}>
                  Active Quick Replies ({quickReplies.length})
                </h3>
                <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  Persisted in MongoDB
                </span>
              </div>

              {isLoadingReplies ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  Loading quick replies from database...
                </div>
              ) : quickReplies.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  No quick replies yet. Create your first one on the left!
                </div>
              ) : (
                <div className="wa-qr-items-list">
                  {quickReplies.map((qr) => {
                    const isEditing = editingReplyId === qr._id;
                    return (
                      <div key={qr._id} className="wa-qr-item">
                        {isEditing ? (
                          <div className="wa-qr-item-edit-form">
                            <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="wa-qr-input"
                                placeholder="Title"
                                style={{ flex: 1 }}
                              />
                              <input
                                type="text"
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="wa-qr-input"
                                placeholder="Category"
                                style={{ width: "120px" }}
                              />
                            </div>
                            <textarea
                              rows={3}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="wa-qr-textarea"
                              placeholder="Message text"
                            />
                            <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => handleSaveEditingReply(qr._id)}
                                disabled={isUpdatingReply}
                                className="flat-primary-btn"
                                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                              >
                                {isUpdatingReply ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingReplyId(null)}
                                className="flat-secondary-btn"
                                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="wa-qr-item-header">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="wa-qr-item-title">{qr.title}</span>
                                <span className="wa-qr-item-category">{qr.category || "general"}</span>
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditingReply(qr)}
                                  className="wa-qr-action-btn edit"
                                  title="Edit quick reply"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuickReply(qr._id, qr.title)}
                                  className="wa-qr-action-btn delete"
                                  title="Delete quick reply"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <p className="wa-qr-item-text">{qr.text}</p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Main Split Layout */
        <div className="wa-split-container">
          {/* Left Column: Conversation List */}
          <aside className="wa-conversations-list">
            {/* Header with Search & Direct Contact Plus Button */}
            <div className="wa-list-header">
              <div className="wa-list-search-row">
                <div className="wa-list-search-wrapper">
                  <svg
                    className="wa-list-search-icon"
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
                    placeholder="Search or enter phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="wa-list-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="wa-list-search-clear"
                      title="Clear search"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Direct Contact Plus Button */}
                <button
                  type="button"
                  onClick={() => setShowDirectPhoneBox((v) => !v)}
                  className={`wa-list-plus-btn ${showDirectPhoneBox ? "active" : ""}`}
                  title="Direct chat with phone number"
                  aria-label="Direct Chat"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: "16px", height: "16px" }}
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>

              {/* Direct Phone Input Drawer */}
              {showDirectPhoneBox && (
                <form onSubmit={handleStartDirectChat} className="wa-list-direct-box">
                  <input
                    type="text"
                    placeholder="Phone with country code (e.g. 971501234567)"
                    value={directPhoneInput}
                    onChange={(e) => setDirectPhoneInput(e.target.value)}
                    className="wa-list-direct-input"
                    autoFocus
                  />
                  <button type="submit" className="wa-list-direct-submit">
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDirectPhoneBox(false)}
                    className="wa-list-direct-cancel"
                    title="Cancel"
                  >
                    &times;
                  </button>
                </form>
              )}
            </div>

            {/* Scrollable Conversation Cards */}
            <div className="wa-conversations-scroll">
              {isLoadingList && conversations.length === 0 ? (
                <div className="wa-list-empty">Loading WhatsApp conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="wa-list-empty">
                  {searchQuery ? "No conversations match your search." : "No WhatsApp enquiries found."}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedPhone === conv.customerPhone;
                  return (
                    <div
                      key={conv.customerPhone}
                      onClick={() => setSelectedPhone(conv.customerPhone)}
                      className={`wa-conversation-card ${isSelected ? "selected" : ""}`}
                    >
                      <div className="wa-card-avatar">
                        <span>{conv.customerName ? conv.customerName.charAt(0).toUpperCase() : "💬"}</span>
                        <span className="wa-avatar-badge" />
                      </div>

                      <div className="wa-card-content">
                        <div className="wa-card-top-row">
                          <span className="wa-card-title">
                            {conv.customerName || `+${conv.customerPhone}`}
                          </span>
                          <span className="wa-card-time">
                            {formatRelativeTime(conv.lastTimestamp)}
                          </span>
                        </div>

                        <div className="wa-card-phone">+{conv.customerPhone}</div>

                        <p className="wa-card-snippet">
                          {conv.lastDirection === "outgoing" ? (
                            <span className="wa-msg-direction-icon">You: </span>
                          ) : null}
                          {conv.lastMessageType !== "text" ? `[${conv.lastMessageType}] ` : ""}
                          {conv.lastMessage || "Media message"}
                        </p>

                        <div className="wa-card-bottom-row">
                          <span className={`wa-pill ${conv.isPending ? "pending" : "responded"}`}>
                            {conv.isPending ? "Pending Action" : "Responded"}
                          </span>
                          <span className="wa-msg-count-tag">{conv.totalMessages} msgs</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column: Live Chat & Reply Engine */}
          <main className="wa-chat-view">
            {selectedPhone ? (
              <>
                {/* Chat Header */}
                <div className="wa-chat-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className="wa-chat-header-avatar">
                      {activeChat?.customerName
                        ? activeChat.customerName.charAt(0).toUpperCase()
                        : "💬"}
                    </div>
                    <div>
                      <h2 className="wa-chat-header-name">
                        {activeChat?.customerName || `+${selectedPhone}`}
                      </h2>
                      <div className="wa-chat-header-meta">
                        <span>Phone: +{selectedPhone}</span>
                        {activeChat?.isWindowOpen ? (
                          <span className="wa-window-badge open">
                            ● 24h Meta Free Window Active
                          </span>
                        ) : (
                          <span className="wa-window-badge closed" title="Replies outside 24h window require a Meta approved template">
                            ⚠️ 24h Window Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <a
                      href={`https://wa.me/${selectedPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-header-action-btn"
                      title="Open chat in WhatsApp Web"
                    >
                      <span>WhatsApp Web</span>
                    </a>

                    <a
                      href={`tel:+${selectedPhone.replace(/\D/g, "")}`}
                      className="wa-header-call-btn"
                      title={`Call +${selectedPhone}`}
                      aria-label="Call customer"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Chat Message Stream */}
                <div ref={chatContainerRef} className="wa-chat-messages-container">
                  {isChatLoading && !activeChat ? (
                    <div className="wa-chat-empty">Loading message history...</div>
                  ) : activeChat?.messages.length === 0 ? (
                    <div className="wa-chat-empty">No messages recorded in this conversation yet.</div>
                  ) : (
                    activeChat?.messages.map((msg) => {
                      const isIncoming = msg.direction === "incoming";
                      return (
                        <div
                          key={msg._id || msg.messageId}
                          className={`wa-message-row ${isIncoming ? "incoming" : "outgoing"}`}
                        >
                          <div className={`wa-message-bubble ${isIncoming ? "incoming" : "outgoing"}`}>
                            {/* Sender name for group/identified inbound */}
                            {isIncoming && msg.customerName && (
                              <div className="wa-bubble-sender">{msg.customerName}</div>
                            )}

                            {/* Image Attachment */}
                            {msg.type === "image" && msg.mediaUrl && (
                              <div className="wa-media-image-box">
                                <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                                  <img
                                    src={msg.mediaUrl}
                                    alt="WhatsApp attachment"
                                    className="wa-media-image"
                                  />
                                </a>
                              </div>
                            )}

                            {/* Document Attachment */}
                            {msg.type === "document" && (
                              <div className="wa-media-doc-box">
                                <span className="wa-doc-icon">📄</span>
                                <div className="wa-doc-details">
                                  <div className="wa-doc-name">
                                    {msg.mediaFileName || "Document"}
                                  </div>
                                  {msg.mediaFileSize && (
                                    <div className="wa-doc-size">
                                      {(msg.mediaFileSize / 1024).toFixed(1)} KB
                                    </div>
                                  )}
                                </div>
                                {msg.mediaUrl && (
                                  <a
                                    href={msg.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="wa-doc-download-btn"
                                  >
                                    Download
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Audio / Voice Note */}
                            {msg.type === "audio" && msg.mediaUrl && (
                              <div className="wa-media-audio-box">
                                <audio controls src={msg.mediaUrl} style={{ width: "100%", height: "36px" }} />
                              </div>
                            )}

                            {/* Video Attachment */}
                            {msg.type === "video" && msg.mediaUrl && (
                              <div className="wa-media-video-box">
                                <video controls src={msg.mediaUrl} style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px" }} />
                              </div>
                            )}

                            {/* Text Message Content */}
                            {msg.text && <div className="wa-bubble-text">{msg.text}</div>}

                            {/* Bubble Footer */}
                            <div className="wa-bubble-footer">
                              <span className="wa-bubble-time">{formatDateTime(msg.timestamp)}</span>
                              {!isIncoming && (
                                <span className="wa-bubble-status">
                                  {msg.status === "read"
                                    ? "✓✓"
                                    : msg.status === "delivered"
                                    ? "✓✓"
                                    : "✓"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Snippets Bar */}
                <div className="wa-snippets-bar">
                  <span className="wa-snippets-label">Quick Replies:</span>
                  {quickReplies.map((snippet) => (
                    <button
                      key={snippet._id || snippet.title}
                      type="button"
                      onClick={() => handleApplySnippet(snippet.text)}
                      className="wa-snippet-pill"
                      title={snippet.text}
                    >
                      {snippet.title}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActiveView("replies")}
                    className="wa-snippet-pill manage"
                    title="Manage quick replies and custom variables"
                    style={{ color: "#16a34a", fontWeight: 700 }}
                  >
                    ⚙ Manage
                  </button>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="wa-reply-composer">
                  <input
                    type="text"
                    placeholder={`Send WhatsApp reply to +${selectedPhone}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSending}
                    className="wa-reply-input"
                  />

                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="wa-reply-send-btn"
                  >
                    {isSending ? "Sending..." : "Send Reply 🚀"}
                  </button>
                </form>

                {sendError && (
                  <div className="wa-send-error-banner">
                    <span>⚠️ {sendError}</span>
                    <button type="button" onClick={() => setSendError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", marginLeft: "auto" }}>
                      &times;
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="wa-no-selection">
                <div className="wa-no-selection-icon">💬</div>
                <h3>Select a WhatsApp Enquiry</h3>
                <p>Choose an incoming customer conversation from the list on the left to review messages and respond.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
