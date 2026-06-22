"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useNotification } from "@/context/NotificationContext";

type TrashedWorkspace = {
  id: number;
  name: string;
  deleted_at: string;
};

type TrashedProject = {
  id: number;
  name: string | null;
  title: string | null;
  deleted_at: string;
  workspace_id: number;
};

type TrashedTask = {
  id: number;
  title: string | null;
  deleted_at: string;
};

export default function TrashPage() {
  const { addNotification } = useNotification();
  const [workspaces, setWorkspaces] = useState<TrashedWorkspace[]>([]);
  const [projects, setProjects] = useState<TrashedProject[]>([]);
  const [tasks, setTasks] = useState<TrashedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"workspaces" | "projects" | "tasks">("workspaces");
  const [restoring, setRestoring] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Delete confirmation modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: "workspace" | "project" | "task"; id: number; workspaceId?: number; name: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  useEffect(() => {
    fetchTrashed();
  }, []);

  const fetchTrashed = async () => {
    setLoading(true);
    try {
      // Fetch trashed workspaces
      const wsRes = await api.get("/workspaces/trashed");
      const wsData = wsRes.data.data ?? wsRes.data;
      setWorkspaces(Array.isArray(wsData) ? wsData : []);

      // Fetch trashed tasks
      const taskRes = await api.get("/tasks/trashed");
      const taskData = taskRes.data.data ?? taskRes.data;
      setTasks(Array.isArray(taskData) ? taskData : []);

      // Fetch trashed projects for each workspace
      // We need workspace IDs to call /workspaces/{id}/projects/trashed
      const allWorkspacesRes = await api.get("/workspaces");
const allWorkspaces = allWorkspacesRes.data.data ?? allWorkspacesRes.data;
console.log("Workspaces to check:", allWorkspaces.map((w: any) => ({ id: w.id, name: w.name })));

const projectPromises = allWorkspaces.map((ws: any) =>
  api.get(`/workspaces/${ws.id}/projects/trashed`)
    .then((res) => {
      console.log(`Workspace ${ws.id} trashed projects:`, res.data);
      const data = res.data.data ?? res.data;
      return Array.isArray(data)
        ? data.map((p: any) => ({ ...p, workspace_id: ws.id }))
        : [];
    })
    .catch((err) => {
      console.log(`Workspace ${ws.id} error:`, err.response?.status, err.response?.data);
      return [];
    })
);
const projectArrays = await Promise.all(projectPromises);
console.log("All trashed projects:", projectArrays.flat());
setProjects(projectArrays.flat());
    } catch (err) {
      console.error("Failed to fetch trashed items", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreWorkspace = async (id: number) => {
    setRestoring(id);
    try {
      await api.post(`/workspaces/${id}/restore`);
      fetchTrashed();
    } catch (err) {
      console.error("Failed to restore workspace", err);
    } finally {
      setRestoring(null);
    }
  };

  const handleForceDeleteWorkspace = async (id: number, name: string) => {
    setDeleteItem({ type: "workspace", id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeletingItem(true);
    try {
      if (deleteItem.type === "workspace") {
        await api.delete(`/workspaces/${deleteItem.id}/force`);
        addNotification({
          type: "success",
          title: "Permanently Deleted",
          message: `Workspace "${deleteItem.name}" has been permanently deleted.`,
        });
      } else if (deleteItem.type === "project") {
        await api.delete(`/workspaces/${deleteItem.workspaceId}/projects/${deleteItem.id}/force`);
        addNotification({
          type: "success",
          title: "Permanently Deleted",
          message: `Project "${deleteItem.name}" has been permanently deleted.`,
        });
      } else if (deleteItem.type === "task") {
        await api.delete(`/tasks/${deleteItem.id}/force`);
        addNotification({
          type: "success",
          title: "Permanently Deleted",
          message: `Task "${deleteItem.name}" has been permanently deleted.`,
        });
      }
      setShowDeleteModal(false);
      setDeleteItem(null);
      fetchTrashed();
    } catch (err: any) {
      console.error("Failed to permanently delete item", err);
      addNotification({
        type: "error",
        title: "Delete Failed",
        message: err.response?.data?.message || "Failed to permanently delete item.",
        duration: null,
      });
    } finally {
      setDeletingItem(false);
    }
  };

  const handleRestoreProject = async (workspaceId: number, projectId: number) => {
    setRestoring(projectId);
    try {
      await api.post(`/workspaces/${workspaceId}/projects/${projectId}/restore`);
      fetchTrashed();
    } catch (err) {
      console.error("Failed to restore project", err);
    } finally {
      setRestoring(null);
    }
  };

  const handleForceDeleteProject = async (workspaceId: number, projectId: number, name: string) => {
    setDeleteItem({ type: "project", id: projectId, workspaceId, name });
    setShowDeleteModal(true);
  };

  const handleRestoreTask = async (id: number) => {
    setRestoring(id);
    try {
      await api.post(`/tasks/${id}/restore`);
      fetchTrashed();
    } catch (err) {
      console.error("Failed to restore task", err);
    } finally {
      setRestoring(null);
    }
  };

  const handleForceDeleteTask = async (id: number, title: string) => {
    setDeleteItem({ type: "task", id, name: title });
    setShowDeleteModal(true);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const tabs = [
    { key: "workspaces" as const, label: "Workspaces", count: workspaces.length },
    { key: "projects" as const, label: "Projects", count: projects.length },
    { key: "tasks" as const, label: "Tasks", count: tasks.length },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Trash</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Restore or permanently delete archived items.
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-orange-50 text-orange-600 border border-orange-200"
                : "text-gray-500 hover:bg-gray-50 border border-transparent"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === tab.key
                ? "bg-orange-100 text-orange-600"
                : "bg-gray-100 text-gray-400"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div>
                    <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-100 rounded-xl w-20" />
                  <div className="h-8 bg-gray-100 rounded-xl w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WORKSPACES TAB */}
      {!loading && activeTab === "workspaces" && (
        <div className="space-y-3">
          {workspaces.length === 0 ? (
            <EmptyTrash label="No archived workspaces" />
          ) : (
            workspaces.map((item) => (
              <TrashCard
                key={item.id}
                name={item.name ?? "Unnamed Workspace"}
                icon="🗂️"
                deletedAt={item.deleted_at}
                formatDate={formatDate}
                onRestore={() => handleRestoreWorkspace(item.id)}
                restoring={restoring === item.id}
                onForceDelete={() => handleForceDeleteWorkspace(item.id, item.name ?? "Workspace")}
                deleting={deleting === item.id}
              />
            ))
          )}
        </div>
      )}

      {/* PROJECTS TAB */}
      {!loading && activeTab === "projects" && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <EmptyTrash label="No archived projects" />
          ) : (
            projects.map((item) => (
              <TrashCard
                key={item.id}
                name={item.name ?? item.title ?? "Unnamed Project"}
                icon="📋"
                deletedAt={item.deleted_at}
                formatDate={formatDate}
                onRestore={() => handleRestoreProject(item.workspace_id, item.id)}
                restoring={restoring === item.id}
                onForceDelete={() => handleForceDeleteProject(item.workspace_id, item.id, item.name ?? item.title ?? "Project")}
                deleting={deleting === item.id}
              />
            ))
          )}
        </div>
      )}

      {/* TASKS TAB */}
      {!loading && activeTab === "tasks" && (
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <EmptyTrash label="No archived tasks" />
          ) : (
            tasks.map((item) => (
              <TrashCard
                key={item.id}
                name={item.title ?? "Untitled Task"}
                icon="✅"
                deletedAt={item.deleted_at}
                formatDate={formatDate}
                onRestore={() => handleRestoreTask(item.id)}
                restoring={restoring === item.id}
                onForceDelete={() => handleForceDeleteTask(item.id, item.title ?? "Task")}
                deleting={deleting === item.id}
              />
            ))
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && deleteItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Permanently Delete?</h2>
                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{deleteItem.name}</span> will be permanently deleted from the system.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteItem(null);
                }}
                disabled={deletingItem}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingItem}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {deletingItem ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── REUSABLE COMPONENTS ──

function EmptyTrash({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
      <div className="text-4xl mb-3">🗑️</div>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function TrashCard({
  name, icon, deletedAt, formatDate,
  onRestore, restoring, onForceDelete, deleting,
}: {
  name: string;
  icon: string;
  deletedAt: string;
  formatDate: (d: string) => string;
  onRestore: () => void;
  restoring: boolean;
  onForceDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Archived {formatDate(deletedAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRestore}
          disabled={restoring}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {restoring ? "Restoring..." : "Restore"}
        </button>

        <button
          onClick={onForceDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {deleting ? "Deleting..." : "Delete Forever"}
        </button>
      </div>
    </div>
  );
}