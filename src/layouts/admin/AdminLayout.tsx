import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import {
  LayoutDashboard, Users, FileText, ShieldCheck, Tag, KeyRound, ArrowLeft
} from "lucide-react";

const navItems = [
  { label: "Overview",        path: "/admin/overview",        icon: LayoutDashboard },
  { label: "Users",           path: "/admin/users",           icon: Users },
  { label: "Content",         path: "/admin/content",         icon: FileText },
  { label: "Verifications",   path: "/admin/verifications",   icon: ShieldCheck },
  { label: "Reports",         path: "/admin/reports",         icon: FileText },
  { label: "Tags",            path: "/admin/tags",            icon: Tag },
  { label: "Password Resets", path: "/admin/password-resets", icon: KeyRound },
];

export default function AdminLayout() {
  const { user, profile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return null;
  if (!user || !profile?.is_admin) return <Navigate to="/" replace />;

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Sidebar */}
      <aside
        className="w-48 flex-shrink-0 flex flex-col"
        style={{ background: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}
      >
        <div className="px-4 py-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">W</div>
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Admin</span>
        </div>
        <nav className="flex-1 px-2 space-y-1 text-sm">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all"
                style={{
                  background: active ? "var(--color-accent-light)" : "transparent",
                  color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link to="/feed" className="flex items-center gap-2 px-3 py-3 text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
          <ArrowLeft size={16} /> Back to app
        </Link>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}