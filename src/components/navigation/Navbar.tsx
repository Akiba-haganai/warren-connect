import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Bell, MessageCircle, Search, UserCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications/notificationService";

export default function Navbar() {
  const { profile } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Fetch unread notifications count
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(user!.id),
    enabled: !!user,
  });
  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Brand */}
        <Link to="/" className="flex items-center gap-2" aria-label="Warren Connect home">
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

        {/* Center: Search (desktop) or nothing on mobile */}
        <button
          onClick={() => navigate("/marketplace")}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/80 text-sm hover:bg-white/20 transition"
        >
          <Search size={14} />
          <span>Search listings…</span>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Messages */}
          <Link
            to="/messages"
            className="relative p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Messages"
          >
            <MessageCircle size={20} className="text-white" />
          </Link>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl hover:bg-white/10 transition"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

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
  );
}