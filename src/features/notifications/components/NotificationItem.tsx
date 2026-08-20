import { useNavigate } from "react-router-dom";
import { Bell, MessageCircle, Heart, ShoppingBag, Home, Trash2 } from "lucide-react";
import type { Tables } from "@/types/database/database.types";
import { triggerHaptic } from "@/utils/haptic";

type Notification = Tables<"notifications">;

const iconMap: Record<string, React.FC<{ size?: number; className?: string; color?: string }>> = {
  message: MessageCircle,
  like: Heart,
  product: ShoppingBag,
  accommodation: Home,
};

interface Props {
  notification: Notification;
  onMarkRead: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function NotificationItem({ notification, onMarkRead, onDelete }: Props) {
  const navigate = useNavigate();
  const Icon = iconMap[notification.type] ?? Bell;

  const handleClick = () => {
    triggerHaptic();
    // Fire mark as read in background without blocking navigation
    if (!notification.is_read) {
      onMarkRead().catch((err) => console.warn("Mark as read failed:", err));
    }

    // Resolve target link with smart fallback based on notification type
    const targetLink =
      notification.link ||
      (notification.type === "message"
        ? "/messages"
        : notification.type === "product"
        ? "/marketplace"
        : notification.type === "accommodation"
        ? "/accommodation"
        : notification.type === "like" || notification.type === "comment"
        ? "/feed"
        : "/feed");

    if (targetLink) {
      navigate(targetLink);
    }
  };

  return (
    <div
      className={`card p-3.5 flex items-start gap-3 text-left w-full relative group transition-all duration-200 cursor-pointer ${
        notification.is_read
          ? "bg-surface/60 opacity-75 border-border"
          : "bg-surface border-primary/20 shadow-xs ring-1 ring-primary/10"
      }`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      aria-label={`Notification: ${notification.title}`}
    >
      {/* Icon Badge */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          notification.is_read
            ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
            : notification.type === "message"
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : notification.type === "like"
            ? "bg-pink-500/10 text-pink-600 dark:text-pink-400"
            : notification.type === "product"
            ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon size={18} />
      </div>

      {/* Content Body */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2">
          <p
            className={`text-xs sm:text-sm font-semibold truncate ${
              notification.is_read ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white font-bold"
            }`}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" aria-label="Unread notification" />
          )}
        </div>

        {notification.body && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}

        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
          {notification.created_at
            ? new Date(notification.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
      </div>

      {/* Touch-Friendly Delete Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
        aria-label="Delete notification"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}