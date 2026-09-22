"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "../config/api";

/**
 * ServerWarmer component
 * 
 * Silently sends a lightweight GET /health request to the backend server
 * when any user visits the admin portal. If the backend hosted on Render is asleep
 * (due to 15-minute inactivity spin-down), this wake-up ping triggers its boot
 * cycle in the background before the admin attempts to log in.
 *
 * Uses sessionStorage so it only runs once per browser session.
 */
export default function ServerWarmer() {
  useEffect(() => {
    try {
      const isWarmed = sessionStorage.getItem("abc_server_warmed");
      if (isWarmed) return;

      // Fire and forget: trigger wake-up without blocking UI
      fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        mode: "cors",
      })
        .then(() => {
          sessionStorage.setItem("abc_server_warmed", "true");
        })
        .catch(() => {
          // Silently ignore while spinning up or if network is offline
        });
    } catch {
      // Ignore sessionStorage access restrictions if cookies/storage are disabled
    }
  }, []);

  return null;
}
