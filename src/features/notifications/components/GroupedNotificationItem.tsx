import { useNavigate } from "react-router-dom";
import { Bell, MessageCircle, Heart, ShoppingBag, Home } from "lucide-react";
import type { Tables } from "@/types/database/database.types";

type Notification = Tables<"notifications">;

const iconMap: Record<string, React.FC<{ size?: number; className?: string; color?: string }>> = {
  message: MessageCircle,
  like: Heart,
  product: ShoppingBag,
  accommodation: Home,
  system: Bell,
};

interface Props {
  notifications: Notification[];
  onMarkRead: () => Promise<void>;
}

export default function GroupedNotificationItem({ notifications, onMarkRead }: Props) {
  const navigate = useNavigate();
  const latest = notifications[0];
  const count = notifications.length;
  const isAllRead = notifications.every((n) => n.is_read);
  const Icon = iconMap[latest.type] ?? Bell;

  const handleClick = async () => {
    if (latest.link) navigate(latest.link);
    if (!isAllRead) {
      await onMarkRead();
    }
  };

  return (
    <button onClick={handleClick} className={`card p-4 flex items-start gap-3 text-left w-full ${isAllRead ? "opacity-60" : ""}`}
      style={{ background: "var(--color-surface)" }} aria-label={`Notification group: ${latest.title}`}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 relative"
        style={{ background: isAllRead ? "var(--color-bg)" : "var(--color-accent-light)" }}>
        <Icon size={16} color={isAllRead ? "var(--color-text-muted)" : "var(--color-accent)"} />
        {count > 1 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{latest.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          {count > 1 ? `${count} notifications` : latest.body}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
          {latest.created_at ? new Date(latest.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
        </p>
      </div>
    </button>
  );
}