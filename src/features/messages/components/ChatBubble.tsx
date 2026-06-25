interface Props {
  content: string;
  isMe: boolean;
  timestamp?: string;
}

export default function ChatBubble({ content, isMe, timestamp }: Props) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm"
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
      </div>
    </div>
  );
}