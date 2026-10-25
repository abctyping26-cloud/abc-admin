"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { AdminProject, SidebarTab } from "./DashboardSidebar";
import { API_BASE_URL } from "../config/api";

export interface WorkSubTask {
  _id?: string;
  projectName: string;
  workDone: string;
  completedAt?: string;
}

export interface WorkDayLog {
  _id: string;
  adminId: string;
  adminIdentifier: string;
  adminName: string;
  adminRole: string;
  date: string; // YYYY-MM-DD
  tasks: WorkSubTask[];
  createdAt: string;
  updatedAt: string;
}

export interface AssignedWorkItem {
  _id: string;
  workerId: string;
  workerIdentifier: string;
  workerName: string;
  masterId: string;
  masterName: string;
  projectName: string;
  taskDescription: string;
  status: "pending" | "completed";
  assignedAt: string;
  completedAt?: string;
}

export interface WorkerOption {
  id: string;
  identifier: string;
  name?: string;
  role?: string;
}

interface WorkDoneManagerProps {
  user?: any;
  selectedProject?: AdminProject;
  getAuthHeaders?: () => Record<string, string>;
  onNavigateTab?: (tab: SidebarTab) => void;
  onRefreshPendingCount?: () => void;
}

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateStr: string): string => {
  if (!dateStr) return "";
  const todayStr = getTodayString();

  const d = new Date(dateStr + "T00:00:00");
  const isToday = dateStr === todayStr;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
    yesterday.getDate()
  ).padStart(2, "0")}`;
  const isYesterday = dateStr === yStr;

  const formatted = d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (isToday) return `Today • ${formatted}`;
  if (isYesterday) return `Yesterday • ${formatted}`;
  return formatted;
};

const getProjectColor = (projectName: string) => {
  const clean = (projectName || "").toLowerCase();
  if (clean.includes("neon")) {
    return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" };
  }
  if (clean.includes("typing")) {
    return { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" };
  }
  if (clean.includes("account") || clean.includes("tax")) {
    return { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" };
  }
  return { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" };
};

export default function WorkDoneManager({
  user,
  selectedProject = "abc_neon",
  getAuthHeaders,
  onRefreshPendingCount,
}: WorkDoneManagerProps) {
  const isMaster =
    user?.role === "master_admin" ||
    user?.role === "superadmin" ||
    user?.identifier === "masteradmin@abc.com";

  // Data state
  const [logs, setLogs] = useState<WorkDayLog[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedWorkItem[]>([]);
  const [workersList, setWorkersList] = useState<WorkerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Accordion state: map of log ID -> boolean
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterAdminId, setFilterAdminId] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  // Master Admin tab: "logs" or "assigned_pipeline"
  const [masterTab, setMasterTab] = useState<"logs" | "assigned_pipeline">("logs");

  // Master Admin "Assign Work" inline box state
  const [showAssignBox, setShowAssignBox] = useState(false);
  const [assignWorkerId, setAssignWorkerId] = useState("");
  const [assignProject, setAssignProject] = useState<string>(
    selectedProject === "abc_typing" ? "ABC Typing" : "ABC Neon"
  );
  const [assignCustomProject, setAssignCustomProject] = useState("");
  const [assignDescription, setAssignDescription] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // "+ New Day Work" Modal state
  const [isNewDayModalOpen, setIsNewDayModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(getTodayString());
  const [modalTasks, setModalTasks] = useState<
    Array<{ projectName: string; customProject?: string; workDone: string }>
  >([
    {
      projectName: selectedProject === "abc_typing" ? "ABC Typing" : "ABC Neon",
      workDone: "",
    },
  ]);
  const [isSavingDayLog, setIsSavingDayLog] = useState(false);

  // Inline Quick Add Task to an existing Day
  const [activeAddDayId, setActiveAddDayId] = useState<string | null>(null);
  const [quickProject, setQuickProject] = useState(
    selectedProject === "abc_typing" ? "ABC Typing" : "ABC Neon"
  );
  const [quickWorkDone, setQuickWorkDone] = useState("");
  const [isSavingQuickTask, setIsSavingQuickTask] = useState(false);

  // Edit Task modal/inline state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState("");
  const [editWorkDone, setEditWorkDone] = useState("");
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const getHeaders = useCallback((): Record<string, string> => {
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    if (getAuthHeaders) {
      headers = { ...headers, ...getAuthHeaders() };
    } else if (typeof window !== "undefined") {
      const token = localStorage.getItem("abc_admin_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (user?.id) headers["x-admin-id"] = user.id;
      if (user?.role) headers["x-admin-role"] = user.role;
      if (user?.identifier) headers["x-admin-identifier"] = user.identifier;
    }
    return headers;
  }, [getAuthHeaders, user]);

  // Fetch Work Logs from real MongoDB API
  const fetchWorkLogs = useCallback(async () => {
    try {
      let url = `${API_BASE_URL}/api/v1/admin/work-logs`;
      const params = new URLSearchParams();
      if (isMaster && filterAdminId !== "all") {
        params.append("adminId", filterAdminId);
      }
      if (filterDate !== "all") {
        params.append("date", filterDate);
      }
      if (filterProject !== "all") {
        params.append("project", filterProject);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        const loadedLogs: WorkDayLog[] = json.data?.logs || [];
        setLogs(loadedLogs);

        // Auto-expand the first 2 day logs by default if not set
        setExpandedDays((prev) => {
          if (Object.keys(prev).length === 0 && loadedLogs.length > 0) {
            const initial: Record<string, boolean> = {};
            loadedLogs.slice(0, 2).forEach((l) => {
              initial[l._id] = true;
            });
            return initial;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Failed to load work logs:", err);
    }
  }, [filterAdminId, filterDate, filterProject, searchQuery, isMaster, getHeaders]);

  // Fetch Assigned Work from real MongoDB API
  const fetchAssignedWork = useCallback(async () => {
    try {
      const url = `${API_BASE_URL}/api/v1/admin/work-logs/assigned`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        setAssignedTasks(json.data?.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load assigned work:", err);
    }
  }, [getHeaders]);

  // Fetch Workers list for Master Admin to assign work
  const fetchWorkers = useCallback(async () => {
    if (!isMaster) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/workers`, { headers: getHeaders() });
      if (res.ok) {
        const json = await res.json();
        const workers = json.data?.workers || [];
        setWorkersList(workers);
        if (workers.length > 0 && !assignWorkerId) {
          setAssignWorkerId(workers[0].id || workers[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load workers list:", err);
    }
  }, [isMaster, getHeaders, assignWorkerId]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchWorkLogs(), fetchAssignedWork(), fetchWorkers()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchWorkLogs, fetchAssignedWork, fetchWorkers]);

  // Listen for external refresh triggers
  useEffect(() => {
    const handleUpdate = () => {
      fetchWorkLogs();
      fetchAssignedWork();
      if (onRefreshPendingCount) onRefreshPendingCount();
    };
    window.addEventListener("abc_work_logs_updated", handleUpdate);
    return () => window.removeEventListener("abc_work_logs_updated", handleUpdate);
  }, [fetchWorkLogs, fetchAssignedWork, onRefreshPendingCount]);

  // Pending assigned tasks for the current worker
  const pendingAssignedToMe = useMemo(() => {
    if (isMaster) return [];
    return assignedTasks.filter((t) => t.status === "pending");
  }, [isMaster, assignedTasks]);

  // Toggle Day accordion
  const toggleDayExpanded = (dayId: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  // Master Admin: Assign Work submission
  const handleAssignWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignWorkerId) {
      showToast("Please select a worker admin.");
      return;
    }
    if (!assignDescription.trim()) {
      showToast("Please write the work to assign.");
      return;
    }

    const resolvedProject =
      assignProject === "Custom" ? assignCustomProject.trim() || "General" : assignProject;

    setIsAssigning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/work-logs/assign`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          workerId: assignWorkerId,
          projectName: resolvedProject,
          taskDescription: assignDescription.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to assign work");
      }

      showToast("Work successfully assigned to worker!");
      setAssignDescription("");
      setShowAssignBox(false);
      fetchAssignedWork();

      // Trigger cross-component badge update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("abc_work_logs_updated"));
      }
      if (onRefreshPendingCount) onRefreshPendingCount();
    } catch (err: any) {
      showToast(err.message || "Failed to assign work");
    } finally {
      setIsAssigning(false);
    }
  };

  // Worker Admin: Complete Assigned Work (converts into today's Work Done!)
  const handleCompleteAssignedTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/work-logs/assigned/${taskId}/complete`, {
        method: "PATCH",
        headers: getHeaders(),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to complete task");
      }

      showToast("Task completed and added to today's Work Done!");
      fetchAssignedWork();
      fetchWorkLogs();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("abc_work_logs_updated"));
      }
      if (onRefreshPendingCount) onRefreshPendingCount();
    } catch (err: any) {
      showToast(err.message || "Failed to complete task");
    }
  };

  // Master Admin: Delete an assigned task
  const handleDeleteAssignedTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this assigned task?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/work-logs/assigned/${taskId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete assigned task");
      }
      showToast("Assigned task removed.");
      fetchAssignedWork();
      if (onRefreshPendingCount) onRefreshPendingCount();
    } catch (err: any) {
      showToast(err.message || "Failed to delete task");
    }
  };

  // "+ New Day Work" Modal: Add another task row
  const handleAddModalTaskRow = () => {
    setModalTasks((prev) => [
      ...prev,
      {
        projectName: selectedProject === "abc_typing" ? "ABC Typing" : "ABC Neon",
        workDone: "",
      },
    ]);
  };

  // "+ New Day Work" Modal: Remove task row
  const handleRemoveModalTaskRow = (idx: number) => {
    setModalTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  // "+ New Day Work" Modal: Save day log
  const handleSaveDayLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validTasks = modalTasks
      .map((t) => ({
        projectName: t.projectName === "Custom" ? (t.customProject?.trim() || "General") : t.projectName,
        workDone: t.workDone.trim(),
      }))
      .filter((t) => t.workDone.length > 0);

    if (validTasks.length === 0) {
      showToast("Please enter at least one task description.");
      return;
    }

    setIsSavingDayLog(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/work-logs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          date: modalDate,
          tasks: validTasks,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to save work log");
      }

      showToast("Day work log saved successfully!");
      setIsNewDayModalOpen(false);
      setModalTasks([
        {
          projectName: selectedProject === "abc_typing" ? "ABC Typing" : "ABC Neon",
          workDone: "",
        },
      ]);
      fetchWorkLogs();
    } catch (err: any) {
      showToast(err.message || "Failed to save work log");
    } finally {
      setIsSavingDayLog(false);
    }
  };

  // Inline Quick Add Task to an existing Day
  const handleQuickAddSubmit = async (dayLogId: string, dayDate: string) => {
    if (!quickWorkDone.trim()) {
      showToast("Please write the work done.");
      return;
    }

    setIsSavingQuickTask(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/work-logs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          date: dayDate,
          tasks: [
            {
              projectName: quickProject,
              workDone: quickWorkDone.trim(),
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to add task");
      }

      showToast("Task added to day log!");
      setActiveAddDayId(null);
      setQuickWorkDone("");
      fetchWorkLogs();
    } catch (err: any) {
      showToast(err.message || "Failed to add task");
    } finally {
      setIsSavingQuickTask(false);
    }
  };

  // Edit Task
  const handleStartEditTask = (logId: string, task: WorkSubTask) => {
    setEditingLogId(logId);
    setEditingTaskId(task._id || null);
    setEditProject(task.projectName);
    setEditWorkDone(task.workDone);
  };

  const handleSaveEditTask = async () => {
    if (!editingLogId || !editingTaskId) return;
    if (!editWorkDone.trim()) {
      showToast("Work description cannot be empty.");
      return;
    }

    setIsUpdatingTask(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/work-logs/${editingLogId}/task/${editingTaskId}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            projectName: editProject,
            workDone: editWorkDone.trim(),
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update task");
      }

      showToast("Task updated successfully!");
      setEditingLogId(null);
      setEditingTaskId(null);
      fetchWorkLogs();
    } catch (err: any) {
      showToast(err.message || "Failed to update task");
    } finally {
      setIsUpdatingTask(false);
    }
  };

  // Delete Task (Worker only - Master Admin explicitly blocked)
  const handleDeleteTask = async (logId: string, taskId?: string) => {
    if (!taskId) return;
    if (!confirm("Are you sure you want to remove this task?")) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/work-logs/${logId}/task/${taskId}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete task");
      }

      showToast("Task removed from work log.");
      fetchWorkLogs();
    } catch (err: any) {
      showToast(err.message || "Failed to delete task");
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterAdminId !== "all" && log.adminId !== filterAdminId) return false;
      if (filterDate !== "all" && log.date !== filterDate) return false;
      if (filterProject !== "all") {
        const hasProject = log.tasks.some(
          (t) => t.projectName.toLowerCase() === filterProject.toLowerCase()
        );
        if (!hasProject) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAdmin =
          log.adminName.toLowerCase().includes(q) ||
          log.adminIdentifier.toLowerCase().includes(q);
        const matchesTasks = log.tasks.some(
          (t) =>
            t.workDone.toLowerCase().includes(q) ||
            t.projectName.toLowerCase().includes(q)
        );
        if (!matchesAdmin && !matchesTasks) return false;
      }
      return true;
    });
  }, [logs, filterAdminId, filterDate, filterProject, searchQuery]);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "16px 20px" }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "8px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            fontSize: "0.9rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid #334155",
          }}
        >
          <span>ℹ️</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1
              style={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Work Done
            </h1>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "20px",
                backgroundColor: isMaster ? "#ede9fe" : "#e0f2fe",
                color: isMaster ? "#6d28d9" : "#0369a1",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {isMaster ? "Master Admin View" : "Worker Portal"}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#64748b" }}>
            {isMaster
              ? "Review daily completed work logs across all admins and assign tasks to workers"
              : "Log your daily work accomplished per project and complete tasks assigned by Master Admin"}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Master Admin: Assign Work Button (Toggles Inline Box) */}
          {isMaster && (
            <button
              type="button"
              onClick={() => setShowAssignBox((prev) => !prev)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "8px",
                backgroundColor: showAssignBox ? "#f97316" : "#fff7ed",
                color: showAssignBox ? "#ffffff" : "#c2410c",
                border: "1px solid #fdba74",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: "1rem" }}>📌</span>
              <span>{showAssignBox ? "Close Assign Box" : "+ Assign Work"}</span>
            </button>
          )}

          {/* New Day Work Button (Available to all admins) */}
          <button
            type="button"
            onClick={() => {
              setModalDate(getTodayString());
              setIsNewDayModalOpen(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "8px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
            }}
          >
            <span>➕</span>
            <span>+ New Day Work</span>
          </button>
        </div>
      </div>

      {/* MASTER ADMIN: INLINE "ASSIGN WORK" BOX (NOT A POPUP) */}
      {isMaster && showAssignBox && (
        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            borderRadius: "12px",
            backgroundColor: "#fff7ed",
            border: "1.5px solid #fdba74",
            boxShadow: "0 4px 12px rgba(249, 115, 22, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#f97316",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              >
                📌
              </span>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#9a3412", margin: 0 }}>
                Assign Work to Worker Admin
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAssignBox(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                color: "#9a3412",
                fontWeight: "bold",
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleAssignWorkSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "14px",
                marginBottom: "14px",
              }}
            >
              {/* Connect Worker Selector */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#7c2d12",
                    marginBottom: "6px",
                  }}
                >
                  1. Connect Worker <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  value={assignWorkerId}
                  onChange={(e) => setAssignWorkerId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #f97316",
                    backgroundColor: "#ffffff",
                    fontSize: "0.88rem",
                    color: "#0f172a",
                    fontWeight: 600,
                  }}
                >
                  <option value="" disabled>
                    -- Select Worker Admin --
                  </option>
                  {workersList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name ? `${w.name} (${w.identifier})` : w.identifier}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Selector */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#7c2d12",
                    marginBottom: "6px",
                  }}
                >
                  2. Project <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["ABC Neon", "ABC Typing", "General", "Custom"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAssignProject(p)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        border: "1px solid",
                        borderColor: assignProject === p ? "#ea580c" : "#fed7aa",
                        backgroundColor: assignProject === p ? "#ea580c" : "#ffffff",
                        color: assignProject === p ? "#ffffff" : "#9a3412",
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {assignProject === "Custom" && (
                  <input
                    type="text"
                    placeholder="Enter project name..."
                    value={assignCustomProject}
                    onChange={(e) => setAssignCustomProject(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fdba74",
                      fontSize: "0.85rem",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Work to Assign Textarea */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#7c2d12",
                  marginBottom: "6px",
                }}
              >
                3. Work to Assign <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe specifically what task or work this worker needs to do (e.g. Call Client XYZ for sign board approval, submit Amer typing files...)"
                value={assignDescription}
                onChange={(e) => setAssignDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #f97316",
                  fontSize: "0.88rem",
                  color: "#0f172a",
                  fontFamily: "inherit",
                  resize: "vertical",
                  backgroundColor: "#ffffff",
                }}
              />
            </div>

            {/* Submit & Cancel */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="submit"
                disabled={isAssigning}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{isAssigning ? "Assigning..." : "Assign Work"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAssignBox(false)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  color: "#7c2d12",
                  border: "1px solid #fdba74",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WORKER ADMIN: "WORK TO DO" BOX (SHOWN WHEN ASSIGNED TASKS EXIST) */}
      {!isMaster && pendingAssignedToMe.length > 0 && (
        <div
          style={{
            marginBottom: "24px",
            padding: "18px 20px",
            borderRadius: "12px",
            backgroundColor: "#fff7ed",
            border: "2px solid #f97316",
            boxShadow: "0 6px 16px rgba(249, 115, 22, 0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#f97316",
                  boxShadow: "0 0 0 3px rgba(249, 115, 22, 0.3)",
                }}
              />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#9a3412", margin: 0 }}>
                Work To Do ({pendingAssignedToMe.length} Pending Assigned Task
                {pendingAssignedToMe.length > 1 ? "s" : ""})
              </h2>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#c2410c", fontWeight: 600 }}>
              Assigned by Master Admin
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pendingAssignedToMe.map((task) => {
              const pColor = getProjectColor(task.projectName);
              return (
                <div
                  key={task._id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #fed7aa",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span
                        style={{
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: pColor.bg,
                          color: pColor.text,
                          border: `1px solid ${pColor.border}`,
                        }}
                      >
                        {task.projectName}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                        Assigned on {new Date(task.assignedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.92rem",
                        color: "#1e293b",
                        lineHeight: 1.45,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {task.taskDescription}
                    </p>
                  </div>

                  {/* One-Click Action to Complete & Add to Today's Work */}
                  <button
                    type="button"
                    onClick={() => handleCompleteAssignedTask(task._id)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      flexShrink: 0,
                      boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
                    }}
                  >
                    <span>✅</span>
                    <span>Done & Add to Today's Work</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MASTER ADMIN TAB SWITCHER: [Completed Work Logs] / [Assigned Tasks Pipeline] */}
      {isMaster && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => setMasterTab("logs")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid",
              borderColor: masterTab === "logs" ? "#2563eb" : "#cbd5e1",
              backgroundColor: masterTab === "logs" ? "#2563eb" : "#ffffff",
              color: masterTab === "logs" ? "#ffffff" : "#475569",
            }}
          >
            📋 Daily Work Done ({filteredLogs.length} Days)
          </button>
          <button
            type="button"
            onClick={() => setMasterTab("assigned_pipeline")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "1px solid",
              borderColor: masterTab === "assigned_pipeline" ? "#f97316" : "#cbd5e1",
              backgroundColor: masterTab === "assigned_pipeline" ? "#f97316" : "#ffffff",
              color: masterTab === "assigned_pipeline" ? "#ffffff" : "#475569",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📌 Assigned Tasks Tracking</span>
            {assignedTasks.filter((t) => t.status === "pending").length > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                  color: "#c2410c",
                  fontWeight: 800,
                }}
              >
                {assignedTasks.filter((t) => t.status === "pending").length} pending
              </span>
            )}
          </button>
        </div>
      )}

      {/* FILTER & SEARCH BAR (Available in Logs view) */}
      {(masterTab === "logs" || !isMaster) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "20px",
            backgroundColor: "#f8fafc",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
            <input
              type="text"
              placeholder="Search work tasks, projects, or admins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                backgroundColor: "#ffffff",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.85rem",
                color: "#94a3b8",
              }}
            >
              🔍
            </span>
          </div>

          {/* Project Filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontWeight: 600,
            }}
          >
            <option value="all">All Projects</option>
            <option value="ABC Neon">ABC Neon</option>
            <option value="ABC Typing">ABC Typing</option>
            <option value="General">General</option>
          </select>

          {/* Master Admin: Admin Filter Dropdown */}
          {isMaster && (
            <select
              value={filterAdminId}
              onChange={(e) => setFilterAdminId(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              <option value="all">All Worker Admins</option>
              {workersList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.identifier}
                </option>
              ))}
            </select>
          )}

          {/* Date Quick Filter */}
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontWeight: 600,
            }}
          >
            <option value="all">All Dates</option>
            <option value={getTodayString()}>Today</option>
          </select>

          {/* Reset Filters button */}
          {(searchQuery || filterProject !== "all" || filterAdminId !== "all" || filterDate !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterProject("all");
                setFilterAdminId("all");
                setFilterDate("all");
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: "0.82rem",
                color: "#2563eb",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* VIEW A: MASTER ADMIN ASSIGNED TASKS TRACKING PIPELINE */}
      {isMaster && masterTab === "assigned_pipeline" && (
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Assigned Tasks Pipeline ({assignedTasks.length} Total)
            </h2>
            <button
              type="button"
              onClick={() => setShowAssignBox(true)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: "#ea580c",
                color: "#ffffff",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Assign New Task
            </button>
          </div>

          {assignedTasks.length === 0 ? (
            <div
              style={{
                padding: "36px",
                textAlign: "center",
                borderRadius: "12px",
                border: "1.5px dashed #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#64748b",
              }}
            >
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>📌</span>
              <p style={{ margin: "0 0 12px", fontWeight: 600 }}>No tasks assigned yet.</p>
              <button
                type="button"
                onClick={() => setShowAssignBox(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Assign Work Now
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {assignedTasks.map((t) => {
                const isDone = t.status === "completed";
                const pColor = getProjectColor(t.projectName);
                return (
                  <div
                    key={t._id}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "10px",
                      backgroundColor: isDone ? "#f8fafc" : "#ffffff",
                      border: isDone ? "1px solid #e2e8f0" : "1.5px solid #fed7aa",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "260px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            backgroundColor: isDone ? "#dcfce7" : "#ffedd5",
                            color: isDone ? "#15803d" : "#c2410c",
                          }}
                        >
                          {isDone ? "✓ COMPLETED" : "⏳ PENDING"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            backgroundColor: pColor.bg,
                            color: pColor.text,
                            border: `1px solid ${pColor.border}`,
                          }}
                        >
                          {t.projectName}
                        </span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                          Assigned to: {t.workerName}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: "0.9rem",
                          color: "#1e293b",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {t.taskDescription}
                      </p>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                        Assigned on {new Date(t.assignedAt).toLocaleString()}
                        {t.completedAt && ` • Completed on ${new Date(t.completedAt).toLocaleString()}`}
                      </span>
                    </div>

                    {/* Master Actions */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignedTask(t._id)}
                        title="Delete Assignment"
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          border: "none",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW B: MAIN DAY-BY-DAY LIST (ACCORDION WITH SUB-LISTS) */}
      {(masterTab === "logs" || !isMaster) && (
        <div>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
              <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "8px" }}>⏳</span>
              <p style={{ fontWeight: 600 }}>Loading work logs from database...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                borderRadius: "14px",
                border: "2px dashed #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#64748b",
              }}
            >
              <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "10px" }}>📝</span>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
                No work logs found
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: "0.9rem" }}>
                {isMaster
                  ? "None of the worker admins have logged work matching these filters yet."
                  : "You haven't logged any work yet for the selected date. Click '+ New Day Work' to start logging!"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setModalDate(getTodayString());
                  setIsNewDayModalOpen(true);
                }}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                + New Day Work
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredLogs.map((log) => {
                const isExpanded = expandedDays[log._id] ?? false;
                const isOwner = user?.id && log.adminId === user.id;

                // Unique project list for chips preview
                const distinctProjects = Array.from(new Set(log.tasks.map((t) => t.projectName)));

                return (
                  <div
                    key={log._id}
                    style={{
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                      overflow: "hidden",
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    {/* DAY HEADER CARD (CLICKABLE ACCORDION HEADER) */}
                    <div
                      onClick={() => toggleDayExpanded(log._id)}
                      style={{
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        backgroundColor: isExpanded ? "#f8fafc" : "#ffffff",
                        borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                        userSelect: "none",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Left: Date + Admin Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "1.1rem",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "#eff6ff",
                            color: "#2563eb",
                          }}
                        >
                          📅
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                              {formatDateLabel(log.date)}
                            </span>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: "10px",
                                backgroundColor: "#e2e8f0",
                                color: "#334155",
                              }}
                            >
                              {log.tasks.length} task{log.tasks.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Admin Details */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                              👤 {log.adminName}
                              {log.adminRole === "master_admin" ? " (Master Admin)" : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Project Chips + Chevron */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {/* Project Badges */}
                        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                          {distinctProjects.map((p) => {
                            const pColor = getProjectColor(p);
                            return (
                              <span
                                key={p}
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: pColor.bg,
                                  color: pColor.text,
                                  border: `1px solid ${pColor.border}`,
                                }}
                              >
                                {p}
                              </span>
                            );
                          })}
                        </div>

                        {/* Chevron Indicator */}
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "#64748b",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "24px",
                            height: "24px",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.15s ease",
                          }}
                        >
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED SUB-LIST OF TASKS FOR THIS DAY */}
                    {isExpanded && (
                      <div style={{ padding: "16px 18px", backgroundColor: "#ffffff" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {log.tasks.map((task, idx) => {
                            const pColor = getProjectColor(task.projectName);
                            const isEditingThis =
                              editingLogId === log._id && editingTaskId === task._id;

                            return (
                              <div
                                key={task._id || idx}
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: "8px",
                                  backgroundColor: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {isEditingThis ? (
                                  /* EDIT TASK INLINE */
                                  <div>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "center",
                                        marginBottom: "8px",
                                      }}
                                    >
                                      <select
                                        value={editProject}
                                        onChange={(e) => setEditProject(e.target.value)}
                                        style={{
                                          padding: "5px 8px",
                                          borderRadius: "6px",
                                          fontSize: "0.82rem",
                                          border: "1px solid #cbd5e1",
                                          fontWeight: 600,
                                        }}
                                      >
                                        <option value="ABC Neon">ABC Neon</option>
                                        <option value="ABC Typing">ABC Typing</option>
                                        <option value="General">General</option>
                                      </select>
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={editWorkDone}
                                      onChange={(e) => setEditWorkDone(e.target.value)}
                                      style={{
                                        width: "100%",
                                        padding: "8px",
                                        borderRadius: "6px",
                                        border: "1px solid #2563eb",
                                        fontSize: "0.88rem",
                                        fontFamily: "inherit",
                                        marginBottom: "8px",
                                      }}
                                    />
                                    <div style={{ display: "flex", gap: "8px" }}>
                                      <button
                                        type="button"
                                        onClick={handleSaveEditTask}
                                        disabled={isUpdatingTask}
                                        style={{
                                          padding: "5px 12px",
                                          borderRadius: "6px",
                                          backgroundColor: "#2563eb",
                                          color: "#ffffff",
                                          border: "none",
                                          fontSize: "0.8rem",
                                          fontWeight: 700,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {isUpdatingTask ? "Saving..." : "Save"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingLogId(null);
                                          setEditingTaskId(null);
                                        }}
                                        style={{
                                          padding: "5px 10px",
                                          borderRadius: "6px",
                                          backgroundColor: "transparent",
                                          border: "1px solid #cbd5e1",
                                          fontSize: "0.8rem",
                                          cursor: "pointer",
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* REGULAR DISPLAY ROW */
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "flex-start",
                                      gap: "12px",
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      {/* Project Pill */}
                                      <div style={{ marginBottom: "5px" }}>
                                        <span
                                          style={{
                                            fontSize: "0.75rem",
                                            fontWeight: 800,
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            backgroundColor: pColor.bg,
                                            color: pColor.text,
                                            border: `1px solid ${pColor.border}`,
                                          }}
                                        >
                                          🏷️ {task.projectName}
                                        </span>
                                      </div>
                                      {/* Work Description */}
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: "0.92rem",
                                          color: "#1e293b",
                                          lineHeight: 1.5,
                                          whiteSpace: "pre-wrap",
                                        }}
                                      >
                                        {task.workDone}
                                      </p>
                                    </div>

                                    {/* Action buttons (ONLY for the author worker - Master Admin CANNOT delete/edit worker logs) */}
                                    {isOwner && (
                                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditTask(log._id, task)}
                                          title="Edit Task"
                                          style={{
                                            background: "none",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            padding: "4px 8px",
                                            cursor: "pointer",
                                            fontSize: "0.78rem",
                                            color: "#475569",
                                          }}
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTask(log._id, task._id)}
                                          title="Delete Task"
                                          style={{
                                            background: "none",
                                            border: "1px solid #fecaca",
                                            borderRadius: "6px",
                                            padding: "4px 8px",
                                            cursor: "pointer",
                                            fontSize: "0.78rem",
                                            color: "#dc2626",
                                            backgroundColor: "#fef2f2",
                                          }}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* QUICK ADD TASK TO THIS DAY (For the day's owner) */}
                        {isOwner && (
                          <div style={{ marginTop: "14px", borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
                            {activeAddDayId === log._id ? (
                              <div
                                style={{
                                  padding: "12px",
                                  borderRadius: "8px",
                                  backgroundColor: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "center",
                                    marginBottom: "8px",
                                  }}
                                >
                                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#166534" }}>
                                    Project:
                                  </label>
                                  <select
                                    value={quickProject}
                                    onChange={(e) => setQuickProject(e.target.value)}
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      border: "1px solid #86efac",
                                      fontSize: "0.82rem",
                                      fontWeight: 600,
                                      backgroundColor: "#ffffff",
                                    }}
                                  >
                                    <option value="ABC Neon">ABC Neon</option>
                                    <option value="ABC Typing">ABC Typing</option>
                                    <option value="General">General</option>
                                  </select>
                                </div>
                                <textarea
                                  rows={2}
                                  placeholder="Describe the additional work completed on this day..."
                                  value={quickWorkDone}
                                  onChange={(e) => setQuickWorkDone(e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #86efac",
                                    fontSize: "0.86rem",
                                    fontFamily: "inherit",
                                    marginBottom: "8px",
                                    backgroundColor: "#ffffff",
                                  }}
                                />
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddSubmit(log._id, log.date)}
                                    disabled={isSavingQuickTask}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "6px",
                                      backgroundColor: "#16a34a",
                                      color: "#ffffff",
                                      border: "none",
                                      fontSize: "0.82rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {isSavingQuickTask ? "Adding..." : "+ Add to this Day"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveAddDayId(null);
                                      setQuickWorkDone("");
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      backgroundColor: "transparent",
                                      border: "1px solid #cbd5e1",
                                      fontSize: "0.82rem",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAddDayId(log._id);
                                  setQuickWorkDone("");
                                }}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  backgroundColor: "#f1f5f9",
                                  color: "#334155",
                                  border: "1px dashed #cbd5e1",
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <span>➕</span>
                                <span>Add Task to this Day</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* "+ NEW DAY WORK" MODAL DIALOG */}
      {isNewDayModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "12px",
              }}
            >
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                ➕ Log New Day's Work
              </h2>
              <button
                type="button"
                onClick={() => setIsNewDayModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDayLogSubmit}>
              {/* Date Selector */}
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  📅 Work Day Date <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Tasks Sub-List Builder */}
              <div style={{ marginBottom: "18px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", margin: 0 }}>
                    Project Tasks Completed
                  </label>
                  <button
                    type="button"
                    onClick={handleAddModalTaskRow}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Add Another Project / Task
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {modalTasks.map((taskRow, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569" }}>
                          TASK #{idx + 1}
                        </span>
                        {modalTasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveModalTaskRow(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Project Dropdown / Custom */}
                      <div style={{ marginBottom: "8px" }}>
                        <select
                          value={taskRow.projectName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setModalTasks((prev) =>
                              prev.map((t, i) => (i === idx ? { ...t, projectName: val } : t))
                            );
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            backgroundColor: "#ffffff",
                            marginRight: "8px",
                          }}
                        >
                          <option value="ABC Neon">ABC Neon</option>
                          <option value="ABC Typing">ABC Typing</option>
                          <option value="General">General</option>
                          <option value="Custom">Custom Project...</option>
                        </select>

                        {taskRow.projectName === "Custom" && (
                          <input
                            type="text"
                            placeholder="Enter project name..."
                            value={taskRow.customProject || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setModalTasks((prev) =>
                                prev.map((t, i) => (i === idx ? { ...t, customProject: val } : t))
                              );
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.84rem",
                              marginTop: "6px",
                              width: "100%",
                            }}
                          />
                        )}
                      </div>

                      {/* Work Done Textarea */}
                      <textarea
                        rows={2}
                        required
                        placeholder="What specific work was completed for this project? (e.g. Assembled 10 LED signs, verified 3 visa applications...)"
                        value={taskRow.workDone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setModalTasks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, workDone: val } : t))
                          );
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.86rem",
                          fontFamily: "inherit",
                          backgroundColor: "#ffffff",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsNewDayModalOpen(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "transparent",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDayLog}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  {isSavingDayLog ? "Saving..." : "Save Day's Work"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
