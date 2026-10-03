"use client";

import React, { useState } from "react";
import type { CurrentAdminUser } from "./AccountingSection";

export interface PaymentVoucherViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
}

export default function PaymentVoucherView({ user, onClose }: PaymentVoucherViewProps = {}) {
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptNo, setReceiptNo] = useState("PV/349");
  const [isAdvance, setIsAdvance] = useState(false);
  const [supplier, setSupplier] = useState("-Select One-");
  const [amount, setAmount] = useState("");
  const [payCash, setPayCash] = useState(true);
  const [payBank, setPayBank] = useState(false);
  const [adjustAdvance, setAdjustAdvance] = useState(false);
  const [description, setDescription] = useState("");

  const handleReset = () => {
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setReceiptNo("PV/349");
    setIsAdvance(false);
    setSupplier("-Select One-");
    setAmount("");
    setPayCash(true);
    setPayBank(false);
    setAdjustAdvance(false);
    setDescription("");
  };

  return (
    <div className="erp-invoice-window" aria-label="Payment Voucher Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
            <line x1="6" y1="15" x2="10" y2="15" />
          </svg>
          <span className="erp-window-title-text">Payment Voucher</span>
        </div>
        <div className="erp-window-controls">
          <button type="button" className="erp-win-btn close" aria-label="Close" onClick={onClose} tabIndex={-1}>
            ✕
          </button>
        </div>
      </div>

      {/* WINDOW BODY */}
      <div className="erp-window-body" style={{ padding: "18px 24px" }}>
        <div className="erp-form-rows" style={{ maxWidth: 580, gap: 10 }}>
          {/* Date */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 150 }}>
              Date *
            </label>
            <input
              type="date"
              className="erp-input erp-w-140 font-semibold"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
            />
          </div>

          {/* Payment Receipt No + Advance Checkbox */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 150 }}>
              Payment Receipt No
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="text"
                className="erp-input erp-w-200 font-semibold"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
              />
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={isAdvance}
                  onChange={(e) => setIsAdvance(e.target.checked)}
                />
                Advance
              </label>
            </div>
          </div>

          {/* Supplier */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 150 }}>
              Supplier*
            </label>
            <div className="erp-input-with-tools" style={{ width: 340 }}>
              <select
                className="erp-select erp-flex-1 erp-highlight-select"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              >
                <option>-Select One-</option>
                <option value="Amer Center Al Nahda">Amer Center Al Nahda</option>
                <option value="Tasheel Business Centre">Tasheel Business Centre</option>
                <option value="Dubai Economy Dept (DED)">Dubai Economy Dept (DED)</option>
                <option value="General Directorate of Residency (GDRFA)">GDRFA</option>
              </select>
              <button
                type="button"
                className="erp-icon-btn erp-btn-orange"
                title="Add Supplier"
                onClick={() => alert("Add supplier clicked (design preview)")}
              >
                +
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 150 }}>
              Amount
            </label>
            <input
              type="text"
              className="erp-input erp-w-160 font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Pay Mode */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 150 }}>
              Pay Mode
            </label>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
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
              <label className="erp-checkbox-label">
                <input
                  type="checkbox"
                  checked={adjustAdvance}
                  onChange={(e) => setAdjustAdvance(e.target.checked)}
                />
                Adjust Advance
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 150 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ width: 340 }}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter voucher payment notes..."
            />
          </div>
        </div>

        {/* BOTTOM METALLIC ACTION TOOLBAR */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
          <div className="erp-classic-glossy-toolbar">
            <button type="button" className="erp-glossy-btn" onClick={() => alert("Save Payment Voucher (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span><u>S</u>ave</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Print Payment Voucher (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span><u>P</u>rint</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Edit Payment Voucher (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0891b2" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span><u>E</u>dit</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Delete Payment Voucher (design preview)")}>
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
