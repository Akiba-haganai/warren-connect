import type { Tables } from "@/types/database/database.types";

type Conversation = Tables<"conversations">;

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onClick: () => void;
}

export default function ConversationItem({ conversation, currentUserId, onClick }: Props) {
  const otherId =
    conversation.user1_id === currentUserId
      ? conversation.user2_id
      : conversation.user1_id;

  return (
    <button
      onClick={onClick}
      className="card flex items-center gap-3 px-4 py-3.5 w-full text-left"
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
        style={{ background: "var(--color-primary)" }}
      >
        {otherId.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--color-text)" }}
        >
          {otherId.slice(0, 8)}…
        </p>
        <p
          className="text-xs truncate"
          style={{ color: "var(--color-text-muted)" }}
        >
          Tap to view messages
        </p>
      </div>
    </button>
  );
}