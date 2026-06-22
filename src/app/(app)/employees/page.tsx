"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

type Member = {
  id: number;
  name: string;
  email: string;
  role?: string;
  roles?: { name: string }[];
};

type Workspace = {
  id: number;
  name: string;
  can_add_members?: boolean;
  can_add_employees?: boolean;
  canAddMembers?: boolean;
  canAddEmployees?: boolean;
};

export default function EmployeesPage() {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | null>(null);

  const showAddEmployeeButton = user?.role === "admin";

  // Add employee modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "employee" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Credentials modal — shown after creating an employee
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);

  // Delete error modal
  const [deleteError, setDeleteError] = useState("");

  // Delete member modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
    fetchAllMembers();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get("/workspaces");
      const data = res.data.data ?? res.data;
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch workspaces", err);
    }
  };

  const fetchAllMembers = async () => {
    setLoadingMembers(true);
    try {
      const WsRes = await api.get("/workspaces");
      const wsData = WsRes.data.data ?? WsRes.data;
      const allWorkspaces = Array.isArray(wsData) ? wsData : [];  
       // Fetch members from all workspaces and merge unique ones
    // Using a Map to avoid duplicates (same person in multiple workspaces)
    const memberMap = new Map();
    for (const ws of allWorkspaces) {
      try {
        const res = await api.get(`/workspaces/${ws.id}/members`);
        const data = res.data.data ?? res.data;
        if (Array.isArray(data)) {
          data.forEach((m: any) => memberMap.set(m.id, m));
        }
      } catch {}
    }
    setMembers(Array.from(memberMap.values()));
  } catch (err) {
    console.error("Failed to fetch employees", err);
  } finally {
    setLoadingMembers(false);
  }
};

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) {
      setFormError("Please select a workspace first.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const res = await api.post(`/workspaces/${selectedWorkspace}/members`, {
        name: form.name,
        email: form.email,
        role: form.role,
      });

      console.log("Backend POST /members response:", res.data);

      // Show the generated credentials to the manager
      setCredentials(res.data.credentials);
      setShowModal(false);
      setForm({ name: "", email: "", role: "employee" });
      fetchAllMembers();
      addNotification({
        type: "success",
        title: "Employee Added",
        message: `${form.name} has been added successfully.`,
      });
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      setFormError(
        errors
          ? Object.values(errors).flat().join(", ")
          : err.response?.data?.message || "Failed to add employee."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDeleteMember = (memberId: number, memberName: string) => {
    setMemberToDelete({ id: memberId, name: memberName });
    setShowDeleteModal(true);
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${memberToDelete.id}`);
      setShowDeleteModal(false);
      setMemberToDelete(null);
      fetchAllMembers();
      addNotification({
        type: "success",
        title: "Employee Deleted",
        message: `${memberToDelete.name} has been removed.`,
      });
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || "Failed to delete employee.");
      addNotification({
        type: "error",
        title: "Delete Failed",
        message: err.response?.data?.message || "Failed to delete employee.",
        duration: null,
      });
    } finally {
      setDeleting(false);
    }
  };

  // Role badge colors
  const roleBadge: Record<string, string> = {
    admin:    "bg-purple-100 text-purple-700",
    manager:  "bg-blue-100 text-blue-700",
    employee: "bg-green-100 text-green-700",
  };

  // Get initials from name
  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const avatarColors = [
    "bg-orange-100 text-orange-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-pink-100 text-pink-600",
  ];

  const getRole = (employee: Member) => {
    // 1. Check roles relation first (contains the actual assigned role)
    if (employee.roles && employee.roles.length > 0) {
      const roleNames = employee.roles.map(r => r.name);
      if (roleNames.includes('admin')) return 'admin';
      if (roleNames.includes('manager')) return 'manager';
      if (roleNames.includes('employee')) return 'employee';
      return roleNames[0]; // fallback to first role
    }

    // 2. Fall back to legacy role field
    if (employee.role) return employee.role;

    // 3. Default to employee
    return "employee";
  };
  return (
    <div className="max-w-5xl mx-auto">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {members.length} employee{members.length !== 1 ? "s" : ""} in your organisation
          </p>
        </div>

        {showAddEmployeeButton && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#F97316] hover:bg-[#EA6A0A] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-orange-100 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Employee
          </button>
        )}
      </div>

      {/* LOADING */}
      {loadingMembers && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div>
                  <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loadingMembers && members.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-gray-600 font-semibold text-lg">No employees yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first employee to get started.</p>
          {showAddEmployeeButton && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 bg-orange-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-orange-600 transition"
            >
              Add Employee
            </button>
          )}
        </div>
      )}

      {/* EMPLOYEES GRID */}
      {!loadingMembers && members.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {members.map((member, index) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm -shrink-0 ${
                    avatarColors[index % avatarColors.length]
                  }`}>
                    {initials(member.name ?? "?")}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-semibold text-gray-800 truncate">{member.name}</p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>
                </div>

                {user?.role === "admin" && (
                  <button
                    onClick={() => confirmDeleteMember(member.id, member.name)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
                    title="Delete employee"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                roleBadge[getRole(member)] ?? "bg-gray-100 text-gray-500"
              }`}>
                {getRole(member)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
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
              <h2 className="text-xl font-bold text-gray-800">Add Employee</h2>
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

            <form onSubmit={handleAddMember} className="space-y-4">

              {/* Workspace selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Add to Workspace
                </label>
                <select
                  required
                  value={selectedWorkspace ?? ""}
                  onChange={(e) => setSelectedWorkspace(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                >
                  <option value="">-- Select workspace --</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@company.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800"
                >
                  <option value="employee">employee</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-orange-700">
                💡 A temporary password will be generated automatically. Share it with the new employee so they can log in and set their own password.
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
                  {formLoading ? "Adding..." : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS MODAL — shown after employee is created */}
      {credentials && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Employee Added!</h2>
              <p className="text-gray-400 text-sm mt-1">
                Share these credentials with <strong>{credentials.name}</strong>
              </p>
            </div>

            {/* Credentials box */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-semibold text-gray-800">{credentials.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-semibold text-gray-800">{credentials.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Role</span>
                <span className="text-sm font-semibold text-gray-800 capitalize">{credentials.role}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Temp Password</span>
                  <span className="text-sm font-bold text-orange-600 font-mono bg-orange-50 px-3 py-1 rounded-lg">
                    {credentials.password}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm text-yellow-700 mb-5">
              ⚠️ Copy this password now — it won't be shown again. The employee must change it on first login.
            </div>

            <button
              onClick={() => setCredentials(null)}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && memberToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete Employee?</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete <strong className="text-gray-700">{memberToDelete.name}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setMemberToDelete(null); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ERROR MODAL */}
      {deleteError && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800 text-center mb-2">Error</h2>
            <p className="text-gray-600 text-center mb-6">{deleteError}</p>
            <button
              onClick={() => setDeleteError("")}
              className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}