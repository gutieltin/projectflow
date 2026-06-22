"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

type Task = {
  id: number;
  title: string;
  current_status: string;
  priority: string;
  assignee_id: number | null;
  assignee?: { id: number; name: string };
  due_date: string | null;
};

type Member = {
  id: number;
  name: string;
  email: string;
};

const COLUMNS = [
  { key: "todo",        label: "To Do",       color: "text-gray-600",   bg: "bg-gray-100"   },
  { key: "pending",     label: "Pending",     color: "text-orange-600", bg: "bg-orange-100" },
  { key: "in_progress", label: "In Progress", color: "text-blue-600",   bg: "bg-blue-100"   },
  { key: "review",      label: "In Review",   color: "text-yellow-600", bg: "bg-yellow-100" },
  { key: "done",        label: "Done",        color: "text-green-600",  bg: "bg-green-100"  },
];

const PRIORITY_STYLES: Record<string, string> = {
  low:    "bg-gray-100 text-gray-500",
  medium: "bg-yellow-100 text-yellow-700",
  high:   "bg-red-100 text-red-600",
};

export default function ProjectDetailPage() {
  const { id, projectId } = useParams();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projectName, setProjectName] = useState("");
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Create task modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", assignee_id: "", priority: "medium", due_date: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Reassign
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [reassignId, setReassignId] = useState("");
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState("");

  // Comments
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Delete task confirmation modal
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const projRes = await api.get(`/workspaces/${id}/projects?per_page=100`);
      const allProjects = projRes.data.data ?? projRes.data;
      const current = Array.isArray(allProjects)
        ? allProjects.find((p: any) => p.id === Number(projectId))
        : null;
      setProjectName(current?.name ?? current?.title ?? "Project");
      setProject(current ?? null);

      const taskRes = await api.get(`/projects/${projectId}/tasks?per_page=100`);
      const taskData = taskRes.data.data ?? taskRes.data;
      setTasks(Array.isArray(taskData) ? taskData : []);

      const memberRes = await api.get(`/workspaces/${id}/members`);
      const memberData = memberRes.data.data ?? memberRes.data;
      setMembers(Array.isArray(memberData) ? memberData : []);
    } catch (err: any) {
      console.error("Failed to fetch project data", err.response?.data ?? err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        title: form.title,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        priority: form.priority,
        due_date: form.due_date || null,
      });
      setShowModal(false);
      setForm({ title: "", assignee_id: "", priority: "medium", due_date: "" });
      fetchData();
      addNotification({
        type: "success",
        title: "Task Created",
        message: `"${form.title}" has been added to the project.`,
      });
  } catch (err: any) {
      // === ERROR SANITIZATION INTEGRATED HERE ===
      if (err.response?.status === 422) {
        // 1. Validation Errors (Missing fields)
        const errors = err.response?.data?.errors;
        setFormError(errors ? Object.values(errors).flat().join(", ") : "Validation failed.");
      } else if (err.response?.status >= 500) {
        // 2. Server Errors (Mailtrap limits, backend crashes)
        const serverErrorMsg = "An unexpected server error occurred. Please try again later.";
        setFormError(serverErrorMsg);
        addNotification({
          type: "error",
          title: "Server Error",
          message: serverErrorMsg,
          duration: null,
        });
      } else {
        // 3. Generic Fallback
        const genericMsg = err.response?.data?.message || "Failed to create task.";
        setFormError(genericMsg);
        addNotification({
          type: "error",
          title: "Task Creation Failed",
          message: genericMsg,
          duration: null,
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      await api.patch(`/tasks/${taskId}`, { current_status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, current_status: newStatus } : t))
      );
      const statusLabel = COLUMNS.find(c => c.key === newStatus)?.label || newStatus;
      addNotification({
        type: "info",
        title: "Task Updated",
        message: `"${task?.title}" moved to ${statusLabel}.`,
      });
 } catch (err: any) {
      // === ERROR SANITIZATION INTEGRATED HERE ===
      if (err.response?.status >= 500) {
        const serverErrorMsg = "An unexpected server error occurred. Please try again later.";
        setError(serverErrorMsg);
        addNotification({
          type: "error",
          title: "Server Error",
          message: serverErrorMsg,
          duration: null,
        });
      } else {
        const msg = err.response?.data?.message || "Failed to update task status";
        setError(msg);
        addNotification({
          type: "error",
          title: "Update Failed",
          message: msg,
          duration: null,
        });
      }
    }
  };

  const confirmDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteTaskModal(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeletingTask(true);
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      setShowDeleteTaskModal(false);
      setTaskToDelete(null);
      fetchData();
      addNotification({
        type: "success",
        title: "Task Archived",
        message: `"${taskToDelete?.title}" has been archived.`,
      });
    } catch (err) {
      console.error("Failed to delete task", err);
      addNotification({
        type: "error",
        title: "Archive Failed",
        message: "Failed to archive task.",
        duration: null,
      });
    } finally {
      setDeletingTask(false);
    }
  };

  const handleProjectStatusChange = async (newStatus: "active" | "archived" | "completed") => {
    try {
      await api.patch(`/workspaces/${id}/projects/${projectId}`, { status: newStatus });
      setProject((prev: any) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update project status");
    }
  };

  const openReassign = (task: Task) => {
    if (user?.role !== "admin") return;
    setReassignTask(task);
    setReassignId(task.assignee_id ? String(task.assignee_id) : "");
    setReassignError("");
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTask || user?.role !== "admin") return;
    setReassignLoading(true);
    setReassignError("");
    try {
      await api.patch(`/tasks/${reassignTask.id}`, {
        assignee_id: reassignId ? Number(reassignId) : null,
      });
      // Update locally so UI refreshes instantly
      const newAssignee = members.find((m) => m.id === Number(reassignId)) ?? null;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === reassignTask.id
            ? {
                ...t,
                assignee_id: newAssignee?.id ?? null,
                assignee: newAssignee ? { id: newAssignee.id, name: newAssignee.name } : undefined,
              }
            : t
        )
      );
      setReassignTask(null);
      addNotification({
        type: "success",
        title: "Task Reassigned",
        message: `"${reassignTask?.title}" assigned to ${newAssignee?.name || "Unassigned"}.`,
      });
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      setReassignError(
        errors
          ? Object.values(errors).flat().join(", ")
          : err.response?.data?.message || "Failed to reassign task."
      );
      addNotification({
        type: "error",
        title: "Reassign Failed",
        message: err.response?.data?.message || "Failed to reassign task.",
        duration: null,
      });
    } finally {
      setReassignLoading(false);
    }
  };

  const openComments = async (task: Task) => {
    setSelectedTask(task);
    setComments([]);
    try {
      const res = await api.get(`/tasks/${task.id}/comments`);
      const data = res.data.data ?? res.data;
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    setCommentLoading(true);
    try {
      await api.post(`/tasks/${selectedTask.id}/comments`, { content: newComment });
      setNewComment("");
      const res = await api.get(`/tasks/${selectedTask.id}/comments`);
      const data = res.data.data ?? res.data;
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setCommentLoading(false);
    }
  };

  const getTasksByStatus = (status: string) =>
    tasks.filter((t) => t?.current_status === status);

  return (
    <div className="max-w-7xl mx-auto">

      {/* ERROR BANNER */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/workspaces" className="hover:text-orange-500 transition">Workspaces</Link>
        <span>/</span>
        <Link href={`/workspaces/${id}`} className="hover:text-orange-500 transition">Workspace</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{projectName}</span>
      </div>

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{projectName}</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} total
          </p>
          {project && (user?.role === "manager" || user?.role === "admin") && (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs text-gray-500">Status</label>
              <select
                value={project.status}
                onChange={(e) =>
                  handleProjectStatusChange(e.target.value as "active" | "archived" | "completed")
                }
                className="text-sm rounded-lg border border-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
        </div>

        {(user?.role === "manager" || user?.role === "admin") && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#F97316] hover:bg-[#EA6A0A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-orange-100 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* KANBAN BOARD */}
      {!loading && (
        <div className="grid grid-cols-5 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="bg-gray-50 rounded-2xl p-4 min-h-96">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${col.bg} ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {getTasksByStatus(col.key).length}
                </span>
              </div>

              <div className="space-y-3">
                {getTasksByStatus(col.key).map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                  >
                    <p className="text-sm font-semibold text-gray-800 mb-2 leading-snug">
                      {task.title ?? "Untitled Task"}
                    </p>

                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      PRIORITY_STYLES[task.priority?.toLowerCase()] ?? "bg-gray-100 text-gray-500"
                    }`}>
                      {task.priority}
                    </span>

                    {task.due_date && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        📅 {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}

                    {/* ASSIGNEE ROW */}
                    <div className="flex items-center justify-between mt-2">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                            {task.assignee.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <span className="text-xs text-gray-400">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Unassigned</span>
                      )}

                      {/* Reassign button — admin-only */}
                      {user?.role === "admin" && (
                        <button
                          onClick={() => openReassign(task)}
                          title="Reassign task"
                          className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-orange-400 p-0.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* HOVER ACTIONS */}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => openComments(task)}
                        className="text-xs text-gray-400 hover:text-orange-500 flex items-center gap-1 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Comments
                      </button>

                      <div className="flex items-center gap-1">
                        <select
                          value={task.current_status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className="text-xs text-gray-400 bg-transparent border-none outline-none cursor-pointer"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>

                        {(user?.role === "manager" || user?.role === "admin") && (
                          <button
                            onClick={() => confirmDeleteTask(task)}
                            className="text-gray-300 hover:text-red-400 transition p-0.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {getTasksByStatus(col.key).length === 0 && (
                  <div className="text-center py-8 text-gray-300 text-sm">No tasks here</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DELETE TASK CONFIRMATION MODAL */}
      {showDeleteTaskModal && taskToDelete && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteTaskModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Archive task</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will move <span className="font-semibold text-gray-900">"{taskToDelete?.title}"</span> to Trash.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteTaskModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-3xl p-4 mb-6">
              <p className="text-sm text-red-700">
                You can restore this task later from Trash.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteTaskModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={deletingTask}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition shadow-md shadow-red-100 disabled:opacity-50"
              >
                {deletingTask ? "Archiving..." : "Archive Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">New Task</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Design the homepage"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign To</label>
                <select
                  value={form.assignee_id}
                  onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                >
                  <option value="">-- Select a member --</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {["low", "medium", "high"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                        form.priority === p
                          ? p === "high"
                            ? "bg-red-100 border-red-300 text-red-600"
                            : p === "medium"
                            ? "bg-yellow-100 border-yellow-300 text-yellow-700"
                            : "bg-gray-100 border-gray-300 text-gray-600"
                          : "border-gray-200 text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition shadow-md shadow-orange-100 disabled:opacity-50"
                >
                  {formLoading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN TASK MODAL */}
      {reassignTask && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setReassignTask(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-800">Reassign Task</h2>
              <button onClick={() => setReassignTask(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-6 bg-gray-50 rounded-xl px-3 py-2 font-medium">
              {reassignTask.title}
            </p>

            {reassignError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                ⚠️ {reassignError}
              </div>
            )}

            <form onSubmit={handleReassign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assign To
                </label>
                <select
                  value={reassignId}
                  onChange={(e) => setReassignId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                >
                  <option value="">-- Unassigned --</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                      {member.id === reassignTask.assignee_id ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Member avatars for quick pick */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Or pick quickly:</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setReassignId(String(member.id))}
                      title={member.name}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                        reassignId === String(member.id)
                          ? "bg-orange-100 border-orange-300 text-orange-700"
                          : "bg-gray-50 border-gray-200 text-gray-500 hover:border-orange-200 hover:text-orange-500"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        reassignId === String(member.id)
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}>
                        {member.name?.charAt(0)?.toUpperCase()}
                      </div>
                      {member.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignTask(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignLoading}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition shadow-md shadow-orange-100 disabled:opacity-50"
                >
                  {reassignLoading ? "Saving..." : "Reassign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMENTS SIDE PANEL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          />
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Comments</p>
                <h3 className="font-bold text-gray-800 text-sm leading-snug">
                  {selectedTask.title ?? "Untitled Task"}
                </h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {comments.length === 0 && (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2">💬</div>
                  <p className="text-gray-400 text-sm">No comments yet. Be the first!</p>
                </div>
              )}
              {comments.map((comment, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold shrink-0">
                    {comment.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {comment.user?.name ?? "Unknown"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-sm text-gray-800"
                />
                <button
                  onClick={handleAddComment}
                  disabled={commentLoading || !newComment.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Press Enter to send</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}