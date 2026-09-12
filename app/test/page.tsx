"use client";

import React, { useState } from "react";
import Link from "next/link";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminReplyTestPage() {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("John Client");
  const [senderName, setSenderName] = useState("ABC Operations Team");
  const [subject, setSubject] = useState(
    "Regarding your UAE Golden Visa enquiry - ABC Typing"
  );
  const [message, setMessage] = useState(
    `Hello John,\n\nThank you for reaching out to ABC Typing Services. We have received your enquiry regarding UAE Golden Visa processing.\n\nOur operations team is reviewing your requirements and will be happy to assist you through the complete documentation and approval process. Please let us know the best time to connect for a quick consultation.\n\nBest regards,\nABC Typing Support Team`
  );

  const [isLoading, setIsLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<{
    status: "success" | "error";
    message: string;
    data?: unknown;
  } | null>(null);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerEmail.trim()) {
      setResponseResult({
        status: "error",
        message: "Please specify the customer's email address to receive this reply.",
      });
      return;
    }

    if (!message.trim()) {
      setResponseResult({
        status: "error",
        message: "Please enter a message to send.",
      });
      return;
    }

    setIsLoading(true);
    setResponseResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/test/send-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerEmail,
          customerName,
          senderName,
          subject,
          message,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to dispatch reply email");
      }

      setResponseResult({
        status: "success",
        message: json.message || "Reply sent successfully!",
        data: json.data,
      });
    } catch (err: unknown) {
      setResponseResult({
        status: "error",
        message:
          (err instanceof Error ? err.message : null) ||
          "Network error. Ensure the backend server is running on port 5000.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#090d16",
        color: "#f1f5f9",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "40px 20px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: "720px", width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: "9999px",
              backgroundColor: "#1e1b4b",
              color: "#a78bfa",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: "12px",
              border: "1px solid #312e81",
            }}
          >
            Admin Dashboard · Test Harness
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", margin: "0 0 8px 0" }}>
            Worker/Admin Reply Simulator
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "15px", margin: 0, lineHeight: 1.5 }}>
            Simulate a worker or admin answering a commercial user’s enquiry with a direct email response sent via Resend.
          </p>
        </div>

        {/* Notice Card */}
        <div
          style={{
            backgroundColor: "#131b2e",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "24px",
            border: "1px solid #1e293b",
            fontSize: "14px",
            lineHeight: "1.5",
          }}
        >
          <div style={{ fontWeight: "600", color: "#a78bfa", marginBottom: "4px" }}>
            💡 What this tests:
          </div>
          <div style={{ color: "#cbd5e1" }}>
            When you click send, an email is dispatched directly to the <strong>Customer Email</strong>. The customer receives a professionally formatted email with your message in their inbox.
          </div>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSendReply}
          style={{
            backgroundColor: "#131b2e",
            borderRadius: "16px",
            padding: "28px",
            border: "1px solid #1e293b",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#a78bfa", marginBottom: "6px" }}>
              Recipient Customer Email (Where to send the reply) *
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              placeholder="customer.personal@gmail.com"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "2px solid #6366f1",
                backgroundColor: "#090d16",
                color: "#f8fafc",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
              Enter the email address you want to test receiving the reply on.
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#94a3b8", marginBottom: "6px" }}>
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  backgroundColor: "#090d16",
                  color: "#f8fafc",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#94a3b8", marginBottom: "6px" }}>
                Sender / Worker Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  backgroundColor: "#090d16",
                  color: "#f8fafc",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#94a3b8", marginBottom: "6px" }}>
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "#090d16",
                color: "#f8fafc",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#94a3b8", marginBottom: "6px" }}>
              Reply Message Body
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "#090d16",
                color: "#f8fafc",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
                lineHeight: "1.5",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "8px",
              backgroundColor: isLoading ? "#475569" : "#6366f1",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "600",
              border: "none",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
            }}
          >
            {isLoading ? "Dispatching Reply via Resend..." : "✉️ Send Reply to Customer"}
          </button>
        </form>

        {/* Result Message */}
        {responseResult && (
          <div
            style={{
              marginTop: "24px",
              padding: "18px 20px",
              borderRadius: "12px",
              backgroundColor:
                responseResult.status === "success" ? "#064e3b" : "#7f1d1d",
              border:
                responseResult.status === "success"
                  ? "1px solid #10b981"
                  : "1px solid #ef4444",
              color: "#ffffff",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "6px" }}>
              {responseResult.status === "success"
                ? "✅ Reply Email Delivered Successfully!"
                : "❌ Delivery Failed"}
            </div>
            <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
              {responseResult.message}
            </div>

            {responseResult.status === "success" && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(255,255,255,0.2)",
                  fontSize: "13px",
                  color: "#d1fae5",
                }}
              >
                The email has been handed off to Resend for immediate inbox delivery to <code>{customerEmail}</code>.
              </div>
            )}
          </div>
        )}

        {/* Links */}
        <div style={{ marginTop: "32px", textAlign: "center", fontSize: "14px" }}>
          <Link
            href="/"
            style={{ color: "#a78bfa", textDecoration: "none", marginRight: "20px" }}
          >
            ← Return to Admin Dashboard
          </Link>
          <a
            href="http://localhost:3000/test"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#38bdf8", textDecoration: "none" }}
          >
            Open Commercial Enquiry Test Page →
          </a>
        </div>
      </div>
    </div>
  );
}
