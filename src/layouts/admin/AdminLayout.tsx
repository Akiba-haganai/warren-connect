import { Outlet, Navigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Shield, ArrowLeft } from "lucide-react";

export default function AdminLayout() {
  const { user, profile, loading } = useAuthStore();

  if (loading) return null;
  if (!user || !profile?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Sidebar */}
      <aside
        className="w-48 flex-shrink-0 flex flex-col"
        style={{
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <div className="px-4 py-5 flex items-center gap-2">
          <Shield size={20} style={{ color: "var(--color-primary)" }} />
          <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
            Admin
          </h1>
        </div>

        <nav className="flex-1 px-3 space-y-1 text-sm">
          <Link
            to="/admin"
            className="block px-3 py-2 rounded-xl font-medium transition-all"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Dashboard
          </Link>
          <Link
            to="/feed"
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <ArrowLeft size={14} />
            Back to app
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}