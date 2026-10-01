"use client";

import React, { useRef } from "react";

export interface PrintableInvoiceData {
  id?: string;
  _id?: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTime?: string;
  lpoNo?: string;
  salesMan?: string;
  referredBy?: string;
  division?: string;
  customer: {
    name: string;
    mobile?: string;
    code?: string;
    address?: string;
    email?: string;
    company?: string;
    customerType?: string;
  };
  lineItems: Array<{
    slNo?: number;
    packageCode?: string;
    description: string;
    qty: number;
    unitPrice: number;
    totalAmount: number;
    employee?: string;
  }>;
  paymentDetails?: {
    payDescription?: string;
    payMethod?: string;
    payCash?: string;
    payCc?: string;
  };
  financialSummary?: {
    total?: string;
    discount?: string;
    discountPercent?: string;
    totalBeforeVat?: string;
    vat?: string;
    grossAmount?: string;
    paid?: string;
    balance?: string;
  };
  bank?: string;
  status?: "paid" | "partial" | "unpaid" | "draft";
  createdAt?: string;
}

interface PrintableInvoiceModalProps {
  invoice: PrintableInvoiceData;
  onClose: () => void;
}

export default function PrintableInvoiceModal({
  invoice,
  onClose,
}: PrintableInvoiceModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const lineItems = invoice.lineItems || [];
  const summary = invoice.financialSummary || {};
  const customer = invoice.customer || { name: "Walk-in Customer" };

  return (
    <div className="printable-modal-overlay" onClick={onClose}>
      <div
        className="printable-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="printable-modal-toolbar no-print">
          <div className="toolbar-info">
            <span className="toolbar-title">
              Tax Invoice #{invoice.invoiceNo}
            </span>
            <span className={`status-badge-capsule status-${invoice.status || "unpaid"}`}>
              {(invoice.status || "unpaid").toUpperCase()}
            </span>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              onClick={handlePrint}
              className="print-action-btn primary"
              title="Print to printer or PDF"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" />
              </svg>
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="print-action-btn secondary"
              title="Close Preview"
            >
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            A4 PRINTABLE PAPER DOCUMENT
            ==================================================================== */}
        <div className="printable-paper" ref={printAreaRef}>
          {/* Header */}
          <div className="paper-header">
            <div className="header-brand">
              <div className="company-logo-text">ABC</div>
              <div>
                <h1 className="company-name">
                  ABC DOCUMENTS CLEARING & CORPORATE SERVICES
                </h1>
                <p className="company-tagline">
                  Business Setup • PRO Services • Document Clearing • Corporate Solutions
                </p>
                <p className="company-details">
                  Prime Tower, Business Bay, Dubai, United Arab Emirates<br />
                  TRN: 100234567800003 • Tel: +971 4 000 0000 • Email: info@abccorporate.com
                </p>
              </div>
            </div>

            <div className="header-meta">
              <div className="tax-invoice-heading">TAX INVOICE</div>
              <table className="meta-table">
                <tbody>
                  <tr>
                    <td className="meta-label">Invoice No:</td>
                    <td className="meta-value font-mono font-bold">
                      INV-{invoice.invoiceNo}
                    </td>
                  </tr>
                  <tr>
                    <td className="meta-label">Date:</td>
                    <td className="meta-value">{invoice.invoiceDate || "—"}</td>
                  </tr>
                  {invoice.invoiceTime && (
                    <tr>
                      <td className="meta-label">Time:</td>
                      <td className="meta-value">{invoice.invoiceTime}</td>
                    </tr>
                  )}
                  {invoice.lpoNo && (
                    <tr>
                      <td className="meta-label">LPO / Ref:</td>
                      <td className="meta-value">{invoice.lpoNo}</td>
                    </tr>
                  )}
                  {invoice.salesMan && (
                    <tr>
                      <td className="meta-label">Salesman:</td>
                      <td className="meta-value">{invoice.salesMan}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="paper-divider" />

          {/* Customer / Bill To Box */}
          <div className="paper-bill-to-row">
            <div className="bill-to-box">
              <div className="bill-to-title">BILL TO</div>
              <div className="bill-to-name">
                {customer.name || customer.company || "Walk-in Customer"}
              </div>
              {customer.company && customer.name !== customer.company && (
                <div className="bill-to-company">{customer.company}</div>
              )}
              {customer.code && (
                <div className="bill-to-field">
                  <span className="text-muted">Client Code:</span> {customer.code}
                </div>
              )}
              {customer.mobile && (
                <div className="bill-to-field">
                  <span className="text-muted">Phone:</span> {customer.mobile}
                </div>
              )}
              {customer.email && (
                <div className="bill-to-field">
                  <span className="text-muted">Email:</span> {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="bill-to-field">
                  <span className="text-muted">Address:</span> {customer.address}
                </div>
              )}
            </div>

            <div className="service-details-box">
              <div className="bill-to-title">REFERENCE DETAILS</div>
              {invoice.division && (
                <div className="bill-to-field">
                  <span className="text-muted">Division:</span> {invoice.division}
                </div>
              )}
              {invoice.referredBy && (
                <div className="bill-to-field">
                  <span className="text-muted">Referred By:</span> {invoice.referredBy}
                </div>
              )}
              {invoice.bank && (
                <div className="bill-to-field">
                  <span className="text-muted">Deposit Bank:</span> {invoice.bank}
                </div>
              )}
              {invoice.paymentDetails?.payMethod && (
                <div className="bill-to-field">
                  <span className="text-muted">Payment Mode:</span> {invoice.paymentDetails.payMethod}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="paper-table-wrapper">
            <table className="paper-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>Sl.</th>
                  <th style={{ width: "120px" }}>Code</th>
                  <th>Service Description</th>
                  <th style={{ width: "100px" }}>Employee</th>
                  <th style={{ width: "60px", textAlign: "center" }}>Qty</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Unit Price</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Total (AED)</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      General Professional Clearing Services
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        {item.slNo || idx + 1}
                      </td>
                      <td className="font-mono text-muted">
                        {item.packageCode || `SRV-${String(idx + 1).padStart(2, "0")}`}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {item.description}
                      </td>
                      <td className="text-muted" style={{ fontSize: "0.82rem" }}>
                        {item.employee || "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>{item.qty || 1}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {Number(item.unitPrice || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {Number(item.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Financial Summary & Payment Box */}
          <div className="paper-summary-section">
            <div className="paper-payment-terms">
              <div className="terms-heading">Payment Information & Bank Transfer:</div>
              <p className="terms-text">
                Please make transfers payable to <strong>ABC Corporate Services LLC</strong>.<br />
                Bank: Emirates NBD • Account No: 1012345678901 • IBAN: AE070260001012345678901<br />
                All bank charges to be borne by the remitter. Thank you for your business!
              </p>
            </div>

            <div className="paper-totals-box">
              <div className="paper-total-row">
                <span>Subtotal:</span>
                <span>AED {summary.total || "0.00"}</span>
              </div>
              {Number(summary.discount || 0) > 0 && (
                <div className="paper-total-row text-red">
                  <span>Discount:</span>
                  <span>- AED {summary.discount}</span>
                </div>
              )}
              <div className="paper-total-row">
                <span>Total Before VAT:</span>
                <span>AED {summary.totalBeforeVat || summary.total || "0.00"}</span>
              </div>
              <div className="paper-total-row">
                <span>VAT (5%):</span>
                <span>AED {summary.vat || "0.00"}</span>
              </div>
              <div className="paper-total-row grand-total">
                <span>Gross Total:</span>
                <span>AED {summary.grossAmount || "0.00"}</span>
              </div>
              <div className="paper-total-row">
                <span>Amount Paid:</span>
                <span>AED {summary.paid || "0.00"}</span>
              </div>
              <div className="paper-total-row balance-due">
                <span>Balance Due:</span>
                <span>AED {summary.balance || "0.00"}</span>
              </div>
            </div>
          </div>

          {/* Signature & Stamp Row */}
          <div className="paper-signature-row">
            <div className="signature-col">
              <div className="signature-line" />
              <div className="signature-caption">Receiver's Signature</div>
            </div>
            <div className="signature-col">
              <div className="signature-line" />
              <div className="signature-caption">Authorized Signatory / Stamp</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
