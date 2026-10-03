"use client";

import React, { useState, useEffect, useMemo } from "react";
import { API_BASE_URL } from "../config/api";

const DEFAULT_MESSAGE_1 =
  "UAE Pass Biometric & Kiosk Support in Musaffah — Lost SIM Recovery, Facial Recognition & TAMM Digital Signatures";
const DEFAULT_MESSAGE_2 =
  "Instant Kiosk Fingerprint Verification, ICP Mobile Number Update & Corporate Profile Linking";

interface TopMarqueeManagerProps {
  user: {
    id?: string;
    identifier?: string;
    role?: string;
    name?: string;
  } | null;
  isMaster: boolean;
}

export default function TopMarqueeManager({ user }: TopMarqueeManagerProps) {
  // Saved database state
  const [savedText1, setSavedText1] = useState<string>(DEFAULT_MESSAGE_1);
  const [savedText2, setSavedText2] = useState<string>(DEFAULT_MESSAGE_2);

  // Current editable input state
  const [text1, setText1] = useState<string>(DEFAULT_MESSAGE_1);
  const [text2, setText2] = useState<string>(DEFAULT_MESSAGE_2);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper for auth headers
  const getAuthHeaders = (): Record<string, string> => {
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
  };

  // Fetch initial config from backend
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/admin/website-content/top-marquee`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.config?.items && isMounted) {
            const items = json.data.config.items;
            const m1 = items[0]?.message || DEFAULT_MESSAGE_1;
            const m2 = items[1]?.message || "";
            setSavedText1(m1);
            setSavedText2(m2);
            setText1(m1);
            setText2(m2);
          }
        }
      } catch {
        // Fall back seamlessly to default text without blocking UI
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Detect whether user made any edits
  const hasChanges = useMemo(() => {
    return (
      text1.trim() !== savedText1.trim() || text2.trim() !== savedText2.trim()
    );
  }, [text1, text2, savedText1, savedText2]);

  // Cancel edit handler: reverts to saved database values
  const handleCancel = () => {
    setText1(savedText1);
    setText2(savedText2);
    setErrorMsg(null);
  };

  // Save changes to MongoDB
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text1.trim()) {
      setErrorMsg("Message 1 cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const itemsToSave = [
        {
          badgeText: "NEW",
          message: text1.trim(),
          ctaText: "Explore",
          linkUrl: "/services/uae-pass-assistance",
        },
      ];

      if (text2.trim()) {
        itemsToSave.push({
          badgeText: "NEW",
          message: text2.trim(),
          ctaText: "Explore",
          linkUrl: "/services/uae-pass-assistance",
        });
      }

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/website-content/top-marquee`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            isActive: true,
            speedSeconds: 32,
            items: itemsToSave,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save changes to database.");
      }

      setSavedText1(text1.trim());
      setSavedText2(text2.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error connecting to database.";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Build live preview items based on current input
  const previewItems = useMemo(() => {
    const list: string[] = [];
    if (text1.trim()) list.push(text1.trim());
    if (text2.trim()) list.push(text2.trim());
    if (list.length === 0) list.push("Announcement message preview...");
    if (list.length === 1) list.push(list[0]);
    return list;
  }, [text1, text2]);

  return (
    <div className="simple-marquee-editor">
      {/* Title matching Services & Documentation */}
      <div className="content-header-row">
        <div>
          <h1 className="content-title">Top Marquee Announcement</h1>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="simple-marquee-banner success">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Changes saved successfully to database!</span>
        </div>
      )}

      {errorMsg && (
        <div className="simple-marquee-banner error">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Deboxed Live Preview Bar (Hover to pause) */}
      <div className="simple-preview-bar" title="Live Preview (Hover to pause)">
        <div className="simple-preview-track">
          {/* Group 1 */}
          <div className="simple-preview-group">
            {previewItems.map((msg, idx) => (
              <React.Fragment key={`prev1-${idx}`}>
                <div className="simple-preview-item">
                  <span className="simple-preview-badge">
                    <span className="simple-preview-pulse-dot" />
                    <span>NEW</span>
                  </span>
                  <span className="simple-preview-text">{msg}</span>
                  <span className="simple-preview-cta">
                    <span>Explore</span>
                    <span>→</span>
                  </span>
                </div>
                <span className="simple-preview-sep">✦</span>
              </React.Fragment>
            ))}
          </div>

          {/* Group 2 (Infinite Mirror) */}
          <div className="simple-preview-group" aria-hidden="true">
            {previewItems.map((msg, idx) => (
              <React.Fragment key={`prev2-${idx}`}>
                <div className="simple-preview-item">
                  <span className="simple-preview-badge">
                    <span className="simple-preview-pulse-dot" />
                    <span>NEW</span>
                  </span>
                  <span className="simple-preview-text">{msg}</span>
                  <span className="simple-preview-cta">
                    <span>Explore</span>
                    <span>→</span>
                  </span>
                </div>
                <span className="simple-preview-sep">✦</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Deboxed Text Inputs Form */}
      <form onSubmit={handleSave} className="simple-marquee-form">
        <div className="simple-marquee-inputs-body">
          {/* Message 1 */}
          <div className="simple-input-group">
            <label htmlFor="marquee-msg-1" className="simple-input-label">
              Primary Announcement Text *
            </label>
            <textarea
              id="marquee-msg-1"
              rows={2}
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder="e.g. UAE Pass Biometric & Kiosk Support in Musaffah — Lost SIM Recovery, Facial Recognition & TAMM Digital Signatures"
              className="simple-textarea"
              required
            />
          </div>

          {/* Message 2 */}
          <div className="simple-input-group">
            <label htmlFor="marquee-msg-2" className="simple-input-label">
              Secondary Announcement Text (Optional)
            </label>
            <input
              id="marquee-msg-2"
              type="text"
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder="e.g. Instant Kiosk Fingerprint Verification, ICP Mobile Number Update & Corporate Profile Linking"
              className="simple-text-input"
            />
          </div>
        </div>

        {/* 3. Action Buttons: ONLY SHOWN IF THERE IS AN EDIT */}
        {hasChanges && (
          <div className="simple-marquee-actions-bar">
            <div className="simple-marquee-changes-indicator">
              <span className="simple-changes-dot" />
              <span>You have unsaved edits</span>
            </div>

            <div className="simple-marquee-btn-group">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="simple-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="simple-save-btn"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
