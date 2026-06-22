"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user, logout, fetchUser } = useAuth();
  const router = useRouter();

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccess(false);
    setFieldErrors({});

    try {
      await api.post("/update-password", {
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });
      setPasswordSuccess(true);
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      await fetchUser();
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          errors[key] = (val as string[])[0];
        });
        setFieldErrors(errors);
      } else {
        setPasswordError(err.response?.data?.message || "Failed to update password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleBadge: Record<string, string> = {
    admin:    "bg-purple-100 text-purple-700",
    manager:  "bg-blue-100 text-blue-700",
    employee: "bg-green-100 text-green-700",
  };

  const initials = user?.name
    ?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <div className="max-w-2xl mx-auto">

      {/* PAGE HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Profile & Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">Manage your account details.</p>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xl -shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
            <p className="text-gray-400 text-sm">{user?.email}</p>
            <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
              roleBadge[user?.role ?? ""] ?? "bg-gray-100 text-gray-500"
            }`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* CHANGE PASSWORD CARD */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Change Password</h3>
        <p className="text-gray-400 text-sm mb-5">
          Password must be at least 8 characters with uppercase, lowercase, numbers and symbols.
        </p>

        {passwordSuccess && (
          <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Password updated successfully!
          </div>
        )}

        {passwordError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
            ⚠️ {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              placeholder="Your current password"
              className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800 ${
                fieldErrors.current_password ? "border-red-300" : "border-gray-200"
              }`}
            />
            {fieldErrors.current_password && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.current_password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.password}
              onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
              placeholder="At least 8 characters"
              className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800 ${
                fieldErrors.password ? "border-red-300" : "border-gray-200"
              }`}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
              placeholder="Repeat your new password"
              className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-800 ${
                passwordForm.password_confirmation && passwordForm.password !== passwordForm.password_confirmation
                  ? "border-red-300" : "border-gray-200"
              }`}
            />
            {passwordForm.password_confirmation && passwordForm.password !== passwordForm.password_confirmation && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-orange-100 disabled:opacity-50"
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* DANGER ZONE */}
      <div className="bg-white rounded-2xl border border-red-100 p-6 mt-6 shadow-sm">
        <h3 className="text-lg font-bold text-red-600 mb-1">Sign Out</h3>
        <p className="text-gray-400 text-sm mb-4">
          Sign out of your account on this device.
        </p>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}