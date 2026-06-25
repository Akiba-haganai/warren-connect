import { Bell, MessageCircle, Heart, ShoppingBag, Home } from "lucide-react";
import type { Tables } from "@/types/database/database.types";

type Notification = Tables<"notifications">;

const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  message: MessageCircle,
  like: Heart,
  product: ShoppingBag,
  accommodation: Home,
};

export default function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = iconMap[notification.type] ?? Bell;

  return (
    <div className={`card p-4 flex items-start gap-3 ${notification.is_read ? "opacity-60" : ""}`}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: notification.is_read ? "var(--color-bg)" : "var(--color-accent-light)" }}>
        <div style={{ color: notification.is_read ? "var(--color-text-muted)" : "var(--color-accent)" }}>
          <Icon size={16} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{notification.title}</p>
        {notification.body && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{notification.body}</p>}
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          {notification.created_at ? new Date(notification.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
        </p>
      </div>
    </div>
  );
}