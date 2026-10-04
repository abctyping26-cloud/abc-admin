"use client";

import React, { useState } from "react";
import InvoiceView from "./InvoiceView";
import QuotationView from "./QuotationView";
import AdvanceReceiptView from "./AdvanceReceiptView";
import PaymentVoucherView from "./PaymentVoucherView";
import ReceiptVoucherView from "./ReceiptVoucherView";
import IncomeView from "./IncomeView";
import ExpenseView from "./ExpenseView";
import BankTransactionView from "./BankTransactionView";
import BankManager from "./BankManager";
export type AccountingCategory = "masters" | "activities" | "reports" | "finance";
export type ActivitiesAction =
  | "invoice"
  | "quotation"
  | "advance_receipt"
  | "payment_voucher"
  | "receipt_voucher";

export type FinanceAction = "income" | "expense" | "bank_transaction";

export interface CurrentAdminUser {
  id?: string;
  identifier?: string;
  role?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  location?: string;
  deviceInfo?: string;
  profileCompleted?: boolean;
  isFirstLogin?: boolean;
}

export interface AccountingSectionProps {
  user?: CurrentAdminUser | null;
  initialCategory?: AccountingCategory;
  initialFinanceAction?: FinanceAction | null;
  getAuthHeaders?: () => Record<string, string>;
}

export default function AccountingSection({
  user,
  initialCategory = "finance",
  initialFinanceAction = "income",
  getAuthHeaders,
}: AccountingSectionProps = {}) {
  const [activeCategory, setActiveCategory] = useState<AccountingCategory>(() => {
    if (typeof window !== "undefined") {
      const storedCat = sessionStorage.getItem("abc_accounting_category") as AccountingCategory | null;
      if (storedCat) {
        sessionStorage.removeItem("abc_accounting_category");
        return storedCat;
      }
    }
    return initialCategory;
  });
  const [activeActivityAction, setActiveActivityAction] = useState<ActivitiesAction | null>("invoice");
  const [activeFinanceAction, setActiveFinanceAction] = useState<FinanceAction | null>(() => {
    if (typeof window !== "undefined") {
      const storedAction = sessionStorage.getItem("abc_accounting_finance_action") as FinanceAction | null;
      if (storedAction) {
        sessionStorage.removeItem("abc_accounting_finance_action");
        return storedAction;
      }
    }
    return initialFinanceAction;
  });

  React.useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ category?: AccountingCategory; financeAction?: FinanceAction }>;
      if (customEvent.detail?.category) {
        setActiveCategory(customEvent.detail.category);
      }
      if (customEvent.detail?.financeAction) {
        setActiveFinanceAction(customEvent.detail.financeAction);
      }
    };
    window.addEventListener("abc_navigate_accounting", handleNav);
    return () => window.removeEventListener("abc_navigate_accounting", handleNav);
  }, []);

  return (
    <div className="accounting-manager-container">
      {/* Top Header Row: Accounting Title on Left, 4 Ribbon Cube Buttons on Right */}
      <div className="content-header-row accounting-header-row">
        <div>
          <h1 className="content-title">Accounting</h1>
        </div>

        {/* Top 4 Ribbon Cube Buttons: Masters, Activities, Reports, Finance */}
        <div className="accounting-top-cubes" role="tablist" aria-label="Accounting Modules">
          {/* Masters */}
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "masters"}
            className={`accounting-cube-btn ${activeCategory === "masters" ? "active" : ""}`}
            onClick={() => setActiveCategory("masters")}
            title="Masters"
          >
            <div className="cube-icon-wrapper">
              <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                <path
                  d="M8 5a2 2 0 0 1 2-2h11l7 7v19a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V5z"
                  fill="#ffffff"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <path d="M21 3v7h7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                <circle cx="14" cy="20" r="8.5" fill="url(#mastersRedGrad)" stroke="#991b1b" strokeWidth="1" />
                <text x="14" y="23.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                  M
                </text>
                <defs>
                  <radialGradient id="mastersRedGrad" cx="35%" cy="35%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <span className="cube-label">Masters</span>
          </button>

          {/* Activities */}
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "activities"}
            className={`accounting-cube-btn ${activeCategory === "activities" ? "active" : ""}`}
            onClick={() => setActiveCategory("activities")}
            title="Activities"
          >
            <div className="cube-icon-wrapper">
              <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                <path
                  d="M8 5a2 2 0 0 1 2-2h11l7 7v19a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V5z"
                  fill="#ffffff"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <path d="M21 3v7h7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                <circle cx="14" cy="20" r="8.5" fill="url(#actGreenGrad)" stroke="#166534" strokeWidth="1" />
                <path d="M10.5 20l2.5 2.5 5-5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <radialGradient id="actGreenGrad" cx="35%" cy="35%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <span className="cube-label">Activities</span>
          </button>

          {/* Reports */}
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "reports"}
            className={`accounting-cube-btn ${activeCategory === "reports" ? "active" : ""}`}
            onClick={() => setActiveCategory("reports")}
            title="Reports"
          >
            <div className="cube-icon-wrapper">
              <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                <path
                  d="M8 5a2 2 0 0 1 2-2h11l7 7v19a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V5z"
                  fill="#ffffff"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <path d="M21 3v7h7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                <g transform="rotate(-35 18 19)">
                  <rect x="15" y="8" width="6" height="15" rx="1" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
                  <polygon points="15,23 21,23 18,28" fill="#fde68a" stroke="#b45309" strokeWidth="1" />
                  <polygon points="17,26.5 19,26.5 18,28" fill="#1e293b" />
                  <rect x="15" y="6" width="6" height="3" rx="0.5" fill="#ef4444" stroke="#b45309" strokeWidth="0.8" />
                </g>
              </svg>
            </div>
            <span className="cube-label">Reports</span>
          </button>

          {/* Finance */}
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "finance"}
            className={`accounting-cube-btn ${activeCategory === "finance" ? "active" : ""}`}
            onClick={() => setActiveCategory("finance")}
            title="Finance"
          >
            <div className="cube-icon-wrapper">
              <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                <path
                  d="M8 5a2 2 0 0 1 2-2h11l7 7v19a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V5z"
                  fill="#ffffff"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <path d="M21 3v7h7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
                <ellipse cx="18" cy="24" rx="8.5" ry="3.8" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                <ellipse cx="16" cy="21" rx="8" ry="3.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                <ellipse cx="14" cy="18" rx="7.5" ry="3.2" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
                <text x="14" y="20" textAnchor="middle" fill="#854d0e" fontSize="6.5" fontWeight="bold">
                  $
                </text>
              </svg>
            </div>
            <span className="cube-label">Finance</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Open Canvas on Left, Ubuntu-Style Right Edge Dock on Right */}
      <div className="accounting-workspace-layout">
        {/* Left/Center Main Content Canvas */}
        <div className="accounting-main-canvas">
          {activeCategory === "activities" && activeActivityAction === "invoice" ? (
            <InvoiceView user={user} onClose={() => setActiveActivityAction(null)} />
          ) : activeCategory === "activities" && activeActivityAction === "quotation" ? (
            <QuotationView user={user} onClose={() => setActiveActivityAction(null)} />
          ) : activeCategory === "activities" && activeActivityAction === "advance_receipt" ? (
            <AdvanceReceiptView user={user} onClose={() => setActiveActivityAction(null)} />
          ) : activeCategory === "activities" && activeActivityAction === "payment_voucher" ? (
            <PaymentVoucherView user={user} onClose={() => setActiveActivityAction(null)} />
          ) : activeCategory === "activities" && activeActivityAction === "receipt_voucher" ? (
            <ReceiptVoucherView user={user} onClose={() => setActiveActivityAction(null)} />
          ) : activeCategory === "finance" && activeFinanceAction === "income" ? (
            <IncomeView user={user} onClose={() => setActiveFinanceAction(null)} getAuthHeaders={getAuthHeaders} />
          ) : activeCategory === "finance" && activeFinanceAction === "expense" ? (
            <ExpenseView user={user} onClose={() => setActiveFinanceAction(null)} getAuthHeaders={getAuthHeaders} />
          ) : activeCategory === "finance" && activeFinanceAction === "bank_transaction" ? (
            <BankTransactionView user={user} onClose={() => setActiveFinanceAction(null)} getAuthHeaders={getAuthHeaders} />
          ) : (
            <div className="accounting-empty-space" />
          )}
        </div>

        {/* Right Edge Action Buttons for Activities */}
        {activeCategory === "activities" && (
          <aside className="accounting-right-dock" aria-label="Activities Actions">
            {/* Invoice */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeActivityAction === "invoice" ? "active" : ""}`}
              onClick={() => setActiveActivityAction((prev: ActivitiesAction | null) => (prev === "invoice" ? null : "invoice"))}
              title="Invoice"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  {/* Document sheet */}
                  <path
                    d="M8 5a2 2 0 0 1 2-2h10l7 7v21a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V5z"
                    fill="#ffffff"
                    stroke="#2563eb"
                    strokeWidth="1.5"
                  />
                  {/* Folded corner */}
                  <path d="M20 3v7h7" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
                  {/* Blue header bar */}
                  <rect x="11" y="11" width="14" height="2.5" rx="0.75" fill="#2563eb" />
                  {/* Invoice lines */}
                  <line x1="11" y1="16.5" x2="25" y2="16.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="20.5" x2="21" y2="20.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="24.5" x2="18" y2="24.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  {/* Bottom coin/stamp badge */}
                  <circle cx="23" cy="25.5" r="3.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
                  <text x="23" y="27.5" textAnchor="middle" fill="#854d0e" fontSize="5" fontWeight="bold">
                    $
                  </text>
                </svg>
              </div>
              <span className="cube-label">Invoice</span>
            </button>

            {/* Quotation */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeActivityAction === "quotation" ? "active" : ""}`}
              onClick={() => setActiveActivityAction((prev: ActivitiesAction | null) => (prev === "quotation" ? null : "quotation"))}
              title="Quotation"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  <path
                    d="M8 5a2 2 0 0 1 2-2h10l7 7v21a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V5z"
                    fill="#ffffff"
                    stroke="#7c3aed"
                    strokeWidth="1.5"
                  />
                  <path d="M20 3v7h7" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
                  <rect x="11" y="11" width="14" height="2.5" rx="0.75" fill="#7c3aed" />
                  <line x1="11" y1="16.5" x2="25" y2="16.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="20.5" x2="21" y2="20.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="23" cy="25" r="4" fill="url(#quoteGrad)" stroke="#6d28d9" strokeWidth="1" />
                  <text x="23" y="27.5" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">
                    Q
                  </text>
                  <defs>
                    <radialGradient id="quoteGrad" cx="35%" cy="35%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6d28d9" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <span className="cube-label">Quotation</span>
            </button>

            {/* Advance Receipt */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeActivityAction === "advance_receipt" ? "active" : ""}`}
              onClick={() => setActiveActivityAction((prev: ActivitiesAction | null) => (prev === "advance_receipt" ? null : "advance_receipt"))}
              title="Advance Receipt"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  <rect x="6" y="5" width="24" height="26" rx="2" fill="#ffffff" stroke="#059669" strokeWidth="1.5" />
                  <path d="M6 11h24" stroke="#059669" strokeWidth="1.5" />
                  <line x1="10" y1="16" x2="26" y2="16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="10" y1="20" x2="20" y2="20" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="23" cy="24" r="4.2" fill="url(#advGreenGrad)" stroke="#047857" strokeWidth="1" />
                  <text x="23" y="26.2" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="bold" fontFamily="sans-serif">
                    AR
                  </text>
                  <defs>
                    <radialGradient id="advGreenGrad" cx="35%" cy="35%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#047857" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <span className="cube-label">Adv Receipt</span>
            </button>

            {/* Payment Voucher */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeActivityAction === "payment_voucher" ? "active" : ""}`}
              onClick={() => setActiveActivityAction((prev: ActivitiesAction | null) => (prev === "payment_voucher" ? null : "payment_voucher"))}
              title="Payment Voucher"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  <rect x="4" y="8" width="28" height="20" rx="2" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
                  <line x1="4" y1="14" x2="32" y2="14" stroke="#ea580c" strokeWidth="1.5" />
                  <line x1="8" y1="19" x2="18" y2="19" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="8" y1="23" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="25" cy="21" r="4.2" fill="url(#payAmberGrad)" stroke="#c2410c" strokeWidth="1" />
                  <text x="25" y="23.2" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="bold" fontFamily="sans-serif">
                    PV
                  </text>
                  <defs>
                    <radialGradient id="payAmberGrad" cx="35%" cy="35%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#c2410c" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <span className="cube-label">Pay Voucher</span>
            </button>

            {/* Receipt Voucher */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeActivityAction === "receipt_voucher" ? "active" : ""}`}
              onClick={() => setActiveActivityAction((prev: ActivitiesAction | null) => (prev === "receipt_voucher" ? null : "receipt_voucher"))}
              title="Receipt Voucher"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  <rect x="5" y="6" width="26" height="24" rx="2" fill="#ffffff" stroke="#0891b2" strokeWidth="1.5" />
                  <line x1="9" y1="11" x2="27" y2="11" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="9" y1="16" x2="27" y2="16" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="9" y1="21" x2="19" y2="21" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="24" cy="23" r="4.2" fill="url(#recCyanGrad)" stroke="#0e7490" strokeWidth="1" />
                  <text x="24" y="25.2" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="bold" fontFamily="sans-serif">
                    RV
                  </text>
                  <defs>
                    <radialGradient id="recCyanGrad" cx="35%" cy="35%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0e7490" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <span className="cube-label">Rec Voucher</span>
            </button>
          </aside>
        )}

        {/* Right Edge Action Buttons for Finance */}
        {activeCategory === "finance" && (
          <aside className="accounting-right-dock" aria-label="Finance Actions">
            {/* Income */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeFinanceAction === "income" ? "active" : ""}`}
              onClick={() => setActiveFinanceAction((prev: FinanceAction | null) => (prev === "income" ? null : "income"))}
              title="Income"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  <path d="M18 2v10m-3.5-3.5L18 12l3.5-3.5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="4" y="14" width="28" height="16" rx="2" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
                  <circle cx="18" cy="22" r="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
                  <text x="18" y="24.5" textAnchor="middle" fill="#15803d" fontSize="7" fontWeight="bold">
                    $
                  </text>
                </svg>
              </div>
              <span className="cube-label">Income</span>
            </button>

            {/* Expense */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeFinanceAction === "expense" ? "active" : ""}`}
              onClick={() => setActiveFinanceAction((prev: FinanceAction | null) => (prev === "expense" ? null : "expense"))}
              title="Expense"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  <path d="M18 12V2m-3.5 3.5L18 2l3.5 3.5" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="4" y="14" width="28" height="16" rx="2" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.5" />
                  <circle cx="18" cy="22" r="4" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.2" />
                  <text x="18" y="24.5" textAnchor="middle" fill="#b91c1c" fontSize="7" fontWeight="bold">
                    $
                  </text>
                </svg>
              </div>
              <span className="cube-label">Expense</span>
            </button>

            {/* Bank Transaction */}
            <button
              type="button"
              className={`accounting-cube-btn ${activeFinanceAction === "bank_transaction" ? "active" : ""}`}
              onClick={() => setActiveFinanceAction((prev: FinanceAction | null) => (prev === "bank_transaction" ? null : "bank_transaction"))}
              title="Bank Transaction"
            >
              <div className="cube-icon-wrapper">
                <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                  <rect x="8" y="8" width="20" height="24" rx="2" fill="#ffffff" stroke="#64748b" strokeWidth="1.5" />
                  <line x1="12" y1="14" x2="24" y2="14" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="12" y1="18" x2="24" y2="18" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="12" y1="22" x2="20" y2="22" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="12" y1="26" x2="18" y2="26" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 12V5a3 3 0 0 1 6 0v8a4.5 4.5 0 0 1-9 0V6" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <span className="cube-label">Bank Tx</span>
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
