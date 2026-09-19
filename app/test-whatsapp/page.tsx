"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Conversation {
  _id: string;
  customerPhone: string;
  customerName?: string;
  lastMessage?: string;
  lastMessageType: string;
  lastDirection: "incoming" | "outgoing";
  lastTimestamp: string;
  totalMessages: number;
  lastStatus: string;
}

interface Message {
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

interface ConversationDetail {
  customerPhone: string;
  customerName: string;
  isWindowOpen: boolean;
  lastIncomingTime: string | null;
  messages: Message[];
}

export default function WhatsAppTestPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ConversationDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAutoPoll, setIsAutoPoll] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [manualPhoneInput, setManualPhoneInput] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-subscribe WABA to app webhooks
  const handleSyncWaba = useCallback(async () => {
    setIsSubscribing(true);
    setSyncStatus(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/subscribe-waba`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSyncStatus("✅ Meta WhatsApp Account successfully linked to Webhooks!");
      } else {
        setSyncStatus(`⚠️ ${json.error || json.message || "Failed to link Meta account"}`);
      }
    } catch (err: any) {
      setSyncStatus(`⚠️ ${err.message || "Network error linking Meta account"}`);
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  useEffect(() => {
    handleSyncWaba();
  }, [handleSyncWaba]);

  // Fetch list of all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/conversations`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setConversations(data.data);
        // Automatically select first conversation if none selected yet
        if (!selectedPhone && data.data.length > 0) {
          setSelectedPhone(data.data[0].customerPhone);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setIsLoadingList(false);
    }
  }, [selectedPhone]);

  // Fetch messages for selected conversation
  const fetchActiveMessages = useCallback(async (phone: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/messages/${phone}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        setActiveChat(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch active chat messages:", err);
    }
  }, []);

  // Polling loop for real-time updates
  useEffect(() => {
    fetchConversations();
    if (!isAutoPoll) return;

    const interval = setInterval(() => {
      fetchConversations();
      if (selectedPhone) {
        fetchActiveMessages(selectedPhone);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchConversations, fetchActiveMessages, selectedPhone, isAutoPoll]);

  // When selected phone changes, fetch its messages immediately
  useEffect(() => {
    if (selectedPhone) {
      fetchActiveMessages(selectedPhone);
    }
  }, [selectedPhone, fetchActiveMessages]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // Send reply handler
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phoneToUse = selectedPhone || manualPhoneInput.trim();
    if (!phoneToUse) {
      setSendError("Please select or enter a recipient phone number.");
      return;
    }
    if (!replyText.trim()) {
      setSendError("Message cannot be empty.");
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/whatsapp/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: phoneToUse,
          text: replyText.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to send WhatsApp message");
      }

      setReplyText("");
      // Refresh chat immediately
      if (phoneToUse) {
        setSelectedPhone(phoneToUse);
        await fetchActiveMessages(phoneToUse);
        await fetchConversations();
      }
    } catch (err: any) {
      setSendError(err.message || "Error sending message");
    } finally {
      setIsSending(false);
    }
  };

  const quickReplies = [
    "Hello! Thank you for reaching out to ABC Typing. How can we assist you today?",
    "We have received your documents. Our operations team is reviewing them right now.",
    "Please send your Passport copy and Emirates ID so we can proceed with the application.",
    "Your application has been submitted successfully! We will update you with reference details soon.",
  ];

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b101b",
        color: "#f1f5f9",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          backgroundColor: "#0f172a",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#25D366",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "18px",
            }}
          >
            💬
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#f8fafc" }}>
                WhatsApp Live Business Inbox
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  backgroundColor: "#065f46",
                  color: "#6ee7b7",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                }}
              >
                Production Ready
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
              Persistent MongoDB Engine · Meta WhatsApp Cloud API
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setIsAutoPoll((prev) => !prev)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              backgroundColor: isAutoPoll ? "#064e3b" : "#334155",
              color: isAutoPoll ? "#a7f3d0" : "#cbd5e1",
              border: "1px solid",
              borderColor: isAutoPoll ? "#059669" : "#475569",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isAutoPoll ? "#10b981" : "#94a3b8",
                display: "inline-block",
              }}
            />
            {isAutoPoll ? "Live Polling Active (3.5s)" : "Polling Paused"}
          </button>

          <button
            onClick={() => {
              fetchConversations();
              if (selectedPhone) fetchActiveMessages(selectedPhone);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "500",
              backgroundColor: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>

          <button
            onClick={handleSyncWaba}
            disabled={isSubscribing}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: "#1e1b4b",
              color: "#c4b5fd",
              border: "1px solid #4338ca",
              cursor: isSubscribing ? "not-allowed" : "pointer",
            }}
          >
            {isSubscribing ? "Linking..." : "🔗 Link Webhook to Number"}
          </button>

          <Link
            href="/"
            style={{
              fontSize: "12px",
              color: "#38bdf8",
              textDecoration: "none",
              padding: "6px 10px",
              borderRadius: "6px",
              backgroundColor: "#082f49",
            }}
          >
            ← Admin Home
          </Link>
        </div>
      </header>

      {syncStatus && (
        <div
          style={{
            backgroundColor: syncStatus.startsWith("✅") ? "#064e3b" : "#451a03",
            color: syncStatus.startsWith("✅") ? "#a7f3d0" : "#fef08a",
            padding: "8px 24px",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <span>{syncStatus}</span>
          <button
            onClick={() => setSyncStatus(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: "flex", flex: 1, height: "calc(100vh - 61px)", overflow: "hidden" }}>
        {/* Left Sidebar: Conversations List */}
        <aside
          style={{
            width: "340px",
            borderRight: "1px solid #1e293b",
            backgroundColor: "#0d1424",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search / Manual Phone Input */}
          <div style={{ padding: "12px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="Enter customer number (+...)"
                value={manualPhoneInput}
                onChange={(e) => setManualPhoneInput(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  color: "#ffffff",
                  outline: "none",
                }}
              />
              <button
                onClick={() => {
                  if (manualPhoneInput.trim()) {
                    setSelectedPhone(manualPhoneInput.trim().replace(/\D/g, ""));
                  }
                }}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Chat
              </button>
            </div>
          </div>

          {/* List Header */}
          <div
            style={{
              padding: "10px 14px",
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "#64748b",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Conversations ({conversations.length})</span>
            {isLoadingList && <span>Loading...</span>}
          </div>

          {/* Conversations Items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversations.length === 0 && !isLoadingList ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#64748b" }}>
                <p style={{ fontSize: "28px", margin: "0 0 8px 0" }}>📭</p>
                <p style={{ fontSize: "13px", margin: "0 0 6px 0", color: "#94a3b8" }}>
                  No messages received yet
                </p>
                <p style={{ fontSize: "11px", margin: 0, lineHeight: 1.4 }}>
                  Send a WhatsApp message to your Meta number from your phone to start a conversation!
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedPhone === conv.customerPhone;
                return (
                  <div
                    key={conv.customerPhone}
                    onClick={() => setSelectedPhone(conv.customerPhone)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid #172033",
                      backgroundColor: isSelected ? "#1e293b" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#93c5fd",
                        fontWeight: "700",
                        fontSize: "15px",
                        flexShrink: 0,
                      }}
                    >
                      {conv.customerName ? conv.customerName.charAt(0).toUpperCase() : "👤"}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "600",
                            fontSize: "13px",
                            color: isSelected ? "#ffffff" : "#f1f5f9",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {conv.customerName || `+${conv.customerPhone}`}
                        </span>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>
                          {formatDate(conv.lastTimestamp)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          color: "#94a3b8",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span>{conv.lastDirection === "outgoing" ? "You: " : ""}</span>
                        {conv.lastMessageType !== "text" && (
                          <span style={{ color: "#38bdf8" }}>[{conv.lastMessageType}] </span>
                        )}
                        <span>{conv.lastMessage || "Media attachment"}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Area: Active Chat Feed & Message Composer */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#070b14",
          }}
        >
          {selectedPhone ? (
            <>
              {/* Chat Header */}
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #1e293b",
                  backgroundColor: "#0f172a",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      backgroundColor: "#047857",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                    }}
                  >
                    👤
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>
                      {activeChat?.customerName || `+${selectedPhone}`}
                    </h2>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      WhatsApp ID: +{selectedPhone}
                    </p>
                  </div>
                </div>

                {/* 24-Hour Messaging Window Badge */}
                <div>
                  {activeChat?.isWindowOpen ? (
                    <div
                      style={{
                        backgroundColor: "#064e3b",
                        border: "1px solid #059669",
                        borderRadius: "8px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        color: "#6ee7b7",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          backgroundColor: "#10b981",
                        }}
                      />
                      <span>24-Hour Window Active (Free Chat Open)</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: "#451a03",
                        border: "1px solid #78350f",
                        borderRadius: "8px",
                        padding: "4px 10px",
                        fontSize: "11px",
                        color: "#fde68a",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>⚠️ 24h Window Inactive or Awaiting Customer Response</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div
                style={{
                  flex: 1,
                  padding: "20px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  backgroundImage:
                    "radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              >
                {activeChat?.messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", margin: "auto" }}>
                    <p style={{ fontSize: "14px" }}>No messages in this chat thread yet.</p>
                  </div>
                ) : (
                  activeChat?.messages.map((msg) => {
                    const isIncoming = msg.direction === "incoming";
                    return (
                      <div
                        key={msg._id || msg.messageId}
                        style={{
                          display: "flex",
                          justifyContent: isIncoming ? "flex-start" : "flex-end",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            backgroundColor: isIncoming ? "#1e293b" : "#056162",
                            color: "#ffffff",
                            borderRadius: isIncoming
                              ? "4px 14px 14px 14px"
                              : "14px 4px 14px 14px",
                            padding: "10px 14px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            border: isIncoming
                              ? "1px solid #334155"
                              : "1px solid #047857",
                          }}
                        >
                          {/* Sender Info for Inbound */}
                          {isIncoming && msg.customerName && (
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "#38bdf8",
                                marginBottom: "4px",
                              }}
                            >
                              {msg.customerName}
                            </div>
                          )}

                          {/* Media: Image */}
                          {msg.type === "image" && msg.mediaUrl && (
                            <div style={{ marginBottom: "8px" }}>
                              <a
                                href={msg.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: "block" }}
                              >
                                <img
                                  src={msg.mediaUrl}
                                  alt="WhatsApp attachment"
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "260px",
                                    borderRadius: "8px",
                                    display: "block",
                                    objectFit: "cover",
                                  }}
                                />
                              </a>
                            </div>
                          )}

                          {/* Media: Document / PDF */}
                          {msg.type === "document" && (
                            <div
                              style={{
                                backgroundColor: "rgba(0,0,0,0.2)",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                marginBottom: "6px",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <span style={{ fontSize: "22px" }}>📄</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {msg.mediaFileName || "Document"}
                                </div>
                                {msg.mediaFileSize && (
                                  <div style={{ fontSize: "10px", color: "#cbd5e1" }}>
                                    {(msg.mediaFileSize / 1024).toFixed(1)} KB
                                  </div>
                                )}
                              </div>
                              {msg.mediaUrl && (
                                <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    backgroundColor: "#2563eb",
                                    color: "#ffffff",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    textDecoration: "none",
                                    fontWeight: "600",
                                  }}
                                >
                                  View / Download
                                </a>
                              )}
                            </div>
                          )}

                          {/* Media: Audio / Voice Note */}
                          {msg.type === "audio" && msg.mediaUrl && (
                            <div style={{ marginBottom: "6px" }}>
                              <audio
                                controls
                                src={msg.mediaUrl}
                                style={{ maxWidth: "100%", height: "36px" }}
                              />
                            </div>
                          )}

                          {/* Media: Video */}
                          {msg.type === "video" && msg.mediaUrl && (
                            <div style={{ marginBottom: "8px" }}>
                              <video
                                controls
                                src={msg.mediaUrl}
                                style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px" }}
                              />
                            </div>
                          )}

                          {/* Text Body */}
                          {msg.text && (
                            <div
                              style={{
                                fontSize: "13px",
                                lineHeight: "1.45",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {msg.text}
                            </div>
                          )}

                          {/* Footer: Time & Status */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: "4px",
                              marginTop: "4px",
                              fontSize: "10px",
                              color: isIncoming ? "#94a3b8" : "#a7f3d0",
                            }}
                          >
                            <span>{formatTime(msg.timestamp)}</span>
                            {!isIncoming && (
                              <span>
                                {msg.status === "read"
                                  ? "✓✓ (read)"
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
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies Bar */}
              <div
                style={{
                  padding: "6px 16px",
                  backgroundColor: "#0d1527",
                  borderTop: "1px solid #1e293b",
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    alignSelf: "center",
                    fontWeight: "600",
                  }}
                >
                  Quick Snippets:
                </span>
                {quickReplies.map((snippet, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReplyText(snippet)}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: "#1e293b",
                      color: "#94a3b8",
                      border: "1px solid #334155",
                      cursor: "pointer",
                    }}
                  >
                    {snippet.substring(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Reply Input Form */}
              <form
                onSubmit={handleSendReply}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#0f172a",
                  borderTop: "1px solid #1e293b",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder={`Reply to +${selectedPhone}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={isSending}
                  style={{
                    flex: 1,
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "13px",
                    color: "#ffffff",
                    outline: "none",
                  }}
                />

                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    backgroundColor: isSending || !replyText.trim() ? "#1e3a8a" : "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: isSending || !replyText.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isSending ? "Sending..." : "Send 🚀"}
                </button>
              </form>

              {sendError && (
                <div
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#450a0a",
                    color: "#fca5a5",
                    fontSize: "12px",
                    borderTop: "1px solid #991b1b",
                  }}
                >
                  ⚠️ {sendError}
                </div>
              )}
            </>
          ) : (
            /* Welcome / Empty Screen */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "#064e3b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  marginBottom: "16px",
                }}
              >
                📱
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700" }}>
                Select a Chat or Send a Test Message
              </h3>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  color: "#94a3b8",
                  maxWidth: "460px",
                  lineHeight: "1.5",
                }}
              >
                Send a WhatsApp message from your phone to your Meta Business Number. The message,
                photos, and documents will show up here automatically!
              </p>

              <div
                style={{
                  backgroundColor: "#131b2e",
                  border: "1px solid #1e293b",
                  borderRadius: "10px",
                  padding: "16px 24px",
                  maxWidth: "420px",
                  textAlign: "left",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
              >
                <div style={{ fontWeight: "600", color: "#38bdf8", marginBottom: "6px" }}>
                  💡 Testing Instructions:
                </div>
                <div>1. Open WhatsApp on your phone.</div>
                <div>2. Send a text or photo to the Meta test number.</div>
                <div>3. Watch it appear on the left column in real-time.</div>
                <div>4. Click it to view the full chat and reply directly!</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
