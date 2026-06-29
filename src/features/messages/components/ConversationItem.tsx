import type { Tables } from "@/types/database/database.types";
import { Trash2 } from "lucide-react";

type Conversation = Tables<"conversations">;

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onClick: () => void | Promise<void>;
  unreadCount?: number;
  otherUserName: string;
  otherUserAvatar: string | null;
  onDelete?: () => void;
}

export default function ConversationItem({
  conversation,
  currentUserId,
  onClick,
  unreadCount = 0,
  otherUserName,
  otherUserAvatar,
  onDelete,
}: Props) {
  // These props are currently not used for rendering but are kept for API compatibility.
  // Read the values to avoid TS6133 (noUnusedLocals) while keeping the public props stable.
  const _unusedConversation = conversation;
  const _unusedCurrentUserId = currentUserId;
  void _unusedConversation;
  void _unusedCurrentUserId;

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
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 shadow-sm"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 shadow-sm"
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
          <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Delete button – always visible on mobile, revealed on hover for desktop */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Delete this conversation?")) onDelete();
          }}
          className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex-shrink-0 opacity-60 group-hover:opacity-100"
          aria-label="Delete conversation"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
