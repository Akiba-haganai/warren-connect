import { useNavigate } from "react-router-dom";
import { Bell, MessageCircle, Heart, ShoppingBag, Home, Trash2 } from "lucide-react";
import type { Tables } from "@/types/database/database.types";

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

  const handleClick = async () => {
    if (notification.link) {
      navigate(notification.link);
    }
    if (!notification.is_read) {
      try {
        await onMarkRead();
      } catch (err) {
        console.error("Mark as read failed:", err);
      }
    }
  };

  return (
    <div
      className={`card p-4 flex items-start gap-3 text-left w-full relative group ${
        notification.is_read ? "opacity-60" : ""
      }`}
      style={{ background: "var(--color-surface)" }}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      aria-label={`Notification: ${notification.title}`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: notification.is_read
            ? "var(--color-bg)"
            : "var(--color-accent-light)",
        }}
      >
        <Icon
          size={16}
          color={notification.is_read ? "var(--color-text-muted)" : "var(--color-accent)"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {notification.body}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
        aria-label="Delete notification"
      >
        <Trash2 size={14} style={{ color: "var(--color-text-muted)" }} />
      </button>
    </div>
  );
}