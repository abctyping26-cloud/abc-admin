"use client";

import React, { useState } from "react";
import ServicesManager from "./ServicesManager";
import TopMarqueeManager from "./TopMarqueeManager";

interface WebsiteEditManagerProps {
  user: {
    id?: string;
    identifier?: string;
    role?: string;
    name?: string;
  } | null;
  isMaster: boolean;
}

export type WebsiteEditSubTab = "top_marquee" | "services";

export default function WebsiteEditManager({
  user,
  isMaster,
}: WebsiteEditManagerProps) {
  const [activeSubTab, setActiveSubTab] =
    useState<WebsiteEditSubTab>("top_marquee");

  return (
    <div className="website-edit-wrapper">
      {/* Top Sub-Navigation Tabs */}
      <div className="website-edit-subtabs">
        <button
          type="button"
          className={`website-edit-subtab-btn ${
            activeSubTab === "top_marquee" ? "active" : ""
          }`}
          onClick={() => setActiveSubTab("top_marquee")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          <span>Top Marquee Announcement</span>
        </button>

        <button
          type="button"
          className={`website-edit-subtab-btn ${
            activeSubTab === "services" ? "active" : ""
          }`}
          onClick={() => setActiveSubTab("services")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>Services &amp; Documentation</span>
        </button>
      </div>

      {/* Main Tab Views */}
      <div className="website-edit-content-pane">
        {activeSubTab === "top_marquee" && (
          <TopMarqueeManager user={user} isMaster={isMaster} />
        )}

        {activeSubTab === "services" && (
          <ServicesManager user={user} isMaster={isMaster} />
        )}
      </div>
    </div>
  );
}
