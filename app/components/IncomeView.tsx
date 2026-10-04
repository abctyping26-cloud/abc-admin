"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";
import type { CurrentAdminUser } from "./AccountingSection";

export interface IncomeViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
  getAuthHeaders?: () => Record<string, string>;
}

export default function IncomeView({ user, onClose, getAuthHeaders }: IncomeViewProps = {}) {
  const [incomeId, setIncomeId] = useState("IN/01");
  const [lastIncomeId, setLastIncomeId] = useState<string>("None");
  const [incomeDate, setIncomeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [incomeType, setIncomeType] = useState("-Select One-");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payCash, setPayCash] = useState(true);
  const [payBank, setPayBank] = useState(false);
  const [division, setDivision] = useState("-Select One-");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    if (getAuthHeaders) return getAuthHeaders();
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("abc_admin_token") || localStorage.getItem("token") || localStorage.getItem("adminToken");
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }, [getAuthHeaders]);

  // Fetch incomes from MongoDB to find the last added income and calculate +1 ID
  const fetchLatestIncomeId = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/incomes`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const json = await res.json();
      const list = json.data?.incomes || [];
      if (Array.isArray(list) && list.length > 0) {
        // Last recorded income is the first item (sorted by createdAt/incomeDate desc)
        const latest = list[0];
        const lastIdStr = latest.incomeId || "";
        setLastIncomeId(lastIdStr || "None");

        // Parse numeric part from last ID (e.g., "IN/83" -> 83, "IN-12" -> 12, "83" -> 83)
        let maxNum = 0;
        let prefix = "IN/";

        list.forEach((item: any) => {
          const match = String(item.incomeId || "").match(/(\d+)/);
          if (match) {
            const val = parseInt(match[1], 10);
            if (!isNaN(val) && val > maxNum) {
              maxNum = val;
            }
          }
        });

        const prefixMatch = lastIdStr.match(/^([A-Za-z]+\/?\-?)/);
        if (prefixMatch) {
          prefix = prefixMatch[1];
        }

        const nextNum = maxNum + 1;
        setIncomeId(`${prefix}${nextNum}`);
      } else {
        setLastIncomeId("None");
        setIncomeId("IN/01");
      }
    } catch {
      // Graceful fallback
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchLatestIncomeId();
    const handleUpdate = () => fetchLatestIncomeId();
    window.addEventListener("abc_income_updated", handleUpdate);
    return () => window.removeEventListener("abc_income_updated", handleUpdate);
  }, [fetchLatestIncomeId]);

  const handleReset = () => {
    fetchLatestIncomeId();
    setIncomeDate(new Date().toISOString().slice(0, 10));
    setIncomeType("-Select One-");
    setDescription("");
    setAmount("");
    setPayCash(true);
    setPayBank(false);
    setDivision("-Select One-");
    setStatusMessage(null);
  };

  const handleSaveIncome = async () => {
    if (!incomeType || incomeType === "-Select One-") {
      setStatusMessage({ type: "error", text: "Please select an Income Type." });
      return;
    }
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      setStatusMessage({ type: "error", text: "Please enter a valid amount greater than 0." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/incomes`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incomeId: incomeId.trim(),
          incomeDate,
          type: incomeType,
          description: description.trim(),
          amount: num,
          payMode: payBank ? "bank" : "cash",
          division: division !== "-Select One-" ? division : "",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to record income.");
      }

      setStatusMessage({ type: "success", text: `Income #${incomeId} successfully saved to MongoDB!` });
      window.dispatchEvent(new Event("abc_income_updated"));
      handleReset();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving income to database.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="erp-invoice-window" aria-label="Income Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="erp-window-title-text">Income</span>
        </div>
        <div className="erp-window-controls">
          <button type="button" className="erp-win-btn close" aria-label="Close" onClick={onClose} tabIndex={-1}>
            ✕
          </button>
        </div>
      </div>

      {/* WINDOW BODY */}
      <div className="erp-window-body" style={{ padding: "18px 24px" }}>
        {statusMessage && (
          <div
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              marginBottom: "14px",
              fontSize: "0.84rem",
              fontWeight: 600,
              backgroundColor: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
              color: statusMessage.type === "success" ? "#065f46" : "#b91c1c",
              border: `1px solid ${statusMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            }}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="erp-form-rows" style={{ maxWidth: 580, gap: 10 }}>
          {/* Income ID with Last Added indicator & Auto +1 */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Income ID
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                className="erp-input erp-w-110 font-semibold"
                value={incomeId}
                onChange={(e) => setIncomeId(e.target.value)}
              />
              <span
                className="erp-recent-invoice-text"
                style={{
                  fontSize: "0.78rem",
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Last Added: <strong style={{ color: "#0f172a" }}>{lastIncomeId}</strong>
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Date *
            </label>
            <input
              type="date"
              className="erp-input erp-w-140 font-semibold"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Type *
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 360 }}
              value={incomeType}
              onChange={(e) => setIncomeType(e.target.value)}
            >
              <option>-Select One-</option>
              <option value="Consulting Fee">Consulting Fee</option>
              <option value="Typing Center Fees">Typing Center Fees</option>
              <option value="Translation Services">Translation Services</option>
              <option value="Document Clearance">Document Clearance</option>
              <option value="Miscellaneous Income">Miscellaneous Income</option>
            </select>
          </div>

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 130 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ maxWidth: 360 }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Income description / reference..."
            />
          </div>

          {/* Amount */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Amount *
            </label>
            <input
              type="text"
              className="erp-input erp-w-130 font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Pay Mode */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Pay Mode
            </label>
            <div style={{ display: "flex", gap: 20 }}>
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={payCash}
                  onChange={(e) => {
                    setPayCash(e.target.checked);
                    if (e.target.checked) setPayBank(false);
                  }}
                />
                Cash
              </label>
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={payBank}
                  onChange={(e) => {
                    setPayBank(e.target.checked);
                    if (e.target.checked) setPayCash(false);
                  }}
                />
                Bank
              </label>
            </div>
          </div>

          {/* Division */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Division
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 360 }}
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option>-Select One-</option>
              <option value="Typing Center">Typing Center</option>
              <option value="Corporate Services">Corporate Services</option>
              <option value="Legal Translation">Legal Translation</option>
            </select>
          </div>
        </div>

        {/* BOTTOM METALLIC ACTION TOOLBAR (Save, Edit, Delete, Reset, Close) */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <div className="erp-classic-glossy-toolbar">
            <button
              type="button"
              className="erp-glossy-btn"
              onClick={handleSaveIncome}
              disabled={isSubmitting}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{isSubmitting ? "Saving..." : <><u>S</u>ave</>}</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={handleReset}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span><u>R</u>eset</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ea580c" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span style={{ color: "#c2410c" }}><u>C</u>lose</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
