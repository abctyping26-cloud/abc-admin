"use client";

import React, { useState } from "react";
import type { CurrentAdminUser } from "./AccountingSection";

export interface QuotationItem {
  id: number;
  slNo: number;
  serviceDescription: string;
  qty: number | string;
  unitPrice: number | string;
  totalAmount: number | string;
  totalBeforeVat: number | string;
  vat: number | string;
}

export interface QuotationViewProps {
  user?: CurrentAdminUser | null;
  onClose?: () => void;
}

export default function QuotationView({ user, onClose }: QuotationViewProps = {}) {
  // Quotation Meta State
  const [quotationNo, setQuotationNo] = useState("1489");
  const [recentQuotationNo] = useState("1488");
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [refNo, setRefNo] = useState("");
  const [isSpecific, setIsSpecific] = useState(false);
  const [specificValue, setSpecificValue] = useState("-Select One-");

  // Customer State
  const [customer, setCustomer] = useState("-Select One-");
  const [address, setAddress] = useState("");
  const [tel, setTel] = useState("");
  const [mobile, setMobile] = useState("");

  // Service Details Input State
  const [serviceDesc, setServiceDesc] = useState("-Select One-");
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [totalBeforeVat, setTotalBeforeVat] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [amountVatIncl, setAmountVatIncl] = useState("");
  const [viewAll, setViewAll] = useState(false);

  // Line Items
  const [lineItems, setLineItems] = useState<QuotationItem[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Bottom Summary State
  const [remarks, setRemarks] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  const [discount, setDiscount] = useState("");
  const [summaryTotalBeforeVat, setSummaryTotalBeforeVat] = useState("");
  const [summaryVatAmount, setSummaryVatAmount] = useState("");
  const [grandTotal, setGrandTotal] = useState("");

  // Visual Add Item Handler
  const handleAddItem = () => {
    if (serviceDesc === "-Select One-" && !qty && !unitPrice) {
      alert("Please select a Service Description or enter Qty/Price.");
      return;
    }
    const newItem: QuotationItem = {
      id: Date.now(),
      slNo: lineItems.length + 1,
      serviceDescription: serviceDesc === "-Select One-" ? "General Consultancy / Service" : serviceDesc,
      qty: qty || 1,
      unitPrice: unitPrice || "0.00",
      totalAmount: amountVatIncl || unitPrice || "0.00",
      totalBeforeVat: totalBeforeVat || unitPrice || "0.00",
      vat: vatAmount || "0.00",
    };
    setLineItems((prev) => [...prev, newItem]);
    setServiceDesc("-Select One-");
    setQty("");
    setUnitPrice("");
    setTotalBeforeVat("");
    setVatAmount("");
    setAmountVatIncl("");
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
    setCustomer("-Select One-");
    setAddress("");
    setTel("");
    setMobile("");
    setRefNo("");
    setIsSpecific(false);
    setSpecificValue("-Select One-");
    setServiceDesc("-Select One-");
    setQty("");
    setUnitPrice("");
    setTotalBeforeVat("");
    setVatAmount("");
    setAmountVatIncl("");
    setLineItems([]);
    setSelectedRowId(null);
    setRemarks("");
    setTermsAndConditions("");
    setAmountInWords("");
    setDiscount("");
    setSummaryTotalBeforeVat("");
    setSummaryVatAmount("");
    setGrandTotal("");
  };

  return (
    <div className="erp-invoice-window" aria-label="Quotation Form">
      {/* WINDOW TITLE BAR */}
      <div className="erp-window-titlebar">
        <div className="erp-window-title-left">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <span className="erp-window-title-text">Quotation</span>
        </div>
        <div className="erp-window-controls">
          <button type="button" className="erp-win-btn close" aria-label="Close" onClick={onClose} tabIndex={-1}>
            ✕
          </button>
        </div>
      </div>

      {/* WINDOW BODY */}
      <div className="erp-window-body">
        {/* TOP SECTION: 2-COLUMN GRID (Customer Info on Left, Quotation Meta on Right) */}
        <div className="erp-top-grid">
          {/* Left Column: Customer details */}
          <div className="erp-form-rows">
            <div className="erp-form-row">
              <label className="erp-label required">Customer *</label>
              <div className="erp-input-with-tools">
                <select
                  className="erp-select erp-flex-1 erp-highlight-select"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                >
                  <option>-Select One-</option>
                  <option value="ABC Global LLC">ABC Global LLC</option>
                  <option value="Emirates Trade Corp">Emirates Trade Corp</option>
                  <option value="Starline Logistics">Starline Logistics</option>
                  <option value="Al Fajr Services">Al Fajr Services</option>
                </select>
                <button
                  type="button"
                  className="erp-icon-btn erp-btn-orange"
                  title="Add Customer"
                  onClick={() => alert("Add customer clicked (design preview mode)")}
                >
                  +
                </button>
              </div>
            </div>

            <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
              <label className="erp-label">Address</label>
              <textarea
                className="erp-textarea"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Client address / location details"
              />
            </div>

            <div className="erp-form-row">
              <label className="erp-label">Tel</label>
              <input
                type="text"
                className="erp-input erp-flex-1"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
              />
            </div>

            <div className="erp-form-row">
              <label className="erp-label">Mobile</label>
              <input
                type="text"
                className="erp-input erp-flex-1"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: Quotation Number, Date, Ref No, Specific */}
          <div className="erp-form-rows">
            <div className="erp-form-row">
              <label className="erp-label required">Quotation No *</label>
              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <input
                  type="text"
                  className="erp-input erp-w-130 font-semibold"
                  value={quotationNo}
                  onChange={(e) => setQuotationNo(e.target.value)}
                />
                <span className="erp-recent-quotation-tag">
                  Recent Quotation No : {recentQuotationNo}
                </span>
              </div>
            </div>

            <div className="erp-form-row">
              <label className="erp-label required">Date *</label>
              <input
                type="date"
                className="erp-input erp-w-130 font-semibold"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
              />
            </div>

            <div className="erp-form-row">
              <label className="erp-label">Ref No</label>
              <input
                type="text"
                className="erp-input erp-w-200"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>

            <div className="erp-form-row">
              <label className="erp-checkbox-label" style={{ minWidth: 78 }}>
                <input
                  type="checkbox"
                  checked={isSpecific}
                  onChange={(e) => setIsSpecific(e.target.checked)}
                />
                Specific
              </label>
              <select
                className="erp-select erp-w-200"
                value={specificValue}
                onChange={(e) => setSpecificValue(e.target.value)}
                disabled={!isSpecific}
              >
                <option>-Select One-</option>
                <option value="Type A">Type A</option>
                <option value="Type B">Type B</option>
              </select>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: SERVICE DETAILS (FIELDSET) */}
        <fieldset className="erp-fieldset" style={{ marginTop: 4 }}>
          <legend className="erp-legend" style={{ color: "#16a34a" }}>
            Service Details
          </legend>

          {/* Entry Row 1 */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="erp-micro-label" style={{ textAlign: "center", fontWeight: 700 }}>Description</div>
              <select
                className="erp-select erp-w-full"
                style={{ width: "100%" }}
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
              >
                <option>-Select One-</option>
                <option value="Typing & Documentation Services">Typing & Documentation Services</option>
                <option value="Legal Translation & Attestation">Legal Translation & Attestation</option>
                <option value="Trade License Renewal Assistance">Trade License Renewal Assistance</option>
                <option value="Visa Application Processing">Visa Application Processing</option>
              </select>
            </div>

            <div style={{ width: 80 }}>
              <div className="erp-micro-label" style={{ textAlign: "center" }}>Qty</div>
              <input
                type="number"
                className="erp-input erp-w-full text-center"
                style={{ width: "100%" }}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>

            <div style={{ width: 90 }}>
              <div className="erp-micro-label" style={{ textAlign: "center" }}>Unit Price</div>
              <input
                type="text"
                className="erp-input erp-w-full text-right"
                style={{ width: "100%" }}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>

            <div style={{ width: 110 }}>
              <div className="erp-micro-label" style={{ textAlign: "center" }}>Total Before VAT</div>
              <input
                type="text"
                className="erp-input erp-w-full text-right"
                style={{ width: "100%" }}
                value={totalBeforeVat}
                onChange={(e) => setTotalBeforeVat(e.target.value)}
              />
            </div>
          </div>

          {/* Entry Row 2 (VAT fields + View All) */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="erp-micro-label" style={{ fontWeight: 600 }}>VAT Amount</span>
              <input
                type="text"
                className="erp-input erp-w-90 text-right"
                value={vatAmount}
                onChange={(e) => setVatAmount(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="erp-micro-label" style={{ fontWeight: 600 }}>Amount (VAT Incl)</span>
              <input
                type="text"
                className="erp-input erp-w-100 text-right"
                value={amountVatIncl}
                onChange={(e) => setAmountVatIncl(e.target.value)}
              />
            </div>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#c026d3", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={viewAll}
                onChange={(e) => setViewAll(e.target.checked)}
              />
              View All
            </label>
          </div>

          {/* Table with Action Buttons */}
          <div className="erp-table-with-actions">
            <div className="erp-table-scroll-wrap" style={{ minHeight: 140 }}>
              <table className="erp-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>SlNo.</th>
                    <th>Service Description</th>
                    <th style={{ width: 55, textAlign: "center" }}>Qty</th>
                    <th style={{ width: 85, textAlign: "right" }}>Unit Price</th>
                    <th style={{ width: 95, textAlign: "right" }}>Total Amount</th>
                    <th style={{ width: 110, textAlign: "right" }}>Total Before VAT</th>
                    <th style={{ width: 75, textAlign: "right" }}>VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="erp-table-empty-td">
                        No service items added to quotation yet. Fill fields above and click &quot;+ Add&quot;.
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
                        <td>{item.serviceDescription}</td>
                        <td style={{ textAlign: "center" }}>{item.qty}</td>
                        <td style={{ textAlign: "right" }}>{item.unitPrice}</td>
                        <td style={{ textAlign: "right" }}>{item.totalAmount}</td>
                        <td style={{ textAlign: "right" }}>{item.totalBeforeVat}</td>
                        <td style={{ textAlign: "right" }}>{item.vat}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Side Buttons (+ Add, - Remove, Change) */}
            <div className="erp-table-side-buttons">
              <button type="button" className="erp-side-btn erp-btn-add" onClick={handleAddItem} title="Add Item">
                <span className="btn-icon">+</span>
                <span>Add</span>
              </button>
              <button type="button" className="erp-side-btn erp-btn-remove" onClick={handleRemoveItem} title="Remove Item">
                <span className="btn-icon">−</span>
                <span>Remove</span>
              </button>
              <button
                type="button"
                className="erp-side-btn erp-btn-change"
                onClick={() => alert("Change item clicked")}
                title="Change Item"
              >
                <span className="btn-icon">⚡</span>
                <span>Change</span>
              </button>
            </div>
          </div>
        </fieldset>

        {/* BOTTOM SECTION: Remarks & Terms (Left) + Financial Summary (Right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, alignItems: "flex-start", marginTop: 4 }}>
          {/* Left Side: Remarks, Terms, Words */}
          <div className="erp-form-rows">
            <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
              <label className="erp-label">Remarks</label>
              <textarea
                className="erp-textarea"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="erp-form-row" style={{ alignItems: "flex-start" }}>
              <label className="erp-label">Terms &amp; Conditions</label>
              <textarea
                className="erp-textarea"
                rows={2}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
              />
            </div>

            <div className="erp-form-row">
              <label className="erp-label">Amount in words</label>
              <input
                type="text"
                className="erp-input erp-flex-1"
                value={amountInWords}
                onChange={(e) => setAmountInWords(e.target.value)}
              />
            </div>
          </div>

          {/* Right Side: Financial Summary Box */}
          <div className="erp-form-rows" style={{ background: "#f8fafc", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 3 }}>
            <div className="erp-summary-row">
              <span className="erp-summary-label">Discount</span>
              <input
                type="text"
                className="erp-input erp-w-130 text-right"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            <div className="erp-summary-row">
              <span className="erp-summary-label">Total Before VAT</span>
              <input
                type="text"
                className="erp-input erp-w-130 text-right"
                value={summaryTotalBeforeVat}
                onChange={(e) => setSummaryTotalBeforeVat(e.target.value)}
              />
            </div>

            <div className="erp-summary-row">
              <span className="erp-summary-label">VAT Amount</span>
              <input
                type="text"
                className="erp-input erp-w-130 text-right"
                value={summaryVatAmount}
                onChange={(e) => setSummaryVatAmount(e.target.value)}
              />
            </div>

            <div className="erp-summary-row">
              <span className="erp-summary-label font-bold">Grand Total</span>
              <input
                type="text"
                className="erp-input erp-w-130 text-right font-bold"
                value={grandTotal}
                onChange={(e) => setGrandTotal(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* BOTTOM METALLIC ACTION TOOLBAR */}
        <div className="erp-classic-glossy-toolbar">
          <button type="button" className="erp-glossy-btn" onClick={() => alert("Save Quotation (design preview)")}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span><u>S</u>ave</span>
          </button>

          <button type="button" className="erp-glossy-btn" onClick={() => alert("Print Quotation (design preview)")}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            <span><u>P</u>rint</span>
          </button>

          <button type="button" className="erp-glossy-btn" onClick={() => alert("Edit Quotation (design preview)")}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0891b2" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span><u>E</u>dit</span>
          </button>

          <button type="button" className="erp-glossy-btn" onClick={() => alert("Delete Quotation (design preview)")}>
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
  );
}
