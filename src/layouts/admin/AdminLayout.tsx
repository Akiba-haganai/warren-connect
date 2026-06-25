import { useState } from "react";
import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  ChevronLeft,
  Menu,
  LogOut,
} from "lucide-react";

const adminNav = [
  { label: "Dashboard",     path: "/admin",              icon: LayoutDashboard },
  { label: "Users",         path: "/admin/users",        icon: Users },
  { label: "Verifications", path: "/admin/verifications", icon: ShieldCheck },
  { label: "Reports",       path: "/admin/reports",       icon: FileText },
];

export default function AdminLayout() {
  const { user, profile, loading } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;
  if (!user || !profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ background: "var(--color-primary)" }}
            >
              W
            </div>
            <h1 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Admin
            </h1>
          </div>

          <button
          aria-label="sidebar"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          {adminNav.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: active ? "var(--color-accent-light)" : "transparent",
                  color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <LogOut size={16} />
            Back to app
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 lg:px-6"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <button
          aria-label="sidebar"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg"
            style={{ color: "var(--color-text)" }}
          >
            <Menu size={20} />
          </button>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            Admin Panel
          </span>
          <div className="w-8" /> {/* spacer for alignment */}
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}