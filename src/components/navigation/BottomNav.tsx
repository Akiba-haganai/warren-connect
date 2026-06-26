import { useLocation, Link } from "react-router-dom";
import { Home, Store, Building2, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth/authStore";
import { notificationService } from "@/services/notifications/notificationService";

const tabs = [
  { label: "Home",    path: "/",              icon: Home },
  { label: "Market",  path: "/marketplace",   icon: Store },
  { label: "Housing", path: "/accommodation", icon: Building2 },
  { label: "Chat",    path: "/messages",      icon: MessageCircle },
];

export default function BottomNav() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(user!.id),
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active =
            tab.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          const showBadge = tab.path === "/" && unreadCount > 0; // badge on Home tab

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors"
              style={{
                color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                textDecoration: "none",
              }}
            >
              {active && (
                <span
                  className="absolute inset-x-2 inset-y-1.5 rounded-xl"
                  style={{ background: "var(--color-accent-light)" }}
                />
              )}

              <div className="relative z-10">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? "nav-bounce" : ""}
                  style={{
                    color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                  }}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-3 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>

              <span
                className="relative z-10 text-[10px] font-semibold leading-none"
                style={{
                  color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}