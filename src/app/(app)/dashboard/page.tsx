"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";

// TypeScript types — describe the shape of data from your API
type Workspace = {
  id: number;
  name: string;
  description: string;
  slug: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch workspaces when the page loads
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await api.get("/workspaces");
        // Handle both {data: [...]} and direct array responses
        setWorkspaces(res.data.data ?? res.data);
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []); // the [] means "run this once when the page first loads"

  // A friendly greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Pick a soft background color for each workspace card
  const cardColors = [
    "bg-orange-50 border-orange-100",
    "bg-blue-50 border-blue-100",
    "bg-green-50 border-green-100",
    "bg-purple-50 border-purple-100",
    "bg-pink-50 border-pink-100",
    "bg-yellow-50 border-yellow-100",
  ];

  const iconColors = [
    "bg-orange-100 text-orange-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-pink-100 text-pink-600",
    "bg-yellow-100 text-yellow-600",
  ];

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          {getGreeting()}, {user?.name.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1">Here's an overview of your workspaces.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">Workspaces</p>
          <p className="text-3xl font-bold text-gray-800">{workspaces.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">Your Role</p>
          <p className="text-xl font-bold text-gray-800 capitalize">{user?.role}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-400 mb-1">Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <p className="text-sm font-semibold text-green-600">Active</p>
          </div>
        </div>
      </div>

      {/* Workspaces Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-700">Your Workspaces</h2>
        {/* Only managers/admins can create workspaces */}
        {(user?.role === "manager" || user?.role === "admin") && (
          <Link
            href="/workspaces"
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            Manage all →
          </Link>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && workspaces.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-gray-500 font-medium">No workspaces yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {user?.role === "employee"
              ? "You haven't been added to any workspace yet."
              : "Create your first workspace to get started."}
          </p>
          {(user?.role === "manager" || user?.role === "admin") && (
            <Link
              href="/workspaces"
              className="inline-block mt-4 bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-600 transition"
            >
              Create Workspace
            </Link>
          )}
        </div>
      )}

      {/* Workspace Cards */}
      {!loading && workspaces.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {workspaces.map((workspace, index) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className={`rounded-2xl border p-6 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                cardColors[index % cardColors.length]
              }`}
            >
              {/* Workspace icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold mb-4 ${
                iconColors[index % iconColors.length]
              }`}>
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{workspace.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">
                {workspace.description || "No description provided."}
              </p>
              <div className="mt-4 text-xs text-gray-400 font-medium">
                View projects →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}