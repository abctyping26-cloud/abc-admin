"use client";

import React, { useState } from "react";
import type { CurrentAdminUser } from "./AccountingSection";

export interface ExpenseViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
}

export default function ExpenseView({ user, onClose }: ExpenseViewProps = {}) {
  const [expenseId, setExpenseId] = useState("EX/343");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [supplierName, setSupplierName] = useState("-Select One-");
  const [expenseType, setExpenseType] = useState("-Select One-");
  const [subType, setSubType] = useState("-Select One-");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payCash, setPayCash] = useState(true);
  const [payBank, setPayBank] = useState(false);
  const [status, setStatus] = useState("Paid");
  const [division, setDivision] = useState("-Select One-");

  const handleReset = () => {
    setExpenseId("EX/343");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setSupplierName("-Select One-");
    setExpenseType("-Select One-");
    setSubType("-Select One-");
    setDescription("");
    setAmount("");
    setPayCash(true);
    setPayBank(false);
    setStatus("Paid");
    setDivision("-Select One-");
  };

  return (
    <div className="erp-invoice-window" aria-label="Expense Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" strokeWidth="2" />
          </svg>
          <span className="erp-window-title-text">Expense</span>
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
          {/* Top Row: Expense ID & Date */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Expense ID
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <input
                type="text"
                className="erp-input erp-w-110 font-semibold"
                value={expenseId}
                onChange={(e) => setExpenseId(e.target.value)}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="erp-label required" style={{ minWidth: 50 }}>
                  Date *
                </span>
                <input
                  type="date"
                  className="erp-input erp-w-140 font-semibold"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Supplier Name */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Supplier Name
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 380 }}
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            >
              <option>-Select One-</option>
              <option value="Amer Center Al Nahda">Amer Center Al Nahda</option>
              <option value="Tasheel Business Centre">Tasheel Business Centre</option>
              <option value="Dubai Economy Dept (DED)">Dubai Economy Dept (DED)</option>
              <option value="General Directorate of Residency (GDRFA)">GDRFA</option>
              <option value="DEWA Utilities">DEWA Utilities</option>
              <option value="Etisalat Telecom">Etisalat Telecom</option>
            </select>
          </div>

          {/* Type */}
          <div className="erp-form-row">
            <label className="erp-label required" style={{ minWidth: 130 }}>
              Type *
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 380 }}
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
            >
              <option>-Select One-</option>
              <option value="Operating Expenses">Operating Expenses</option>
              <option value="Office Rent">Office Rent</option>
              <option value="Utilities & Bills">Utilities &amp; Bills</option>
              <option value="Staff Salaries">Staff Salaries</option>
              <option value="Government Fees">Government Fees</option>
              <option value="Marketing & Advertising">Marketing &amp; Advertising</option>
            </select>
          </div>

          {/* Sub Type */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Sub Type
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 380 }}
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
            >
              <option>-Select One-</option>
              <option value="Electricity / Water">Electricity / Water</option>
              <option value="High Speed Internet">High Speed Internet</option>
              <option value="Paper & Stationery">Paper &amp; Stationery</option>
              <option value="Printer Toners">Printer Toners</option>
              <option value="Software License">Software License</option>
            </select>
          </div>

          {/* Description */}
          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label" style={{ minWidth: 130 }}>
              Description
            </label>
            <textarea
              className="erp-textarea"
              style={{ maxWidth: 380 }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expense breakdown / description..."
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

          {/* Status */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Status
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 380 }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {/* Division */}
          <div className="erp-form-row">
            <label className="erp-label" style={{ minWidth: 130 }}>
              Division
            </label>
            <select
              className="erp-select erp-flex-1"
              style={{ maxWidth: 380 }}
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

        {/* BOTTOM METALLIC ACTION TOOLBAR (Save, Print, Edit, Delete, Reset, Close) */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <div className="erp-classic-glossy-toolbar">
            <button type="button" className="erp-glossy-btn" onClick={() => alert("Save Expense (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span><u>S</u>ave</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Print Expense (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span><u>P</u>rint</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Edit Expense (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0891b2" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span><u>E</u>dit</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Delete Expense (design preview)")}>
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
