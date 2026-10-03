"use client";

import React, { useState } from "react";
import type { CurrentAdminUser } from "./AccountingSection";

export interface AdvanceReceiptViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
}

export default function AdvanceReceiptView({ user, onClose }: AdvanceReceiptViewProps = {}) {
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState("AR/298");
  const [advanceRefNo, setAdvanceRefNo] = useState("");
  const [customer, setCustomer] = useState("-Select One-");
  const [mobileNo, setMobileNo] = useState("");
  const [amount, setAmount] = useState("");
  const [payCash, setPayCash] = useState(true);
  const [payBank, setPayBank] = useState(false);
  const [description, setDescription] = useState("");
  const [headerAtReceipt, setHeaderAtReceipt] = useState(true);

  const handleReset = () => {
    setReceiptDate(new Date().toISOString().slice(0, 10));
    setReceiptNo("AR/298");
    setAdvanceRefNo("");
    setCustomer("-Select One-");
    setMobileNo("");
    setAmount("");
    setPayCash(true);
    setPayBank(false);
    setDescription("");
    setHeaderAtReceipt(true);
  };

  return (
    <div className="erp-invoice-window" aria-label="Advance Receipt Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <circle cx="12" cy="15" r="2" />
          </svg>
          <span className="erp-window-title-text">Advance Receipt</span>
        </div>
        <div className="erp-window-controls">
          <button type="button" className="erp-win-btn close" aria-label="Close" onClick={onClose} tabIndex={-1}>
            ✕
          </button>
        </div>
      </div>

      {/* WINDOW BODY */}
      <div className="erp-window-body" style={{ padding: "18px 24px" }}>
        <div className="erp-form-rows" style={{ maxWidth: 560, gap: 10 }}>
          {/* Date */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 140 }}>
              Date *
            </label>
            <input
              type="date"
              className="erp-input erp-w-140 font-semibold"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </div>

          {/* Advance Receipt No */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 140 }}>
              Advance Receipt No
            </label>
            <input
              type="text"
              className="erp-input erp-w-240 font-semibold"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
            />
          </div>

          {/* Advance Ref No */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 140 }}>
              Advance Ref No
            </label>
            <input
              type="text"
              className="erp-input erp-w-240"
              value={advanceRefNo}
              onChange={(e) => setAdvanceRefNo(e.target.value)}
            />
          </div>

          {/* Customer */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 140 }}>
              Customer*
            </label>
            <div className="erp-input-with-tools" style={{ width: 340 }}>
              <select
                className="erp-select erp-flex-1 erp-highlight-select"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option>-Select One-</option>
                <option value="ABC Global LLC">ABC Global LLC</option>
                <option value="Emirates Trade Corp">Emirates Trade Corp</option>
                <option value="Starline Logistics">Starline Logistics</option>
              </select>
              <button
                type="button"
                className="erp-icon-btn erp-btn-orange"
                title="Add Customer"
                onClick={() => alert("Add customer clicked (design preview)")}
              >
                +
              </button>
            </div>
          </div>

          {/* Mobile No */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 140 }}>
              Mobile No
            </label>
            <input
              type="text"
              className="erp-input erp-w-240"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 140 }}>
              Amount *
            </label>
            <input
              type="text"
              className="erp-input erp-w-140 font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Pay Mode */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 140 }}>
              Pay Mode
            </label>
            <div style={{ display: "flex", gap: 20 }}>
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={payCash}
                  onChange={(e) => setPayCash(e.target.checked)}
                />
                Cash
              </label>
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={payBank}
                  onChange={(e) => setPayBank(e.target.checked)}
                />
                Bank
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 140 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ width: 340 }}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter advance payment purpose / description..."
            />
          </div>
        </div>

        {/* BOTTOM SECTION: Header at Receipt checkbox + Metallic toolbar */}
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <label className="erp-checkbox-label" style={{ fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={headerAtReceipt}
                onChange={(e) => setHeaderAtReceipt(e.target.checked)}
              />
              Header at Receipt
            </label>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="erp-classic-glossy-toolbar">
            <button type="button" className="erp-glossy-btn" onClick={() => alert("Save Advance Receipt (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span><u>S</u>ave</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Print Advance Receipt (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span><u>P</u>rint</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Edit Advance Receipt (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0891b2" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span><u>E</u>dit</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Delete Advance Receipt (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span style={{ color: "#dc2626" }}><u>D</u>elete</span>
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
