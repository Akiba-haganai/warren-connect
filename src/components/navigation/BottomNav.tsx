import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home, Store, Building2, MessageCircle, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth/authStore";
import { notificationService } from "@/services/notifications/notificationService";
import { roommateService } from "@/services/roommates/roommateService";
import { supabase } from "@/lib/supabase/client";
import { triggerHaptic } from "@/utils/haptic";

const tabs = [
  { label: "Home",      path: "/feed",          icon: Home },
  { label: "Market",    path: "/marketplace",   icon: Store },
  { label: "Housing",   path: "/accommodation", icon: Building2 },
  { label: "Chat",      path: "/messages",      icon: MessageCircle },
  { label: "Roommates", path: "/roommates",     icon: Users },
];

export default function BottomNav() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => (user ? notificationService.getNotifications(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const { data: newMatches } = useQuery({
    queryKey: ["roommate-matches", user?.id],
    queryFn: () => (user ? roommateService.getNewMatchesCount(user.id) : Promise.resolve(0)),
    enabled: !!user,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length ?? 0;
  const matchesCount = newMatches ?? 0;

  useEffect(() => {
    if (location.pathname === "/roommates") {
      queryClient.invalidateQueries({ queryKey: ["roommate-matches", user?.id] });
    }
  }, [location.pathname, queryClient, user?.id]);

  // Realtime: invalidate match badge instantly when someone likes us
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("roommate-likes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "roommate_likes", filter: `liked_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["roommate-matches", user.id] });
          queryClient.invalidateQueries({ queryKey: ["roommate-like-state", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 glass-surface transition-colors duration-200"
      style={{
        zIndex: 50,
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 20px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto relative px-2">
        {tabs.map((tab) => {
          const active =
            tab.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;

          const showNotifBadge = (tab.path === "/feed" || tab.path === "/") && unreadCount > 0;
          const showMatchBadge = tab.path === "/roommates" && matchesCount > 0;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              onClick={() => {
                if (!active) triggerHaptic();
              }}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative touch-manipulation group select-none"
              style={{
                textDecoration: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* Active Pill Highlight */}
              {active && (
                <motion.span
                  layoutId="bottom-nav-pill"
                  className="absolute inset-x-1.5 inset-y-1.5 rounded-2xl"
                  style={{
                    background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: active ? 1.15 : 1,
                    y: active ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.5 : 1.9}
                    style={{
                      color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                      transition: "color 0.2s ease",
                    }}
                  />
                </motion.div>

                {/* Minimal Notification Indicators (Clean Dots) */}
                <AnimatePresence>
                  {showNotifBadge && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-0.5 -right-2 w-2.5 h-2.5 bg-red-500 rounded-full"
                      style={{
                        boxShadow: "0 0 0 2px var(--color-surface)",
                      }}
                    />
                  )}
                  {showMatchBadge && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-0.5 -right-2 w-2.5 h-2.5 bg-purple-500 rounded-full"
                      style={{
                        boxShadow: "0 0 0 2px var(--color-surface)",
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>

              <motion.span
                animate={{
                  y: active ? -1 : 0,
                }}
                className="relative z-10 text-[10px] leading-none"
                style={{
                  color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontWeight: active ? 700 : 500,
                  transition: "color 0.2s ease",
                }}
              >
                {tab.label}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
