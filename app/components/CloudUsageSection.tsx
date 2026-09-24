"use client";

import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../config/api";

export interface CloudinaryUsageData {
  status: "active" | "unconfigured" | "error";
  message?: string;
  plan?: string;
  lastUpdated?: string;
  credits?: {
    usage: number;
    limit: number;
    percentUsage: number;
  };
  storage?: {
    bytes: number;
    formatted: string;
    creditsUsage: number;
  };
  bandwidth?: {
    bytes: number;
    formatted: string;
    creditsUsage: number;
  };
  transformations?: {
    usage: number;
    creditsUsage: number;
  };
  objects?: {
    count: number;
  };
}

export interface MongoUsageData {
  status: "connected" | "disconnected" | "error";
  message?: string;
  dbName?: string;
  collections?: number;
  documents?: number;
  avgObjectSizeFormatted?: string;
  storage?: {
    bytes: number;
    formatted: string;
    percentUsed: number;
    quotaBytes: number;
    quotaFormatted: string;
  };
  data?: {
    bytes: number;
    formatted: string;
  };
  indexes?: {
    count: number;
    bytes: number;
    formatted: string;
  };
  totalSize?: {
    bytes: number;
    formatted: string;
  };
}

export interface RenderUsageData {
  status: "operational" | "error";
  message?: string;
  isRender?: boolean;
  serviceName?: string;
  serviceId?: string | null;
  plan?: string;
  uptimeSeconds?: number;
  uptimeFormatted?: string;
  nodeVersion?: string;
  environment?: string;
  memory?: {
    rssBytes: number;
    rssFormatted: string;
    heapUsedBytes: number;
    heapUsedFormatted: string;
    heapTotalBytes: number;
    heapTotalFormatted: string;
    limitBytes: number;
    limitFormatted: string;
    percentUsed: number;
  };
}

export interface CloudUsageResponse {
  cloudinary?: CloudinaryUsageData;
  mongodb?: MongoUsageData;
  render?: RenderUsageData;
}

interface CloudUsageSectionProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function CloudUsageSection({ getAuthHeaders }: CloudUsageSectionProps) {
  const [data, setData] = useState<CloudUsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchMetrics = useCallback(
    async (manual = false) => {
      if (manual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/analytics/cloud-usage`, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const json = await res.json();
        if (json.status === "success" && json.data) {
          setData(json.data);
          setLastRefreshedAt(new Date());
        } else {
          throw new Error(json.message || "Failed to load usage statistics.");
        }
      } catch (err: any) {
        console.error("Failed to load cloud usage metrics:", err);
        setError(err?.message || "Failed to communicate with analytics service.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  const getProgressColor = (percent: number): string => {
    if (percent >= 90) return "#ef4444"; // Red
    if (percent >= 70) return "#f59e0b"; // Amber
    return "#10b981"; // Emerald
  };

  return (
    <section className="cloud-analytics-section" aria-label="Cloud and Infrastructure Usage">
      <div className="cloud-analytics-header">
        <div>
          <div className="cloud-analytics-title-row">
            <h1 className="content-title cloud-analytics-title">Cloud & Infrastructure Usage</h1>
            <span className="cloud-analytics-live-tag">Live Metrics</span>
          </div>
          <p className="content-subtitle cloud-analytics-subtitle">
            Real-time usage quotas and resource monitoring for Cloudinary, MongoDB Atlas, and Render.
          </p>
        </div>

        <div className="cloud-analytics-actions">
          {lastRefreshedAt && (
            <span className="cloud-analytics-sync-time">
              Synced {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            className="cloud-analytics-refresh-btn"
            onClick={() => fetchMetrics(true)}
            disabled={isLoading || isRefreshing}
            title="Refresh usage analytics"
          >
            <svg
              className={`cloud-refresh-icon ${isRefreshing ? "spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="cloud-analytics-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
          <button type="button" onClick={() => fetchMetrics(true)} className="cloud-retry-btn">
            Retry
          </button>
        </div>
      )}

      <div className="cloud-analytics-grid">
        {/* =========================================================================
            CARD 1: CLOUDINARY
            ========================================================================= */}
        <div className="cloud-card">
          <div className="cloud-card-top">
            <div className="cloud-card-header">
              <div className="cloud-icon-box cloudinary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
              </div>
              <div className="cloud-card-title-group">
                <span className="cloud-provider-name">Cloudinary</span>
                <span className="cloud-provider-badge">
                  {data?.cloudinary?.plan ? `${data.cloudinary.plan} Plan` : "Media Storage"}
                </span>
              </div>
            </div>
            <span
              className={`cloud-status-pill ${
                data?.cloudinary?.status === "active"
                  ? "active"
                  : data?.cloudinary?.status === "unconfigured"
                  ? "warning"
                  : "error"
              }`}
            >
              {data?.cloudinary?.status === "active"
                ? "Active"
                : data?.cloudinary?.status === "unconfigured"
                ? "Setup Required"
                : "Offline"}
            </span>
          </div>

          {isLoading && !data ? (
            <div className="cloud-card-skeleton">
              <div className="skeleton-bar" />
              <div className="skeleton-grid" />
            </div>
          ) : data?.cloudinary?.status === "unconfigured" ? (
            <div className="cloud-card-empty-msg">
              Cloudinary API credentials are not set in the server environment.
            </div>
          ) : data?.cloudinary?.status === "error" ? (
            <div className="cloud-card-empty-msg error">
              {data.cloudinary.message || "Failed to fetch Cloudinary usage."}
            </div>
          ) : (
            <>
              {/* Progress Bar: Credits or Storage */}
              <div className="cloud-progress-wrapper">
                <div className="cloud-progress-info">
                  <span className="cloud-progress-label">Monthly Credits Used</span>
                  <span className="cloud-progress-val">
                    <strong>{data?.cloudinary?.credits?.usage ?? 0}</strong> / {data?.cloudinary?.credits?.limit ?? 25} credits
                  </span>
                </div>
                <div className="cloud-progress-track">
                  <div
                    className="cloud-progress-fill"
                    style={{
                      width: `${Math.max(2, Math.min(100, data?.cloudinary?.credits?.percentUsage ?? 0))}%`,
                      backgroundColor: getProgressColor(data?.cloudinary?.credits?.percentUsage ?? 0),
                    }}
                  />
                </div>
                <div className="cloud-progress-caption">
                  <span>{data?.cloudinary?.credits?.percentUsage ?? 0}% quota consumed</span>
                  <span>{Math.max(0, 100 - (data?.cloudinary?.credits?.percentUsage ?? 0)).toFixed(1)}% remaining</span>
                </div>
              </div>

              {/* Detailed Metrics Grid */}
              <div className="cloud-metrics-breakdown">
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Storage Used</span>
                  <span className="cloud-metric-item-value">{data?.cloudinary?.storage?.formatted || "0 B"}</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Bandwidth</span>
                  <span className="cloud-metric-item-value">{data?.cloudinary?.bandwidth?.formatted || "0 B"}</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Total Assets</span>
                  <span className="cloud-metric-item-value">{data?.cloudinary?.objects?.count ?? 0} files</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Transformations</span>
                  <span className="cloud-metric-item-value">{data?.cloudinary?.transformations?.usage ?? 0}</span>
                </div>
              </div>

              <div className="cloud-card-footer">
                <span className="cloud-footer-status">
                  <span className="status-dot green" />
                  Synced with Cloudinary Admin API
                </span>
              </div>
            </>
          )}
        </div>

        {/* =========================================================================
            CARD 2: MONGODB ATLAS
            ========================================================================= */}
        <div className="cloud-card">
          <div className="cloud-card-top">
            <div className="cloud-card-header">
              <div className="cloud-icon-box mongodb">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="cloud-card-title-group">
                <span className="cloud-provider-name">MongoDB Database</span>
                <span className="cloud-provider-badge">Atlas M0 Free Tier</span>
              </div>
            </div>
            <span
              className={`cloud-status-pill ${
                data?.mongodb?.status === "connected" ? "active" : "error"
              }`}
            >
              {data?.mongodb?.status === "connected" ? "Connected" : "Disconnected"}
            </span>
          </div>

          {isLoading && !data ? (
            <div className="cloud-card-skeleton">
              <div className="skeleton-bar" />
              <div className="skeleton-grid" />
            </div>
          ) : data?.mongodb?.status !== "connected" ? (
            <div className="cloud-card-empty-msg error">
              {data?.mongodb?.message || "MongoDB connection is inactive."}
            </div>
          ) : (
            <>
              {/* Progress Bar: Storage Size vs 512 MB */}
              <div className="cloud-progress-wrapper">
                <div className="cloud-progress-info">
                  <span className="cloud-progress-label">Storage Allocated (512 MB Free Quota)</span>
                  <span className="cloud-progress-val">
                    <strong>{data?.mongodb?.storage?.formatted}</strong> / 512 MB
                  </span>
                </div>
                <div className="cloud-progress-track">
                  <div
                    className="cloud-progress-fill"
                    style={{
                      width: `${Math.max(1.5, Math.min(100, data?.mongodb?.storage?.percentUsed ?? 0))}%`,
                      backgroundColor: getProgressColor(data?.mongodb?.storage?.percentUsed ?? 0),
                    }}
                  />
                </div>
                <div className="cloud-progress-caption">
                  <span>{data?.mongodb?.storage?.percentUsed ?? 0}% disk limit used</span>
                  <span>Quota: 512 MB</span>
                </div>
              </div>

              {/* Detailed Metrics Grid */}
              <div className="cloud-metrics-breakdown">
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Raw Data Size</span>
                  <span className="cloud-metric-item-value">{data?.mongodb?.data?.formatted || "0 B"}</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Index Storage</span>
                  <span className="cloud-metric-item-value">{data?.mongodb?.indexes?.formatted || "0 B"}</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Total Documents</span>
                  <span className="cloud-metric-item-value">{data?.mongodb?.documents ?? 0} docs</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Collections</span>
                  <span className="cloud-metric-item-value">{data?.mongodb?.collections ?? 0} tables</span>
                </div>
              </div>

              <div className="cloud-card-footer">
                <span className="cloud-footer-status">
                  <span className="status-dot green" />
                  Cluster DB: <strong>{data?.mongodb?.dbName}</strong>
                </span>
              </div>
            </>
          )}
        </div>

        {/* =========================================================================
            CARD 3: RENDER SERVER & RUNTIME
            ========================================================================= */}
        <div className="cloud-card">
          <div className="cloud-card-top">
            <div className="cloud-card-header">
              <div className="cloud-icon-box render">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
              </div>
              <div className="cloud-card-title-group">
                <span className="cloud-provider-name">Render Backend</span>
                <span className="cloud-provider-badge">
                  {data?.render?.isRender ? "Render Cloud" : "Node Server"}
                </span>
              </div>
            </div>
            <span
              className={`cloud-status-pill ${
                data?.render?.status === "operational" ? "active" : "error"
              }`}
            >
              {data?.render?.status === "operational" ? "Healthy" : "Offline"}
            </span>
          </div>

          {isLoading && !data ? (
            <div className="cloud-card-skeleton">
              <div className="skeleton-bar" />
              <div className="skeleton-grid" />
            </div>
          ) : data?.render?.status !== "operational" ? (
            <div className="cloud-card-empty-msg error">
              {data?.render?.message || "Server runtime status unavailable."}
            </div>
          ) : (
            <>
              {/* Progress Bar: Instance RAM vs 512 MB */}
              <div className="cloud-progress-wrapper">
                <div className="cloud-progress-info">
                  <span className="cloud-progress-label">Memory RAM (RSS Usage)</span>
                  <span className="cloud-progress-val">
                    <strong>{data?.render?.memory?.rssFormatted}</strong> / {data?.render?.memory?.limitFormatted}
                  </span>
                </div>
                <div className="cloud-progress-track">
                  <div
                    className="cloud-progress-fill"
                    style={{
                      width: `${Math.max(2, Math.min(100, data?.render?.memory?.percentUsed ?? 0))}%`,
                      backgroundColor: getProgressColor(data?.render?.memory?.percentUsed ?? 0),
                    }}
                  />
                </div>
                <div className="cloud-progress-caption">
                  <span>{data?.render?.memory?.percentUsed ?? 0}% instance RAM used</span>
                  <span>Limit: 512 MB</span>
                </div>
              </div>

              {/* Detailed Metrics Grid */}
              <div className="cloud-metrics-breakdown">
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Heap Memory</span>
                  <span className="cloud-metric-item-value">{data?.render?.memory?.heapUsedFormatted || "0 B"}</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Server Uptime</span>
                  <span className="cloud-metric-item-value">{data?.render?.uptimeFormatted || "0m"}</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Node Runtime</span>
                  <span className="cloud-metric-item-value">{data?.render?.nodeVersion || "v20+"}</span>
                </div>
                <div className="cloud-metric-item">
                  <span className="cloud-metric-item-label">Environment</span>
                  <span className="cloud-metric-item-value" style={{ textTransform: "capitalize" }}>
                    {data?.render?.environment || "production"}
                  </span>
                </div>
              </div>

              <div className="cloud-card-footer">
                <span className="cloud-footer-status">
                  <span className="status-dot green" />
                  Service: <strong>{data?.render?.serviceName}</strong>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
