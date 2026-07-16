import { Outlet, Navigate, Link, useSearchParams } from "react-router-dom";



import { useAuthStore } from "@/store/auth/authStore";
import { useState } from "react";
import {
  LayoutDashboard, Users, FileText, ShieldCheck, Tag, KeyRound, ArrowLeft, Menu, X
} from "lucide-react";

const navItems = [
  { label: "Overview",        tab: "overview",      icon: LayoutDashboard },
  { label: "Users",           tab: "users",          icon: Users },
  { label: "Content",         tab: "content",        icon: FileText },
  { label: "Verifications",   tab: "verifications",  icon: ShieldCheck },
  { label: "Reports",         tab: "reports",        icon: FileText },
  { label: "Tags",            tab: "tags",           icon: Tag },
  { label: "Password Resets", tab: "resets",         icon: KeyRound },
];

export default function AdminLayout() {
  const { user, profile, loading } = useAuthStore();

  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;
  if (!user || !profile?.is_admin) return <Navigate to="/" replace />;

  const closeSidebar = () => setSidebarOpen(false);
  const activeTab = searchParams.get("tab") || "overview";

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 flex-shrink-0 flex flex-col transform transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}
      >
        <div className="px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">W</div>
            <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Admin</span>
          </div>
          <button onClick={closeSidebar} className="lg:hidden p-1 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-2 space-y-1 text-sm overflow-y-auto">
          {navItems.map((item) => {
            const active = activeTab === item.tab;
            const Icon = item.icon;
            return (
              <Link
                key={item.tab}
                to={`/admin?tab=${item.tab}`}
                onClick={closeSidebar}
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 lg:hidden" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu size={24} />
          </button>
          <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Admin</h1>
        </div>
        <Outlet />
      </main>
    </div>
  );
}