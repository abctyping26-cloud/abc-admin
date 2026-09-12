"use client";

import { useEffect, useRef, useCallback } from "react";

interface InactivityOptions {
  enabled: boolean;
  timeoutMs?: number; // default 15 minutes (900,000 ms)
  onTimeout: () => void;
}

const DEFAULT_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_STORAGE_KEY = "abc_worker_last_activity";
const THROTTLE_INTERVAL = 5000; // Only update storage at most once every 5 seconds

export function useInactivityTimeout({
  enabled,
  timeoutMs = DEFAULT_TIMEOUT,
  onTimeout,
}: InactivityOptions) {
  const onTimeoutRef = useRef(onTimeout);
  const lastRecordedRef = useRef<number>(0);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const recordActivity = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    // Throttle writing to localStorage
    if (now - lastRecordedRef.current > THROTTLE_INTERVAL) {
      lastRecordedRef.current = now;
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
      } catch {
        // Ignore storage access restrictions
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      try {
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      } catch {
        // Ignore
      }
      return;
    }

    // Set initial activity timestamp if not present
    try {
      const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));
      }
    } catch {
      // Ignore
    }

    const checkInactivity = () => {
      try {
        const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
        const lastActivity = stored ? parseInt(stored, 10) : Date.now();
        const elapsed = Date.now() - lastActivity;

        if (elapsed >= timeoutMs) {
          onTimeoutRef.current();
        }
      } catch {
        // Ignore
      }
    };

    // Immediate check on mount
    checkInactivity();

    // User interaction events
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ];

    const handleUserActivity = () => {
      recordActivity();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Periodically verify inactivity (every 10 seconds)
    const interval = setInterval(checkInactivity, 10000);

    // Verify immediately when window gains focus or tab becomes visible again
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
        recordActivity();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // Cross-tab synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "abc_admin_token" && !e.newValue) {
        onTimeoutRef.current();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [enabled, timeoutMs, recordActivity]);
}
