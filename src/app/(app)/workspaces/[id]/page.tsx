"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

type Project = {
  id: number;
  name: string | null;
  title: string | null;
  description: string;
  status: "active" | "archived" | "completed";
};

type Workspace = {
  id: number;
  name: string;
  description: string;
};

type Member = {
  id: number;
  name: string;
  email: string;
  role: string;
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

const statusStyles: Record<string, string> = {
  active:    "bg-green-100 text-green-700",
  archived:  "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
};

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Create project modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "active" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Add member modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: "", name: "", role: "employee" });
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState<any>(null);

  // Status update
  const [statusLoading, setStatusLoading] = useState<number | null>(null);

  // Delete project confirmation modal
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);

  // Members panel
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const wsRes = await api.get("/workspaces");
      const allWorkspaces = wsRes.data.data ?? wsRes.data;
      const current = allWorkspaces.find((w: Workspace) => w.id === Number(id));
      setWorkspace(current ?? null);

      const projRes = await api.get(`/workspaces/${id}/projects?per_page=100`);
      const projectData = projRes.data.data ?? projRes.data;
      setProjects(Array.isArray(projectData) ? projectData : []);

      const memberRes = await api.get(`/workspaces/${id}/members`);
      const memberData = memberRes.data.data ?? memberRes.data;
      setMembers(Array.isArray(memberData) ? memberData : []);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      await api.post(`/workspaces/${id}/projects`, {
        name: form.name,
        title: form.name,
        description: form.description,
        status: form.status,
      });
      setShowModal(false);
      setForm({ name: "", description: "", status: "active" });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create project.");
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteProjectModal(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setDeletingProject(true);
    try {
      await api.delete(`/workspaces/${id}/projects/${projectToDelete.id}`);
      setShowDeleteProjectModal(false);
      setProjectToDelete(null);
      fetchData();
    } catch (err) {
      console.error("Failed to delete project", err);
    } finally {
      setDeletingProject(false);
    }
  };

  const handleProjectStatusChange = async (
    projectId: number,
    newStatus: "active" | "archived" | "completed"
  ) => {
    setStatusLoading(projectId);
    try {
      await api.patch(`/workspaces/${id}/projects/${projectId}`, { status: newStatus });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error("Failed to update project status", err);
    } finally {
      setStatusLoading(null);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") {
      setMemberError("Only admins can add members to this workspace.");
      return;
    }
    setMemberLoading(true);
    setMemberError("");
    setMemberSuccess(null);
    try {
      const res = await api.post(`/workspaces/${id}/members`, {
        email: memberForm.email,
        name: memberForm.name,
        role: memberForm.role,
      });
      setMemberSuccess(res.data);
      setMemberForm({ email: "", name: "", role: "employee" });
      fetchData();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      setMemberError(
        errors
          ? Object.values(errors).flat().join(", ")
          : err.response?.data?.message || "Failed to add member."
      );
    } finally {
      setMemberLoading(false);
    }
  };

  const closeMemberModal = () => {
    setShowMemberModal(false);
    setMemberForm({ email: "", name: "", role: "employee" });
    setMemberError("");
    setMemberSuccess(null);
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/workspaces" className="hover:text-orange-500 transition">
          Workspaces
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">
          {workspace?.name ?? "Loading..."}
        </span>
      </div>

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {workspace?.name ?? "Workspace"}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {workspace?.description || "No description provided."}
          </p>
        </div>

        {(user?.role === "manager" || user?.role === "admin") && (
          <div className="flex items-center gap-3">
            {/* Members toggle */}
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-500 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Members
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {members.length}
              </span>
            </button>

            {/* New Project */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#F97316] hover:bg-[#EA6A0A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-orange-100 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>
        )}
      </div>

      {/* MEMBERS PANEL */}
      {showMembers && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Workspace Members</h2>
            {user?.role === "admin" && (
              <button
                onClick={() => setShowMemberModal(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Member
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No members yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold">
                      {member.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                    member.role === "admin"
                      ? "bg-purple-100 text-purple-600"
                      : member.role === "manager"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-gray-800">{projects.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">
            {projects.filter((p) => p.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">Completed</p>
          <p className="text-3xl font-bold text-blue-600">
            {projects.filter((p) => p.status === "completed").length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">Archived</p>
          <p className="text-3xl font-bold text-gray-500">
            {projects.filter((p) => p.status === "archived").length}
          </p>
        </div>
      </div>

      {/* LOADING SKELETONS */}
      {loading && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && projects.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-600 font-semibold text-lg">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {user?.role === "employee"
              ? "No projects have been created in this workspace yet."
              : "Create your first project to start assigning tasks."}
          </p>
          {(user?.role === "manager" || user?.role === "admin") && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 bg-orange-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition"
            >
              Create Project
            </button>
          )}
        </div>
      )}

      {/* PROJECT CARDS */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((project, index) => (
            <div
              key={project.id}
              onClick={() => router.push(`/workspaces/${id}/projects/${project.id}`)}
              className={`cursor-pointer bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-md group ${
                cardColors[index % cardColors.length]
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                    iconColors[index % iconColors.length]
                  }`}>
                    {(project.title ?? project.name)?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {project.title ?? project.name ?? "Untitled"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        statusStyles[project.status] ?? "bg-gray-100 text-gray-500"
                      }`}>
                        {project.status}
                      </span>

                      {(user?.role === "manager" || user?.role === "admin") && (
                        <select
                          value={project.status}
                          disabled={statusLoading === project.id}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleProjectStatusChange(
                              project.id,
                              e.target.value as "active" | "archived" | "completed"
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50"
                        >
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="archived">Archived</option>
                        </select>
                      )}

                      {statusLoading === project.id && (
                        <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                </div>

                {(user?.role === "manager" || user?.role === "admin") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteProject(project);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-50"
                    title="Archive project"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {project.description || "No description provided."}
              </p>

              <span className="inline-block text-sm font-semibold text-orange-500 group-hover:text-orange-600 transition">
                View tasks →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {showDeleteProjectModal && projectToDelete && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteProjectModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Archive project</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This will move <span className="font-semibold text-gray-900">{projectToDelete.title ?? projectToDelete.name ?? "Untitled project"}</span> to Trash.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteProjectModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-3xl p-4 mb-6">
              <p className="text-sm text-red-700">
                You can restore this project later from Trash.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteProjectModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deletingProject}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition shadow-md shadow-red-100 disabled:opacity-50"
              >
                {deletingProject ? "Archiving..." : "Archive Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
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
              <h2 className="text-xl font-bold text-gray-800">New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Website Redesign"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800 resize-none"
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
                  {formLoading ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showMemberModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeMemberModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-800">Add Member</h2>
              <button onClick={closeMemberModal} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Existing users will be added directly. New emails will get a temporary password.
            </p>

            {memberError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
                ⚠️ {memberError}
              </div>
            )}

            {/* SUCCESS STATE */}
            {memberSuccess ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-green-700">{memberSuccess.message}</p>
                  </div>

                  {memberSuccess.credentials && (
                    <div className="bg-white rounded-xl p-4 space-y-2.5 border border-green-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                        Login Credentials
                      </p>
                      {[
                        { label: "Name",  value: memberSuccess.credentials.name },
                        { label: "Email", value: memberSuccess.credentials.email },
                        { label: "Role",  value: memberSuccess.credentials.role },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">{label}</span>
                          <span className="text-sm font-semibold text-gray-700 capitalize">{value}</span>
                        </div>
                      ))}
                      {memberSuccess.credentials.password && (
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">Temp Password</span>
                          <span className="text-sm font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">
                            {memberSuccess.credentials.password}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {memberSuccess.credentials?.password && (
                    <p className="text-xs text-gray-400 mt-3">
                      ⚠️ Share these credentials with the new member. They will be prompted to set a new password on first login.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeMemberModal}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => { setMemberSuccess(null); setMemberError(""); }}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
                  >
                    Add Another
                  </button>
                </div>
              </div>
            ) : (
              /* FORM STATE */
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                    placeholder="e.g. john@company.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    If this email already exists, the user will be added to this workspace.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                    <span className="text-gray-400 font-normal ml-1">(required for new users)</span>
                  </label>
                  <input
                    type="text"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    placeholder="e.g. John Mensah"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "employee", label: "Employee", active: "bg-gray-100 border-gray-300 text-gray-600" },
                      { value: "manager",  label: "Manager",  active: "bg-blue-100 border-blue-300 text-blue-700" },
                      { value: "admin",    label: "Admin",    active: "bg-purple-100 border-purple-300 text-purple-700" },
                    ].map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setMemberForm({ ...memberForm, role: r.value })}
                        className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                          memberForm.role === r.value
                            ? r.active
                            : "border-gray-200 text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeMemberModal}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={memberLoading}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition shadow-md shadow-orange-100 disabled:opacity-50"
                  >
                    {memberLoading ? "Adding..." : "Add Member"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}