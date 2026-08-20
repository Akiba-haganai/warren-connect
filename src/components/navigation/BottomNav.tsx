import { useEffect, useState, useRef } from "react";
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
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<any>(null);

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

  // Hide on scroll down, show on scroll up behavior
  useEffect(() => {
    const container = document.getElementById("main-scroll-container");
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;

      // Always show if we are near the top or bottom
      if (currentScrollY < 50 || currentScrollY >= maxScroll - 50) {
        setIsVisible(true);
      } else {
        // Show if scrolling up, hide if scrolling down
        const diff = currentScrollY - lastScrollY.current;
        if (diff > 10) {
          setIsVisible(false);
        } else if (diff < -10) {
          setIsVisible(true);
        }
      }
      
      lastScrollY.current = currentScrollY;

      // Auto-show after user stops scrolling for a bit so the nav is never totally lost
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout.current);
    };
  }, [location.pathname]);

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0"
      style={{
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Premium Glassmorphism Backdrop */}
      <div className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.1)]" />

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
              className="flex-1 flex flex-col items-center justify-center gap-1 relative touch-manipulation group"
              style={{
                textDecoration: "none",
                WebkitTapHighlightColor: "transparent"
              }}
            >
              {/* Animated Pill Background */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute inset-x-2 inset-y-1.5 rounded-2xl bg-primary/10 dark:bg-primary/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: active ? 1.15 : 1,
                    y: active ? -2 : 0 
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2}
                    className="transition-colors duration-200"
                    style={{ 
                      color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                      opacity: active ? 1 : 0.7 
                    }}
                  />
                </motion.div>
                
                {/* Notification Indicators (Minimal Dots) */}
                <AnimatePresence>
                  {showNotifBadge && (
                    <motion.span 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900"
                    />
                  )}
                  {showMatchBadge && (
                    <motion.span 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-0 right-0 w-2.5 h-2.5 bg-purple-500 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900"
                    />
                  )}
                </AnimatePresence>
              </div>

              <motion.span
                animate={{
                  y: active ? -1 : 0,
                  opacity: active ? 1 : 0.7
                }}
                className="relative z-10 text-[10px] leading-none transition-colors duration-200"
                style={{
                  color: active ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tab.label}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
