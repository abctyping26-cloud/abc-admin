/**
 * Centralized API configuration for the ABC Admin portal.
 *
 * In production, if NEXT_PUBLIC_API_URL is omitted during build,
 * automatically falls back to the production Render backend instead of localhost.
 */
export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.");
    if (!isLocal) {
      return "https://abc-server-s6rb.onrender.com";
    }
  }
  return "http://localhost:5000";
};

export const API_BASE_URL = getApiBaseUrl();
