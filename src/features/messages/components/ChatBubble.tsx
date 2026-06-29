import { Trash2 } from "lucide-react";

interface Props {
  content?: string;
  isMe?: boolean;
  timestamp?: string;
  onDelete?: () => void | Promise<void>;
  otherUserName?: string;
  otherUserAvatar?: string | null;
  unreadCount?: number;
  onClick?: () => void | Promise<void>;
}

export default function ChatBubble({

  onDelete,
  otherUserName = "",
  otherUserAvatar = null,
  unreadCount = 0,
  onClick = () => {},
}: Props) {

  const initial = otherUserName?.[0]?.toUpperCase() || "?";

  return (
    <div className="card flex items-center gap-3 px-4 py-3.5 w-full text-left relative group">
      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {/* Avatar */}
        {otherUserAvatar ? (
          <img
            src={otherUserAvatar}
            alt={otherUserName}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            {initial}
          </div>
        )}

        {/* Name + preview */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
            {otherUserName}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
            Tap to view messages
          </p>
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Delete button – appears on hover (desktop) or always visible (mobile) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Delete this message?")) onDelete();
          }}
          className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
          aria-label="Delete conversation"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
