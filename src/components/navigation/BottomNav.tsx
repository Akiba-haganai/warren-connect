import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home, Store, Building2, MessageCircle, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth/authStore";
import { notificationService } from "@/services/notifications/notificationService";
import { roommateService } from "@/services/roommates/roommateService";

const tabs = [
  { label: "Home",      path: "/",              icon: Home },
  { label: "Market",    path: "/marketplace",   icon: Store },
  { label: "Housing",   path: "/accommodation", icon: Building2 },
  { label: "Chat",      path: "/messages",      icon: MessageCircle },
  { label: "Roommates", path: "/roommates",     icon: Users },
];

export default function BottomNav() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Notifications count
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(user!.id),
    enabled: !!user,
  });

  // Roommate new matches count
  const { data: newMatches } = useQuery({
    queryKey: ["roommate-matches", user?.id],
    queryFn: () => roommateService.getNewMatchesCount(user!.id),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;
  const matchesCount = newMatches ?? 0;

  // Clear matches badge when visiting the roommates page
  useEffect(() => {
    if (location.pathname === "/roommates") {
      queryClient.invalidateQueries({ queryKey: ["roommate-matches", user?.id] });
    }
  }, [location.pathname, queryClient, user?.id]);

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

          // Badge logic
          const showNotifBadge = tab.path === "/notifications" && unreadCount > 0;
          const showMatchBadge = tab.path === "/roommates" && matchesCount > 0;

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
                  style={{
                    color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                  }}
                />
                {showNotifBadge && (
                  <span className="absolute -top-1.5 -right-3 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {showMatchBadge && (
                  <span className="absolute -top-1.5 -right-3 min-w-[20px] h-5 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {matchesCount > 9 ? "9+" : matchesCount}
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