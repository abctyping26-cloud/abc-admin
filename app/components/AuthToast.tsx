"use client";

import React, { useEffect, useState } from "react";

interface ToastData {
  title: string;
  message: string;
  role?: string;
}

export default function AuthToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const show = React.useCallback((data: ToastData) => {
    setToast(data);
    setTimeout(() => setIsVisible(true), 40);

    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setToast(null), 300);
    }, 3500);
  }, []);

  useEffect(() => {
    const checkStoredToast = () => {
      try {
        const stored = sessionStorage.getItem("abc_admin_auth_toast");
        if (stored) {
          const parsed = JSON.parse(stored) as ToastData;
          sessionStorage.removeItem("abc_admin_auth_toast");
          show(parsed);
        }
      } catch {
        // Ignore storage errors
      }
    };

    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastData>;
      if (customEvent.detail) {
        show(customEvent.detail);
      }
    };

    checkStoredToast();
    window.addEventListener("abc:admin_toast", handleToastEvent);

    return () => {
      window.removeEventListener("abc:admin_toast", handleToastEvent);
    };
  }, [show]);

  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 99999,
        display: "inline-flex",
        alignItems: "center",
        padding: "9px 18px",
        backgroundColor: "#ffffff",
        color: "#000000",
        border: "1px solid #18181b",
        borderRadius: "8px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "0.86rem",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
        transform: isVisible ? "translateY(0)" : "translateY(-10px)",
        opacity: isVisible ? 1 : 0,
        transition: "transform 0.25s ease, opacity 0.25s ease",
        pointerEvents: "none",
      }}
    >
      <span>{toast.message}</span>
    </div>
  );
}
