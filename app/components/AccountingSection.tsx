"use client";

import React, { useState } from "react";
import InvoiceView from "./InvoiceView";
import BankManager from "./BankManager";
export type AccountingCategory = "masters" | "activities" | "reports" | "finance";
export type FinanceAction = "invoice" | "banks" | "income" | "expense" | "referral_payment" | "bank_transaction";

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
}

export default function AccountingSection({ user }: AccountingSectionProps = {}) {
  const [activeCategory, setActiveCategory] = useState<AccountingCategory>("finance");
  const [activeFinanceAction, setActiveFinanceAction] = useState<FinanceAction | null>(null);

  return (
    <div className="accounting-manager-container">
      {/* Top Header Row: Accounting Title on Left, 4 Ribbon Cube Buttons on Right (UNCHANGED) */}
      <div className="content-header-row accounting-header-row" style={{ marginBottom: "16px" }}>
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
        {/* Left/Center Main Content Canvas (Invoice View or Bank Manager shown when active) */}
        <div className="accounting-main-canvas">
          {activeCategory === "finance" && activeFinanceAction === "invoice" ? (
            <InvoiceView user={user} onClose={() => setActiveFinanceAction(null)} />
          ) : activeCategory === "finance" && activeFinanceAction === "banks" ? (
            <BankManager user={user} />
          ) : (
            <div className="accounting-empty-space" />
          )}
        </div>

        {/* Ubuntu-Style Right Edge Action Dock (Visible when Finance is active) */}
        {activeCategory === "finance" && (
          <aside className="accounting-right-dock" aria-label="Finance Actions Dock">
            {/* Dock Header */}
            <div className="dock-header">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <ellipse cx="12" cy="16" rx="8" ry="3.5" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                <ellipse cx="11" cy="13" rx="7.5" ry="3.2" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                <ellipse cx="9" cy="10" rx="7" ry="3" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
                <text x="9" y="12" textAnchor="middle" fill="#854d0e" fontSize="6" fontWeight="bold">
                  $
                </text>
              </svg>
              <span className="dock-header-title">Finance</span>
            </div>

            {/* Vertical Stack of Dock Action Buttons */}
            <div className="dock-items-wrapper" role="toolbar" aria-label="Finance Actions">
              {/* Invoice */}
              <button
                type="button"
                className={`dock-action-cube ${activeFinanceAction === "invoice" ? "active" : ""}`}
                onClick={() => setActiveFinanceAction((prev: FinanceAction | null) => (prev === "invoice" ? null : "invoice"))}
                title="Invoice"
              >
                <span className="dock-active-pip" aria-hidden="true" />
                <div className="dock-cube-icon">
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
                <span className="dock-cube-label">Invoice</span>
              </button>

              {/* Banks */}
              <button
                type="button"
                className={`dock-action-cube ${activeFinanceAction === "banks" ? "active" : ""}`}
                onClick={() => setActiveFinanceAction((prev: FinanceAction | null) => (prev === "banks" ? null : "banks"))}
                title="Bank Accounts"
              >
                <span className="dock-active-pip" aria-hidden="true" />
                <div className="dock-cube-icon">
                  <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                    <polygon points="18,5 4,12 32,12" fill="#1e3a8a" />
                    <rect x="6" y="12" width="24" height="2" fill="#3b82f6" />
                    <rect x="8" y="14" width="3" height="11" rx="0.5" fill="#60a5fa" />
                    <rect x="13.5" y="14" width="3" height="11" rx="0.5" fill="#60a5fa" />
                    <rect x="19.5" y="14" width="3" height="11" rx="0.5" fill="#60a5fa" />
                    <rect x="25" y="14" width="3" height="11" rx="0.5" fill="#60a5fa" />
                    <rect x="4" y="25" width="28" height="3" rx="0.5" fill="#1e3a8a" />
                    <rect x="2" y="28" width="32" height="2.5" rx="0.5" fill="#0f172a" />
                  </svg>
                </div>
                <span className="dock-cube-label">Banks</span>
              </button>

              {/* Income */}
              <button
                type="button"
                className={`dock-action-cube ${activeFinanceAction === "income" ? "active" : ""}`}
                onClick={() => setActiveFinanceAction("income")}
                title="Income"
              >
                <span className="dock-active-pip" aria-hidden="true" />
                <div className="dock-cube-icon">
                  <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                    <path d="M18 2v10m-3.5-3.5L18 12l3.5-3.5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="4" y="14" width="28" height="16" rx="2" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
                    <circle cx="18" cy="22" r="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
                    <text x="18" y="24.5" textAnchor="middle" fill="#15803d" fontSize="7" fontWeight="bold">
                      $
                    </text>
                  </svg>
                </div>
                <span className="dock-cube-label">Income</span>
              </button>

              {/* Expense */}
              <button
                type="button"
                className={`dock-action-cube ${activeFinanceAction === "expense" ? "active" : ""}`}
                onClick={() => setActiveFinanceAction("expense")}
                title="Expense"
              >
                <span className="dock-active-pip" aria-hidden="true" />
                <div className="dock-cube-icon">
                  <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                    <path d="M18 12V2m-3.5 3.5L18 2l3.5 3.5" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="4" y="14" width="28" height="16" rx="2" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.5" />
                    <circle cx="18" cy="22" r="4" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.2" />
                    <text x="18" y="24.5" textAnchor="middle" fill="#b91c1c" fontSize="7" fontWeight="bold">
                      $
                    </text>
                  </svg>
                </div>
                <span className="dock-cube-label">Expense</span>
              </button>

              {/* Referral Payment */}
              <button
                type="button"
                className={`dock-action-cube ${activeFinanceAction === "referral_payment" ? "active" : ""}`}
                onClick={() => setActiveFinanceAction("referral_payment")}
                title="Referral Payment"
              >
                <span className="dock-active-pip" aria-hidden="true" />
                <div className="dock-cube-icon">
                  <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                    <rect x="4" y="7" width="22" height="13" rx="1.5" transform="rotate(-8 4 7)" fill="#ecfdf5" stroke="#059669" strokeWidth="1.2" />
                    <rect x="6" y="9" width="22" height="13" rx="1.5" fill="#f0fdf4" stroke="#10b981" strokeWidth="1.3" />
                    <circle cx="17" cy="15.5" r="3.2" fill="#d1fae5" stroke="#059669" strokeWidth="1" />
                    <ellipse cx="25" cy="25" rx="7.5" ry="3.5" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                    <ellipse cx="23" cy="22" rx="7.5" ry="3.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                    <ellipse cx="20" cy="19" rx="7" ry="3.2" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
                    <text x="20" y="21" textAnchor="middle" fill="#854d0e" fontSize="6.5" fontWeight="bold">
                      $
                    </text>
                  </svg>
                </div>
                <span className="dock-cube-label">Referral</span>
              </button>

              {/* Bank Transaction */}
              <button
                type="button"
                className={`dock-action-cube ${activeFinanceAction === "bank_transaction" ? "active" : ""}`}
                onClick={() => setActiveFinanceAction("bank_transaction")}
                title="Bank Transaction"
              >
                <span className="dock-active-pip" aria-hidden="true" />
                <div className="dock-cube-icon">
                  <svg viewBox="0 0 36 36" width="28" height="28" fill="none" aria-hidden="true">
                    <rect x="8" y="8" width="20" height="24" rx="2" fill="#ffffff" stroke="#64748b" strokeWidth="1.5" />
                    <line x1="12" y1="14" x2="24" y2="14" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="12" y1="18" x2="24" y2="18" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="12" y1="22" x2="20" y2="22" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="12" y1="26" x2="18" y2="26" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M12 12V5a3 3 0 0 1 6 0v8a4.5 4.5 0 0 1-9 0V6" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="dock-cube-label">Bank Tx</span>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
