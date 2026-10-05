"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL } from "../config/api";

const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const TAB_SWITCH_COOLDOWN = 60 * 1000; // 1 minute cooldown to prevent spam on rapid tab switches

/**
 * ServerWarmer component
 * 
 * Silently sends a lightweight GET /health request to keep the backend server awake
 * (preventing Render 15-minute inactivity shutdown):
 * 1. Sends an initial ping on page mount.
 * 2. Runs a recurring 10-minute background keep-alive ping while the tab is open.
 * 3. Immediately triggers a ping when the user switches back to the tab (if >= 60s cooldown passed).
 * 4. Resets the 10-minute timer whenever a ping fires.
 */
export default function ServerWarmer() {
  const lastPingTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sendPing = () => {
      lastPingTimeRef.current = Date.now();

      fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
      }).catch(() => {
        // Silently ignore while spinning up or if network is offline
      });

      // Clear existing interval and start fresh 10-minute countdown from this ping
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(sendPing, KEEP_ALIVE_INTERVAL);
    };

    // 1. Initial wake-up ping on mount
    sendPing();

    // 2. Tab visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeSinceLastPing = Date.now() - lastPingTimeRef.current;
        if (timeSinceLastPing >= TAB_SWITCH_COOLDOWN) {
          sendPing();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

