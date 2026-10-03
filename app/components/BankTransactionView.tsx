"use client";

import React, { useState } from "react";
import type { CurrentAdminUser } from "./AccountingSection";

export interface BankTransactionViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
}

export default function BankTransactionView({ user, onClose }: BankTransactionViewProps = {}) {
  const [txType, setTxType] = useState<"Deposit" | "Withdrawel" | "Bank To Bank">("Deposit");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState("-Select One-");
  const [toBank, setToBank] = useState("-Select One-");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"Cash" | "Cheque">("Cash");

  const handleReset = () => {
    setTxType("Deposit");
    setTxDate(new Date().toISOString().slice(0, 10));
    setBankName("-Select One-");
    setToBank("-Select One-");
    setDescription("");
    setAmount("");
    setPaymentType("Cash");
  };

  return (
    <div className="erp-invoice-window" aria-label="Bank Transaction Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="12 2 2 7 22 7" />
            <rect x="4" y="7" width="16" height="3" />
            <line x1="6" y1="10" x2="6" y2="18" />
            <line x1="10" y1="10" x2="10" y2="18" />
            <line x1="14" y1="10" x2="14" y2="18" />
            <line x1="18" y1="10" x2="18" y2="18" />
            <rect x="2" y="18" width="20" height="3" />
          </svg>
          <span className="erp-window-title-text">Bank Transaction</span>
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
          {/* Top Group Box: Type */}
          <div className="erp-form-row">
            <div className="erp-group-box" style={{ width: "fit-content", minWidth: 340, padding: "8px 14px" }}>
              <span className="erp-group-box-title" style={{ color: "#2563eb" }}>
                Type
              </span>
              <div style={{ display: "flex", gap: 20 }}>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_type_radio"
                    checked={txType === "Deposit"}
                    onChange={() => setTxType("Deposit")}
                  />
                  Deposit
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_type_radio"
                    checked={txType === "Withdrawel"}
                    onChange={() => setTxType("Withdrawel")}
                  />
                  Withdrawel
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_type_radio"
                    checked={txType === "Bank To Bank"}
                    onChange={() => setTxType("Bank To Bank")}
                  />
                  Bank To Bank
                </label>
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="erp-form-row" style={{ marginTop: 4 }}>
            <label className="erp-label required" style={{ minWidth: 120 }}>
              Date *
            </label>
            <input
              type="date"
              className="erp-input erp-w-140 font-semibold"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
            />
          </div>

          {/* Bank Name */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 120 }}>
              Bank Name *
            </label>
            <div className="erp-input-with-tools" style={{ maxWidth: 360 }}>
              <select
                className="erp-select erp-flex-1"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              >
                <option>-Select One-</option>
                <option value="Emirates NBD">Emirates NBD</option>
                <option value="Abu Dhabi Commercial Bank (ADCB)">Abu Dhabi Commercial Bank (ADCB)</option>
                <option value="Dubai Islamic Bank (DIB)">Dubai Islamic Bank (DIB)</option>
                <option value="First Abu Dhabi Bank (FAB)">First Abu Dhabi Bank (FAB)</option>
                <option value="Mashreq Bank">Mashreq Bank</option>
              </select>
              <button
                type="button"
                className="erp-icon-btn erp-btn-orange"
                title="Add Bank"
                onClick={() => alert("Add bank clicked (design preview)")}
              >
                +
              </button>
            </div>
          </div>

          {/* To Bank */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 120 }}>
              To Bank
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 360 }}
              value={toBank}
              onChange={(e) => setToBank(e.target.value)}
            >
              <option>-Select One-</option>
              <option value="Emirates NBD">Emirates NBD</option>
              <option value="Abu Dhabi Commercial Bank (ADCB)">Abu Dhabi Commercial Bank (ADCB)</option>
              <option value="Dubai Islamic Bank (DIB)">Dubai Islamic Bank (DIB)</option>
              <option value="First Abu Dhabi Bank (FAB)">First Abu Dhabi Bank (FAB)</option>
              <option value="Mashreq Bank">Mashreq Bank</option>
            </select>
          </div>

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 120 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ maxWidth: 360 }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Transaction memo / description..."
            />
          </div>

          {/* Amount */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 120 }}>
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

          {/* Group Box: Payment Type */}
          <div className="erp-form-row" style={{ marginTop: 2 }}>
            <div className="erp-group-box" style={{ width: "fit-content", minWidth: 180, padding: "8px 14px" }}>
              <span className="erp-group-box-title" style={{ color: "#dc2626" }}>
                Payment Type
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_paytype_radio"
                    checked={paymentType === "Cash"}
                    onChange={() => setPaymentType("Cash")}
                  />
                  Cash
                </label>
                <label className="erp-radio-label" style={{ fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="bt_paytype_radio"
                    checked={paymentType === "Cheque"}
                    onChange={() => setPaymentType("Cheque")}
                  />
                  Cheque
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM METALLIC ACTION TOOLBAR (Save, Print, Edit, Delete, Reset, Close) */}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <div className="erp-classic-glossy-toolbar">
            <button type="button" className="erp-glossy-btn" onClick={() => alert("Save Bank Transaction (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span><u>S</u>ave</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Print Bank Transaction (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span><u>P</u>rint</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Edit Bank Transaction (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0891b2" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span><u>E</u>dit</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Delete Bank Transaction (design preview)")}>
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
