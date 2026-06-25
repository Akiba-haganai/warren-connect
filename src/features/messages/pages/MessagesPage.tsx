import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { messageService } from "@/services/messages/messageService";
import { triggerNotification } from "@/services/notifications/triggerService";
import type { Tables } from "@/types/database/database.types";
import { MessageCircle, Send, Loader2, ArrowLeft } from "lucide-react";
import ConversationItem from "@/features/messages/components/ConversationItem";
import ChatBubble from "@/features/messages/components/ChatBubble";

type Conversation = Tables<"conversations">;
type Message = Tables<"messages">;

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    messageService
      .getConversations(user.id)
      .then((data) => {
        setConversations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`room-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${active.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [active]);

  const openConversation = async (conv: Conversation) => {
    setActive(conv);
    setMsgLoading(true);
    try {
      const data = await messageService.getMessages(conv.id);
      setMessages(data);
    } finally {
      setMsgLoading(false);
    }
  };

  const handleSend = async () => {
    if (!user || !active || !input.trim()) return;
    setSending(true);
    try {
      const msg = await messageService.sendMessage(active.id, user.id, input.trim());
      setMessages((prev) => [...prev, msg]);
      setInput("");

      const otherUserId = active.user1_id === user.id ? active.user2_id : active.user1_id;
      // ✅ Fixed: removed the extra conversationId argument
      triggerNotification.message(
        otherUserId,
        profile?.full_name ?? "Someone",
        input.trim()
      );
    } finally {
      setSending(false);
    }
  };

  if (active) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--color-bg)" }}>
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <button aria-label="click" onClick={() => setActive(null)} className="p-1">
            <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
            style={{ background: "var(--color-primary)" }}
          >
            {active.user1_id === user?.id
              ? active.user2_id.slice(0, 1).toUpperCase()
              : active.user1_id.slice(0, 1).toUpperCase()}
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
            Conversation
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {msgLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm py-10" style={{ color: "var(--color-text-muted)" }}>
              No messages yet — say hello!
            </p>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                isMe={msg.sender_id === user?.id}
                timestamp={msg.created_at ?? undefined}
              />
            ))
          )}
        </div>

        <div
          className="flex gap-2 px-4 py-3 flex-shrink-0"
          style={{
            background: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
            paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          }}
        >
          <input
            className="input-field flex-1 py-2.5 text-sm"
            placeholder="Message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            aria-label="Type a message"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="flex items-center justify-center rounded-xl px-3"
            style={{
              background: input.trim() ? "var(--color-primary)" : "var(--color-border)",
              color: input.trim() ? "#fff" : "var(--color-text-muted)",
              minWidth: 44,
            }}
            aria-label="Send message"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
          Messages
        </h1>
      </div>

      <div className="px-4 pt-4 pb-8">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 flex items-center gap-3">
                <div className="skeleton rounded-full" style={{ width: 44, height: 44, flexShrink: 0 }} />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="skeleton rounded" style={{ height: 12, width: "50%" }} />
                  <div className="skeleton rounded" style={{ height: 10, width: "70%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <MessageCircle size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUserId={user!.id}
                onClick={() => openConversation(conv)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}