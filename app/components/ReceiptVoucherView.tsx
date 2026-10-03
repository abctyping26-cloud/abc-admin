"use client";

import React, { useState } from "react";
import type { CurrentAdminUser } from "./AccountingSection";

export interface ReceiptVoucherLineItem {
  id: number;
  slNo: number;
  invoiceNo: string;
  description: string;
  amount: number | string;
}

export interface ReceiptVoucherViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
}

export default function ReceiptVoucherView({ user, onClose }: ReceiptVoucherViewProps = {}) {
  // Top Section State
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [voucherNo, setVoucherNo] = useState("638");
  const [targetType, setTargetType] = useState<"Customer" | "Other">("Customer");
  const [searchType, setSearchType] = useState<"Mobile" | "Invoice No">("Mobile");
  const [searchInputValue, setSearchInputValue] = useState("");

  // Middle Section State
  const [customer, setCustomer] = useState("--Select One--");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("--Select One--");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [description, setDescription] = useState("");
  const [division, setDivision] = useState("--Select One--");

  // Invoice Details Entry State
  const [inputInvoiceNo, setInputInvoiceNo] = useState("");
  const [inputInvoiceDesc, setInputInvoiceDesc] = useState("");
  const [inputInvoiceAmount, setInputInvoiceAmount] = useState("");

  // Table & Selected
  const [lineItems, setLineItems] = useState<ReceiptVoucherLineItem[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Side Summary info for selected or active invoice
  const [sideSummary] = useState({
    date: "03-10-2026",
    invoiceNo: "1488",
    netAmount: "1,250.00",
    paidAmount: "750.00",
    balanceAmount: "500.00",
  });

  const handleAddItem = () => {
    if (!inputInvoiceAmount && !inputInvoiceNo) {
      alert("Please specify an Invoice No or Amount.");
      return;
    }
    const newItem: ReceiptVoucherLineItem = {
      id: Date.now(),
      slNo: lineItems.length + 1,
      invoiceNo: inputInvoiceNo || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      description: inputInvoiceDesc || "Services settlement",
      amount: inputInvoiceAmount || "0.00",
    };
    setLineItems((prev) => [...prev, newItem]);
    setInputInvoiceNo("");
    setInputInvoiceDesc("");
    setInputInvoiceAmount("");
  };

  const handleRemoveItem = () => {
    if (selectedRowId === null) {
      if (lineItems.length > 0) {
        setLineItems((prev) => prev.slice(0, -1).map((item, idx) => ({ ...item, slNo: idx + 1 })));
      }
      return;
    }
    setLineItems((prev) =>
      prev.filter((item) => item.id !== selectedRowId).map((item, idx) => ({ ...item, slNo: idx + 1 }))
    );
    setSelectedRowId(null);
  };

  const handleReset = () => {
    setVoucherDate(new Date().toISOString().slice(0, 10));
    setVoucherNo("638");
    setTargetType("Customer");
    setSearchType("Mobile");
    setSearchInputValue("");
    setCustomer("--Select One--");
    setAmount("");
    setPaymentMode("--Select One--");
    setAdjustedAmount("");
    setDescription("");
    setDivision("--Select One--");
    setInputInvoiceNo("");
    setInputInvoiceDesc("");
    setInputInvoiceAmount("");
    setLineItems([]);
    setSelectedRowId(null);
  };

  return (
    <div className="erp-invoice-window" aria-label="Receipt Voucher Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="erp-window-title-text">Receipt Voucher</span>
        </div>
        <div className="erp-window-controls">
          <button type="button" className="erp-win-btn" aria-label="Minimize" tabIndex={-1}>_</button>
          <button type="button" className="erp-win-btn close" aria-label="Close" onClick={onClose} tabIndex={-1}>✕</button>
        </div>
      </div>

      {/* WINDOW BODY */}
      <div className="erp-window-body">
        {/* TOP SECTION: Date, Voucher No, Type & Search Type Boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "flex-start" }}>
          {/* Top Left: Date, Voucher No, Type Box */}
          <div className="erp-form-rows">
            <div className="erp-form-row">
              <label className="erp-label">Date</label>
              <input
                type="date"
                className="erp-input erp-w-140 font-semibold"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
              />
            </div>

            <div className="erp-form-row">
              <label className="erp-label">Voucher No</label>
              <input
                type="text"
                className="erp-input erp-w-180 font-semibold"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
              />
            </div>

            <div className="erp-form-row">
              <div className="erp-group-box" style={{ marginTop: 2, minWidth: 240 }}>
                <span className="erp-group-box-title">Type</span>
                <div style={{ display: "flex", gap: 18 }}>
                  <label className="erp-radio-label" style={{ color: "#dc2626", fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="rv_type_radio"
                      checked={targetType === "Customer"}
                      onChange={() => setTargetType("Customer")}
                    />
                    Customer
                  </label>
                  <label className="erp-radio-label" style={{ color: "#dc2626", fontWeight: 700 }}>
                    <input
                      type="radio"
                      name="rv_type_radio"
                      checked={targetType === "Other"}
                      onChange={() => setTargetType("Other")}
                    />
                    Other
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Top Right: Search Type Box & Search input */}
          <div className="erp-form-rows">
            <div className="erp-group-box" style={{ width: "fit-content", minWidth: 260 }}>
              <span className="erp-group-box-title">Search Type</span>
              <div style={{ display: "flex", gap: 18 }}>
                <label className="erp-radio-label" style={{ color: "#dc2626", fontWeight: 700 }}>
                  <input
                    type="radio"
                    name="rv_searchtype_radio"
                    checked={searchType === "Mobile"}
                    onChange={() => setSearchType("Mobile")}
                  />
                  Mobile
                </label>
                <label className="erp-radio-label" style={{ color: "#dc2626", fontWeight: 700 }}>
                  <input
                    type="radio"
                    name="rv_searchtype_radio"
                    checked={searchType === "Invoice No"}
                    onChange={() => setSearchType("Invoice No")}
                  />
                  Invoice No
                </label>
              </div>
            </div>

            <div style={{ marginTop: 4 }}>
              <input
                type="text"
                className="erp-input erp-w-240"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                placeholder="Enter value and press enter..."
              />
              <span style={{ fontSize: "0.72rem", color: "#475569", display: "block", marginTop: 2 }}>
                Please enter the {searchType === "Mobile" ? "mobile number" : "invoice number"} and press enter key
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: Customer, Amount, Payment Mode, Description, Division */}
        <div className="erp-form-rows" style={{ marginTop: 6, gap: 6 }}>
          <div className="erp-form-row">
            <label className="erp-label">Customer</label>
            <div className="erp-input-with-tools" style={{ maxWidth: 380 }}>
              <select
                className="erp-select erp-flex-1"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option>--Select One--</option>
                <option value="ABC Global LLC">ABC Global LLC</option>
                <option value="Emirates Trade Corp">Emirates Trade Corp</option>
                <option value="Starline Logistics">Starline Logistics</option>
              </select>
              <button
                type="button"
                className="erp-icon-btn erp-btn-binoculars"
                title="Lookup Customer"
                onClick={() => alert("Search customer clicked (design preview)")}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="7" cy="12" r="4" />
                  <circle cx="17" cy="12" r="4" />
                  <line x1="11" y1="12" x2="13" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="erp-form-row">
            <label className="erp-label required">Amount*</label>
            <input
              type="text"
              className="erp-input erp-w-140 font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="erp-form-row">
            <label className="erp-label required">Payment Mode*</label>
            <select
              className="erp-select erp-w-140"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option>--Select One--</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Credit Card">Credit Card</option>
            </select>

            <span className="erp-label" style={{ minWidth: 105, marginLeft: 16 }}>
              Adjusted Amount
            </span>
            <input
              type="text"
              className="erp-input erp-w-140 font-semibold"
              value={adjustedAmount}
              onChange={(e) => setAdjustedAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
            <label className="erp-label">Description</label>
            <textarea
              className="erp-textarea"
              style={{ maxWidth: 380 }}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Voucher narrative / description..."
            />
          </div>

          <div className="erp-form-row">
            <label className="erp-label">Division</label>
            <select
              className="erp-select erp-w-200"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              <option>--Select One--</option>
              <option value="Corporate Services">Corporate Services</option>
              <option value="Typing Center">Typing Center</option>
              <option value="Legal Translation">Legal Translation</option>
            </select>
          </div>
        </div>

        {/* BOTTOM FIELDSET: INVOICE DETAILS */}
        <fieldset className="erp-fieldset" style={{ marginTop: 6 }}>
          <legend className="erp-legend" style={{ color: "#0f172a" }}>
            Invoice Details
          </legend>

          {/* Top Entry Fields for Invoice Details */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ width: 140 }}>
              <div className="erp-micro-label" style={{ textAlign: "center" }}>Invoice No.</div>
              <select
                className="erp-select erp-w-full"
                style={{ width: "100%" }}
                value={inputInvoiceNo}
                onChange={(e) => setInputInvoiceNo(e.target.value)}
              >
                <option value="">(Select Invoice)</option>
                <option value="INV-1488">INV-1488</option>
                <option value="INV-1487">INV-1487</option>
                <option value="INV-1486">INV-1486</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="erp-micro-label" style={{ textAlign: "center" }}>Description</div>
              <select
                className="erp-select erp-w-full"
                style={{ width: "100%" }}
                value={inputInvoiceDesc}
                onChange={(e) => setInputInvoiceDesc(e.target.value)}
              >
                <option value="">(Select Description)</option>
                <option value="Documentation & Typing">Documentation &amp; Typing</option>
                <option value="Translation Services">Translation Services</option>
                <option value="Consultancy Package">Consultancy Package</option>
              </select>
            </div>

            <div style={{ width: 120 }}>
              <div className="erp-micro-label" style={{ textAlign: "center" }}>Amount *</div>
              <input
                type="text"
                className="erp-input erp-w-full text-right"
                style={{ width: "100%" }}
                value={inputInvoiceAmount}
                onChange={(e) => setInputInvoiceAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Main Grid: Table with side buttons on Left + Info Card on Right */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
            {/* Table + Actions */}
            <div style={{ flex: 1, minWidth: 320, display: "flex", gap: 6 }}>
              <div className="erp-table-scroll-wrap" style={{ flex: 1, minHeight: 120 }}>
                <table className="erp-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>SlNo</th>
                      <th style={{ width: 110 }}>Invoice No</th>
                      <th>Description</th>
                      <th style={{ width: 95, textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="erp-table-empty-td">
                          No invoices linked yet. Select above and click &quot;+ Add&quot;.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item) => (
                        <tr
                          key={item.id}
                          className={selectedRowId === item.id ? "selected-row" : ""}
                          onClick={() => setSelectedRowId(item.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ textAlign: "center" }}>{item.slNo}</td>
                          <td>{item.invoiceNo}</td>
                          <td>{item.description}</td>
                          <td style={{ textAlign: "right" }}>{item.amount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Side Buttons */}
              <div className="erp-table-side-buttons">
                <button type="button" className="erp-side-btn erp-btn-add" onClick={handleAddItem} title="Add Row">
                  <span className="btn-icon">+</span>
                  <span>Add</span>
                </button>
                <button type="button" className="erp-side-btn erp-btn-remove" onClick={handleRemoveItem} title="Remove Row">
                  <span className="btn-icon">−</span>
                  <span>Remove</span>
                </button>
                <button
                  type="button"
                  className="erp-side-btn erp-btn-change"
                  onClick={() => alert("Change clicked (design preview)")}
                  title="Change"
                >
                  <span className="btn-icon">⚡</span>
                  <span>Change</span>
                </button>
              </div>
            </div>

            {/* Right Side Info Card: Invoice Details */}
            <div className="erp-invoice-side-summary">
              <div className="erp-invoice-side-title">Invoice Details</div>
              <div className="erp-invoice-side-row">
                <span className="label">Date:</span>
                <span className="val">{sideSummary.date}</span>
              </div>
              <div className="erp-invoice-side-row">
                <span className="label">Invoice No:</span>
                <span className="val">{sideSummary.invoiceNo}</span>
              </div>
              <div className="erp-invoice-side-row">
                <span className="label">Net Amount :</span>
                <span className="val">{sideSummary.netAmount}</span>
              </div>
              <div className="erp-invoice-side-row">
                <span className="label">Paid Amount</span>
                <span className="val">{sideSummary.paidAmount}</span>
              </div>
              <div className="erp-invoice-side-row">
                <span className="label">Balance Amount :</span>
                <span className="val" style={{ color: "#dc2626" }}>{sideSummary.balanceAmount}</span>
              </div>
            </div>
          </div>
        </fieldset>

        {/* BOTTOM METALLIC ACTION TOOLBAR: Save, Edit, Print, Delete, Search, Reset, Close */}
        <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
          <div className="erp-classic-glossy-toolbar">
            <button type="button" className="erp-glossy-btn" onClick={() => alert("Save Receipt Voucher (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span><u>S</u>ave</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Edit Receipt Voucher (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0891b2" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span><u>E</u>dit</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Print Receipt Voucher (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span><u>P</u>rint</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Delete Receipt Voucher (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#dc2626" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span style={{ color: "#dc2626" }}><u>D</u>elete</span>
            </button>

            <button type="button" className="erp-glossy-btn" onClick={() => alert("Search Vouchers (design preview)")}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#475569" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span><u>S</u>earch</span>
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
