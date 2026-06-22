"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

type Workspace = {
  id: number;
  name: string;
  description: string;
  slug: string;
};

const cardColors = [
  "border-orange-100 hover:border-orange-300",
  "border-blue-100 hover:border-blue-300",
  "border-green-100 hover:border-green-300",
  "border-purple-100 hover:border-purple-300",
  "border-pink-100 hover:border-pink-300",
  "border-yellow-100 hover:border-yellow-300",
];

const iconColors = [
  "bg-orange-100 text-orange-600",
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-purple-100 text-purple-600",
  "bg-pink-100 text-pink-600",
  "bg-yellow-100 text-yellow-600",
];

export default function WorkspacesPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", slug: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Archive workspace modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get("/workspaces");
      const data = res.data.data ?? res.data;
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (value: string) => {
    setForm({
      ...form,
      name: value,
      slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      await api.post("/workspaces", form);
      setShowModal(false);
      setForm({ name: "", description: "", slug: "" });
      fetchWorkspaces();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create workspace.");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteWorkspace = (workspace: Workspace) => {
    setWorkspaceToDelete({ id: workspace.id, name: workspace.name });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!workspaceToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/workspaces/${workspaceToDelete.id}`);
      setShowDeleteModal(false);
      setWorkspaceToDelete(null);
      fetchWorkspaces();
      addNotification({
        type: "success",
        title: "Workspace Archived",
        message: `${workspaceToDelete.name} has been archived. You can restore it from Trash.`,
      });
    } catch (err: any) {
      console.error("Failed to delete workspace", err);
      addNotification({
        type: "error",
        title: "Archive Failed",
        message: err.response?.data?.message || "Failed to archive workspace.",
        duration: null,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Workspaces</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {(user?.role === "manager" || user?.role === "admin") && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#F97316] hover:bg-[#EA6A0A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-orange-100 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        )}
      </div>

      {/* LOADING SKELETON */}
      {loading && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && workspaces.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">🗂️</div>
          <p className="text-gray-600 font-semibold text-lg">No workspaces yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {user?.role === "employee"
              ? "You haven't been added to a workspace yet. Contact your manager."
              : "Create your first workspace to get your team organised."}
          </p>
          {(user?.role === "manager" || user?.role === "admin") && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 bg-orange-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition"
            >
              Create Workspace
            </button>
          )}
        </div>
      )}

      {/* WORKSPACE CARDS */}
      {!loading && workspaces.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {workspaces.map((workspace, index) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className={`bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-md group block ${
                cardColors[index % cardColors.length]
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                    iconColors[index % iconColors.length]
                  }`}>
                    {workspace.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <h3 className="font-bold text-gray-800">{workspace.name}</h3>
                </div>

                {(user?.role === "manager" || user?.role === "admin") && (
                  <button
                    onClick={(e) => {
                      e.preventDefault(); // stops the Link firing when delete is clicked
                      confirmDeleteWorkspace(workspace);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-50"
                    title="Archive workspace"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {workspace.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full font-mono">
                  {workspace.slug}
                </span>
                <span className="text-sm font-semibold text-orange-500 group-hover:text-orange-600 transition">
                  View projects →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ARCHIVE WORKSPACE CONFIRMATION MODAL */}
      {showDeleteModal && workspaceToDelete && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Archive workspace</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will move <span className="font-medium text-gray-900">{workspaceToDelete.name}</span> to Trash.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-3xl p-4 mb-6">
              <p className="text-sm text-orange-700">
                Archived workspaces can be restored later from Trash.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition shadow-md shadow-orange-100 disabled:opacity-50"
              >
                {deleting ? "Archiving..." : "Archive Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORKSPACE MODAL */}
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
              <h2 className="text-xl font-bold text-gray-800">New Workspace</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
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

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this workspace for?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Slug
                  <span className="text-gray-400 font-normal ml-1">(auto-generated)</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="marketing-team"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800 font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Used in URLs. Only lowercase letters, numbers, and hyphens.
                </p>
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
                  {formLoading ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}