import { Trash2 } from "lucide-react";

interface Props {
  content: string;
  isMe: boolean;
  timestamp?: string;
  onDelete?: () => void;
}

export default function ChatBubble({ content, isMe, timestamp, onDelete }: Props) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm relative group"
        style={{
          background: isMe ? "var(--color-primary)" : "var(--color-surface)",
          color: isMe ? "#fff" : "var(--color-text)",
          borderBottomRightRadius: isMe ? "4px" : undefined,
          borderBottomLeftRadius: isMe ? undefined : "4px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {timestamp && (
          <p
            className="text-[10px] mt-1 opacity-70"
            style={{
              color: isMe ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)",
            }}
          >
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        {isMe && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this message?")) onDelete();
            }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete message"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}