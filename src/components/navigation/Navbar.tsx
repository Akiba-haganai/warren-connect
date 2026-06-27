import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Bell, Search, UserCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications/notificationService";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SearchOverlay from "@/components/ui/SearchOverlay";

export default function Navbar() {
  const { profile } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const [showSearch, setShowSearch] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(user!.id),
    enabled: !!user,
  });
  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <>
      <header
        className="sticky top-0 z-40"
        style={{
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo – now points to /feed */}
          <Link to="/feed" className="flex items-center gap-2" aria-label="Warren Connect home">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              W
            </div>
            <span className="text-white font-bold text-base tracking-tight hidden sm:block">
              Warren Connect
            </span>
          </Link>

          {/* Search button – opens overlay */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/80 text-sm hover:bg-white/20 transition"
            aria-label="Open search"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Search…</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl hover:bg-white/10 transition"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <Bell size={20} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            <ThemeToggle />

            {/* Profile */}
            <Link
              to="/profile"
              className="p-0.5 rounded-full hover:bg-white/10 transition"
              aria-label="Profile"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Profile"}
                  className="w-8 h-8 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <UserCircle size={28} className="text-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
    </>
  );
}