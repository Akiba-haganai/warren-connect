import type { Tables } from "@/types/database/database.types";

type Conversation = Tables<"conversations">;

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onClick: () => void;
  unreadCount?: number;
  otherUserName: string;
  otherUserAvatar: string | null;
}

export default function ConversationItem({
  onClick,
  unreadCount = 0,
  otherUserName,
  otherUserAvatar,
}: Props) {
  const initial = otherUserName[0]?.toUpperCase() || "?";

  return (
    <button
      onClick={onClick}
      className="card flex items-center gap-3 px-4 py-3.5 w-full text-left"
    >
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
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--color-text)" }}
        >
          {otherUserName}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
          Tap to view messages
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}