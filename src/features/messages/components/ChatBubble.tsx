import { Trash2, Check, CheckCheck } from "lucide-react";

interface Props {
  content?: string;
  isMe?: boolean;
  timestamp?: string;
  onDelete?: () => void | Promise<void>;
  readAt?: string | null;
  isTemp?: boolean;
  attachmentUrl?: string | null;
}

export default function ChatBubble({
  content,
  isMe = false,
  timestamp,
  onDelete,
  readAt,
  isTemp = false,
  attachmentUrl,
}: Props) {
  const statusIcon = isTemp ? (
    <Check size={10} style={{ opacity: 0.5 }} />
  ) : readAt ? (
    <CheckCheck size={10} style={{ color: "var(--color-primary)" }} />
  ) : (
    <CheckCheck size={10} style={{ color: "var(--color-text-muted)" }} />
  );

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl relative group ${isTemp ? "opacity-70" : ""}`}
        style={{
          background: isMe ? "var(--color-primary)" : "var(--color-surface)",
          color: isMe ? "#fff" : "var(--color-text)",
          borderBottomRightRadius: isMe ? "4px" : "16px",
          borderBottomLeftRadius: isMe ? "16px" : "4px",
          border: isMe ? "none" : "1px solid var(--color-border)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}>
        {attachmentUrl && <img src={attachmentUrl} alt="Attachment" className="mb-2 rounded-lg max-w-full max-h-40 object-cover" loading="lazy" />}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px]" style={{ color: isMe ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)" }}>
            {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            {isTemp ? " · Sending…" : ""}
          </span>
          {isMe && statusIcon}
        </div>
        {onDelete && (
          <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this message?")) onDelete(); }}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-red-100 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete message" style={{ color: "var(--color-error)" }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}