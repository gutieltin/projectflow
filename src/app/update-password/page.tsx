"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

export default function updatePasswordPage() {
  const router = useRouter();
  const {fetchUser} = useAuth();
  const [form, setForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.password_confirmation) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    try {
      await api.post("/update-password", {
        current_password: form.current_password,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
        await fetchUser();
      router.push("/dashboard");
  
    } catch (err: any) {
      // Handle Laravel validation errors
      if (err.response?.data?.errors) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, val]) => {
          errors[key] = (val as string[])[0];
        });
        setFieldErrors(errors);
      } else {
        setError(err.response?.data?.message || "Failed to change password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FEF9F5] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Set Your Password</h1>
          <p className="text-gray-400 text-sm mt-2">
            Set a new Password to Continue.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">

          {/* General error */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">
              ⚠️ {error}
            </div>
          )}

          {/* Password requirements info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 text-sm text-blue-700">
            🔒 Your new password must be at least 8 characters and include uppercase, lowercase, numbers and symbols.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

          

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-gray-800 ${
                  fieldErrors.password ? "border-red-300" : "border-gray-200"
                }`}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                placeholder="Repeat your new password"
                className={`w-full px-4 py-3 rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-gray-800 ${
                  form.password_confirmation && form.password !== form.password_confirmation
                    ? "border-red-300"
                    : "border-gray-200"
                }`}
              />
              {form.password_confirmation && form.password !== form.password_confirmation && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F97316] hover:bg-[#EA6A0A] text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-orange-200 disabled:opacity-50 mt-2"
            >
              {loading ? "Saving..." : "Set Password & Continue →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Having trouble? Contact your manager for a new temporary password.
        </p>
      </div>
    </main>
  );
}