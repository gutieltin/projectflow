"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

type User = {
  id: number;
  name: string;
  email: string;
  role?: string;
  roles?: { name: string }[];
  must_reset_password: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addNotification } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Redirect non-admins away
    if (user && user.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      const data = res.data.data ?? res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
const confirmDelete = (id: number, name: string) => {
  setUserToDelete({ id, name });
  setShowDeleteModal(true);
};

const handleDelete = async () => {
  if (!userToDelete) return;
  setDeleting(userToDelete.id);
  try {
    await api.delete(`/users/${userToDelete.id}`);
    setShowDeleteModal(false);
    setUserToDelete(null);
    fetchUsers();
    addNotification({
      type: "success",
      title: "User Deleted",
      message: `${userToDelete.name} has been removed from the system.`,
    });
  } catch (err: any) {
    setShowDeleteModal(false);
    setUserToDelete(null);
    addNotification({
      type: "error",
      title: "Delete Failed",
      message: err.response?.data?.message || "Failed to delete user.",
      duration: null,
    });
  } finally {
    setDeleting(null);
  }
};

  // Filter users based on search input
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge: Record<string, string> = {
    admin:    "bg-purple-100 text-purple-700",
    manager:  "bg-blue-100 text-blue-700",
    employee: "bg-green-100 text-green-700",
  };

  const avatarColors = [
    "bg-orange-100 text-orange-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-pink-100 text-pink-600",
  ];

  const getRole = (user: User) => {
    // 1. Check roles relation first (contains the actual assigned role)
    if (user.roles && user.roles.length > 0) {
      const roleNames = user.roles.map(r => r.name);
      if (roleNames.includes('admin')) return 'admin';
      if (roleNames.includes('manager')) return 'manager';
      if (roleNames.includes('employee')) return 'employee';
      return roleNames[0]; // fallback to first role
    }

    // 2. Fall back to legacy role field
    if (user.role) return user.role;

    // 3. Default to employee
    return "employee";
  };

  const initials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="max-w-5xl mx-auto">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">All Users</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {users.length} user{users.length !== 1 ? "s" : ""} in the system
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-sm text-gray-800 w-64"
          />
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-gray-50 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div>
                  <div className="h-3 bg-gray-100 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-48" />
                </div>
              </div>
              <div className="h-8 bg-gray-100 rounded-xl w-20" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filteredUsers.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">👤</div>
          <p className="text-gray-600 font-semibold">
            {search ? "No users match your search" : "No users found"}
          </p>
        </div>
      )}

      {/* USERS TABLE */}
      {!loading && filteredUsers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

          {/* Table header */}
          <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="col-span-4">User</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table rows */}
          {filteredUsers.map((u, index) => (
            <div
              key={u.id}
              className={`grid grid-cols-12 px-6 py-4 items-center border-b border-gray-50 hover:bg-gray-50 transition-all ${
                u.id === user?.id ? "bg-orange-50/30" : ""
              }`}
            >
              {/* Name + Avatar */}
              <div className="col-span-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold -shrink-0 ${
                  avatarColors[index % avatarColors.length]
                }`}>
                  {initials(u.name ?? "?")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {u.name}
                    {u.id === user?.id && (
                      <span className="ml-2 text-xs text-orange-500 font-medium">(YOU)</span>
                    )}
                  </p>
                  {u.must_reset_password && (
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                      Awaiting password change
                    </span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="col-span-3">
                <p className="text-sm text-gray-500 truncate">{u.email}</p>
              </div>

              {/* Role */}
              <div className="col-span-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                  roleBadge[getRole(u)] ?? "bg-gray-100 text-gray-500"
                }`}>
                  {getRole(u)}
                </span>
              </div>

              {/* Joined date */}
              <div className="col-span-2">
                <p className="text-xs text-gray-400">
                  {u.created_at ? formatDate(u.created_at) : "—"}
                </p>
              </div>

              {/* Delete button — can't delete yourself */}
              <div className="col-span-1 flex justify-end">
                {u.id !== user?.id ? (
                  <button
                    onClick={() => confirmDelete(u.id, u.name)}
                    disabled={deleting === u.id}
                    className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                    title="Delete user"
                  >
                    {deleting === u.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <div className="w-8" /> // spacer for alignment
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {showDeleteModal && userToDelete && (
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
      <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Delete User?</h2>
      <p className="text-gray-400 text-sm mb-6">
        Are you sure you want to delete <strong className="text-gray-700">{userToDelete.name}</strong>? 
        This will remove them from all workspaces and cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting === userToDelete.id}
          className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {deleting === userToDelete.id ? "Deleting..." : "Delete User"}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Stats footer */}
      {!loading && users.length > 0 && (
        <div className="flex items-center gap-6 mt-4 px-2 text-sm text-gray-400">
          <span>Total: <strong className="text-gray-600">{users.length}</strong></span>
          <span>Pending password change: <strong className="text-yellow-600">
            {users.filter(u => u.must_reset_password).length}
          </strong></span>
          <span>Admins: <strong className="text-purple-600">
            {users.filter(u => u.role === "admin").length}
          </strong></span>
        </div>
      )}
    </div>
  );
}