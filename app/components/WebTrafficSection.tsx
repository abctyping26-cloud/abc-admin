"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface WebTrafficData {
  propertyId: string;
  liveActiveUsers: number;
  overview: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    bounceRate: number;
    avgSessionDurationSeconds: number;
  };
  landingPages: Array<{
    page: string;
    sessions: number;
    users: number;
    bounceRate: number;
  }>;
  topPages: Array<{
    path: string;
    title: string;
    views: number;
    users: number;
    bounceRate: number;
  }>;
  sources: Array<{
    source: string;
    sessions: number;
    users: number;
  }>;
  devices: Array<{
    category: string;
    users: number;
    sessions: number;
  }>;
  dailyTrend: Array<{
    date: string;
    rawDate: string;
    users: number;
    views: number;
  }>;
  hostnames: Array<{
    host: string;
    users: number;
    views: number;
  }>;
}

interface WebTrafficSectionProps {
  getAuthHeaders: () => Record<string, string>;
  selectedProject?: "abc_typing" | "abc_neon";
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export default function WebTrafficSection({
  getAuthHeaders,
  selectedProject,
}: WebTrafficSectionProps) {
  const [data, setData] = useState<WebTrafficData | null>(null);
  const [range, setRange] = useState<"today" | "7d" | "14d" | "30d" | "90d">("30d");
  const [activeTab, setActiveTab] = useState<"landing" | "pages" | "sources" | "devices">("landing");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchTraffic = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/admin/analytics/web-traffic?range=${range}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const json = await res.json();
        if (json.status === "success" && json.data) {
          setData(json.data);
          setLastRefreshedAt(new Date());
        } else if (json.status === "unconfigured") {
          setError(json.message || "Google Analytics API is not configured on the backend.");
        } else {
          throw new Error(json.message || "Failed to load web traffic analytics.");
        }
      } catch (err: any) {
        console.error("Traffic analytics fetch error:", err);
        setError(err?.message || "Failed to connect to web analytics service.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getAuthHeaders, range]
  );

  useEffect(() => {
    fetchTraffic(false);
  }, [fetchTraffic]);

  // Periodic polling for real-time active visitors every 45 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTraffic(true);
    }, 45000);
    return () => clearInterval(timer);
  }, [fetchTraffic]);

  // Filter hostnames based on selected project if available
  const isNeon = selectedProject === "abc_neon";
  const projectLabel = isNeon ? "ABC Neon" : "ABC Typing";

  const totalDeviceUsers =
    data?.devices.reduce((acc, d) => acc + d.users, 0) || 1;

  const maxTrendViews =
    data?.dailyTrend.reduce((max, d) => Math.max(max, d.views, d.users), 0) || 1;

  return (
    <section className="cloud-analytics-section" aria-label="Web Traffic Analytics">
      {/* Header */}
      <div className="cloud-analytics-header">
        <div>
          <div className="cloud-analytics-title-row">
            <h1 className="content-title cloud-analytics-title">Website Visitor Analytics</h1>
            <span
              className="cloud-analytics-live-tag"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                borderColor: "#a7f3d0",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)",
                  animation: "pulse 2s infinite",
                }}
              />
              Live Traffic & Entry Pages
            </span>
          </div>
          <p className="content-subtitle cloud-analytics-subtitle">
            Real-time visitors, entry & drop-off pages, search sources, and page popularity across <strong>{projectLabel}</strong>.
          </p>
        </div>

        <div className="cloud-analytics-actions" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Time Range Selector */}
          <div style={{ display: "inline-flex", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "3px" }}>
            {(["today", "7d", "14d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: range === r ? 600 : 500,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: range === r ? "#ffffff" : "transparent",
                  color: range === r ? "#0f172a" : "#64748b",
                  boxShadow: range === r ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {r === "today" ? "Today" : r.toUpperCase()}
              </button>
            ))}
          </div>

          {lastRefreshedAt && (
            <span className="cloud-analytics-sync-time">
              Synced {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}

          <button
            type="button"
            className="cloud-analytics-refresh-btn"
            onClick={() => fetchTraffic(true)}
            disabled={isLoading || isRefreshing}
            title="Refresh visitor analytics"
          >
            <svg
              className={`cloud-refresh-icon ${isRefreshing ? "spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "15px", height: "15px" }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div className="cloud-analytics-error-banner" style={{ marginTop: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "20px", height: "20px", color: "#ef4444", flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Live Realtime Hero Bar */}
      <div
        style={{
          marginTop: "20px",
          padding: "16px 20px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "12px",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#34d399",
                letterSpacing: "-0.5px",
              }}
            >
              {data?.liveActiveUsers ?? 0}
            </span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
                Active Visitors on Site Right Now
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  fontWeight: 600,
                }}
              >
                Realtime
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>
              Detected live in the past 30 minutes via Google Analytics 4 Property #{data?.propertyId || "557168604"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Page Views ({range.toUpperCase()})
            </span>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#38bdf8" }}>
              {(data?.overview.screenPageViews ?? 0).toLocaleString()}
            </span>
          </div>
          <div style={{ width: "1px", height: "30px", backgroundColor: "#334155" }} />
          <div style={{ textAlign: "right" }}>
            <span style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Unique Visitors
            </span>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#a78bfa" }}>
              {(data?.overview.activeUsers ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginTop: "16px",
        }}
      >
        {/* Total Visitors */}
        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Unique Visitors
          </span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
            {(data?.overview.activeUsers ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
            Distinct people browsing
          </span>
        </div>

        {/* Total Sessions */}
        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Visits (Sessions)
          </span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
            {(data?.overview.sessions ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
            Browser sessions initiated
          </span>
        </div>

        {/* Page Views */}
        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Page Views
          </span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
            {(data?.overview.screenPageViews ?? 0).toLocaleString()}
          </div>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
            Total pages opened
          </span>
        </div>

        {/* Bounce / Exit Rate */}
        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Bounce / Direct Exit Rate
          </span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
            {data?.overview.bounceRate ?? 0}%
          </div>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
            Left after viewing 1 page
          </span>
        </div>

        {/* Avg Session Duration */}
        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Avg Duration on Site
          </span>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
            {formatDuration(data?.overview.avgSessionDurationSeconds ?? 0)}
          </div>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", display: "block" }}>
            Time spent per session
          </span>
        </div>
      </div>

      {/* Daily Visits Timeline / Trend Chart */}
      {data?.dailyTrend && data.dailyTrend.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            background: "#ffffff",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Traffic Trend Over Time
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Daily unique visitors (blue) vs. total page views (emerald)
              </p>
            </div>
            <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#2563eb" }} />
                Visitors
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: "#10b981" }} />
                Page Views
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "8px",
              height: "140px",
              paddingTop: "20px",
              overflowX: "auto",
            }}
          >
            {data.dailyTrend.map((t, idx) => {
              const viewHeight = Math.max(8, (t.views / maxTrendViews) * 100);
              const userHeight = Math.max(6, (t.users / maxTrendViews) * 100);
              return (
                <div
                  key={idx}
                  style={{
                    flex: "1 1 0",
                    minWidth: "28px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                  title={`${t.date}: ${t.users} visitors, ${t.views} views`}
                >
                  <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", width: "100%", justifyContent: "center" }}>
                    <div
                      style={{
                        width: "8px",
                        height: `${userHeight}%`,
                        backgroundColor: "#2563eb",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.3s ease",
                      }}
                    />
                    <div
                      style={{
                        width: "8px",
                        height: `${viewHeight}%`,
                        backgroundColor: "#10b981",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.3s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                    {t.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Analytics Tab Navigation */}
      <div style={{ marginTop: "24px", background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            padding: "0 16px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "landing", label: "🚪 Entry Pages (Landing)" },
            { id: "pages", label: "📄 Most Visited Pages" },
            { id: "sources", label: "🌐 Traffic Sources & Search" },
            { id: "devices", label: "📱 Devices & Websites" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "14px 16px",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? "#2563eb" : "#64748b",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content 1: Entry / Landing Pages */}
        {activeTab === "landing" && (
          <div style={{ padding: "20px" }}>
            <div style={{ marginBottom: "14px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Where Visitors Enter the Website
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                These are the first landing pages people see when entering your website from Google, WhatsApp, or direct links.
              </p>
            </div>

            {data?.landingPages && data.landingPages.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Entry Page URL</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Entries (Visits)</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Unique People</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Exit / Bounce Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.landingPages.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px", fontWeight: 600, color: "#0f172a" }}>
                          <code>{row.page}</code>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#2563eb", fontWeight: 700 }}>
                          {row.sessions.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#475569" }}>
                          {row.users.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: row.bounceRate > 60 ? "#fef2f2" : "#ecfdf5",
                              color: row.bounceRate > 60 ? "#ef4444" : "#059669",
                            }}
                          >
                            {row.bounceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  No entry page data recorded yet for the selected period.
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                  As visitors open your website, Google Analytics will populate this list automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Most Visited Pages */}
        {activeTab === "pages" && (
          <div style={{ padding: "20px" }}>
            <div style={{ marginBottom: "14px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Most Visited Pages Across Websites
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Tracks which service pages and views receive the highest traffic.
              </p>
            </div>

            {data?.topPages && data.topPages.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Page Path</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600 }}>Page Title</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Total Views</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Visitors</th>
                      <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Drop-off Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px", fontWeight: 600, color: "#0f172a" }}>
                          <code>{row.path}</code>
                        </td>
                        <td style={{ padding: "12px", color: "#475569", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.title}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#059669", fontWeight: 700 }}>
                          {row.views.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#475569" }}>
                          {row.users.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: row.bounceRate > 60 ? "#fef2f2" : "#ecfdf5",
                              color: row.bounceRate > 60 ? "#ef4444" : "#059669",
                            }}
                          >
                            {row.bounceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  No page view history recorded yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Traffic Sources */}
        {activeTab === "sources" && (
          <div style={{ padding: "20px" }}>
            <div style={{ marginBottom: "14px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                Traffic Sources & Referrers
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Where your visitors are arriving from (e.g. Google Search, WhatsApp, Direct link, Instagram).
              </p>
            </div>

            {data?.sources && data.sources.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                {data.sources.map((src, idx) => (
                  <div key={idx} style={{ padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                      {src.source}
                    </span>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
                      <span>Visits: <strong style={{ color: "#2563eb" }}>{src.sessions}</strong></span>
                      <span>Users: <strong>{src.users}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                <p style={{ margin: 0, fontSize: "14px" }}>No source channels recorded yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 4: Devices & Hostnames */}
        {activeTab === "devices" && (
          <div style={{ padding: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
              {/* Devices Breakdown */}
              <div>
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  Device Breakdown
                </h4>
                {data?.devices && data.devices.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {data.devices.map((dev, idx) => {
                      const pct = Math.round((dev.users / totalDeviceUsers) * 100);
                      return (
                        <div key={idx}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                            <span style={{ fontWeight: 600, textTransform: "capitalize", color: "#0f172a" }}>
                              {dev.category === "mobile" ? "📱 Mobile Phone" : dev.category === "desktop" ? "💻 Desktop / Laptop" : "📱 Tablet"}
                            </span>
                            <span style={{ color: "#64748b" }}>{dev.users} users ({pct}%)</span>
                          </div>
                          <div style={{ height: "8px", borderRadius: "999px", backgroundColor: "#f1f5f9", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, backgroundColor: dev.category === "mobile" ? "#2563eb" : "#10b981", borderRadius: "999px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "#94a3b8" }}>No device data yet.</p>
                )}
              </div>

              {/* Websites / Hostnames */}
              <div>
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                  Traffic by Website Domain
                </h4>
                {data?.hostnames && data.hostnames.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {data.hostnames.map((host, idx) => (
                      <div key={idx} style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <code style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{host.host}</code>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          <strong style={{ color: "#2563eb" }}>{host.users}</strong> visitors ({host.views} views)
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "14px", borderRadius: "8px", border: "1px dashed #cbd5e1", fontSize: "13px", color: "#64748b" }}>
                    Currently tracking <strong>abcauh.ae</strong> and <strong>abcneon.in</strong> under Google Analytics Property <strong>#557168604</strong>.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
