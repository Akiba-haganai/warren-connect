import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { messageService } from "@/services/messages/messageService";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { triggerNotification } from "@/services/notifications/triggerService";
import { timeAgo, isOnline } from "@/utils/timeAgo";
import {
  MessageCircle, Send, Loader2, ArrowLeft, Trash2,
  Search, ImagePlus, WifiOff
} from "lucide-react";
import ConversationItem from "@/features/messages/components/ConversationItem";
import ChatBubble from "@/features/messages/components/ChatBubble";
import { useConfirm } from "@/hooks/useConfirm";

type UserProfile = { full_name: string; avatar_url: string | null; last_seen: string | null };

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm, ConfirmDialog } = useConfirm();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [conversationSearch, setConversationSearch] = useState("");
  const [isOnlineApp, setIsOnlineApp] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null as any);

  const { data: conversations = [], isLoading: convsLoading } = useConversations(user?.id);
  const { data: messages = [], isLoading: msgsLoading } = useMessages(activeId ?? undefined);
  const sendMessage = useSendMessage();

  const conversationQueryParam = searchParams.get("conversation");
  const searchParamsString = searchParams.toString();

  // URL param
  useEffect(() => {
    if (!conversationQueryParam || conversations.length === 0) return;
    const exists = conversations.find((c) => c.id === conversationQueryParam);
    if (!exists) return;

    setActiveId(conversationQueryParam);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("conversation");
    setSearchParams(newParams, { replace: true });
  }, [conversationQueryParam, conversations, searchParams, searchParamsString, setSearchParams]);

  // Load profiles
  useEffect(() => {
    if (!user || conversations.length === 0) return;
    const otherIds = conversations.map((c) =>
      c.user1_id === user.id ? c.user2_id : c.user1_id
    );
    const uniqueIds = [...new Set(otherIds)];
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, last_seen")
      .in("id", uniqueIds)
      .then(({ data }) => {
        const map: Record<string, UserProfile> = {};
        data?.forEach((p) => {
          map[p.id] = {
            full_name: p.full_name || "Unknown",
            avatar_url: p.avatar_url,
            last_seen: p.last_seen,
          };
        });
        setUserProfiles(map);
      });
  }, [user, conversations]);

  // Mark read
  useEffect(() => {
    if (activeId && user?.id) messageService.markAsRead(activeId, user.id);
  }, [activeId, user?.id]);

  // Realtime new messages
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`msgs-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        () => {
          // React Query will invalidate cache
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  // Realtime typing
  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`typing-${activeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_typing", filter: `conversation_id=eq.${activeId}` },
        () => {
          supabase
            .from("conversation_typing")
            .select("user_id")
            .eq("conversation_id", activeId)
            .then(({ data }) => {
              const ids = (data || []).map((t) => t.user_id) as string[];
              setTypingUsers((prev) => ({ ...prev, [activeId]: ids }));
            });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleTyping = () => {
    if (!user || !activeId) return;
    messageService.setTyping(activeId, user.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (user) messageService.clearTyping(activeId, user.id);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleSend = () => {
    if (!user || !activeId || !input.trim()) return;
    const conv = conversations.find((c) => c.id === activeId);
    if (!conv) return;
    const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

    sendMessage.mutate(
      { conversationId: activeId, senderId: user.id, content: input.trim() },
      {
        onSuccess: () => {
          setInput("");
          triggerNotification.message(otherUserId, profile?.full_name ?? "Someone", input.trim());
        },
      }
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeId) return;
    try {
      const url = await messageService.uploadAttachment(file, user.id);
      sendMessage.mutate({
        conversationId: activeId,
        senderId: user.id,
        content: file.name,
        attachmentUrl: url,
        attachmentType: file.type.startsWith("image/") ? "image" : "document",
      });
    } catch (err) {
      console.error("Upload failed:", err);
    }
    e.target.value = "";
  };

  const handleDeleteMessage = async (msgId: string) => {
    const ok = await confirm({
      title: "Delete message?",
      message: "This cannot be undone.",
    });
    if (ok) {
      await messageService.deleteMessage(msgId);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    const ok = await confirm({
      title: "Delete conversation?",
      message: "All messages will be permanently removed.",
    });
    if (ok) {
      await messageService.deleteConversation(convId);
      if (activeId === convId) setActiveId(null);
    }
  };

  useEffect(() => {
    const goOnline = () => setIsOnlineApp(true);
    const goOffline = () => setIsOnlineApp(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const filteredConversations = conversations.filter((c) => {
    if (!conversationSearch.trim()) return true;
    const otherId = c.user1_id === user?.id ? c.user2_id : c.user1_id;
    const name = userProfiles[otherId]?.full_name?.toLowerCase() ?? "";
    return name.includes(conversationSearch.toLowerCase());
  });

  const activeConversation = conversations.find((c) => c.id === activeId);
  const activeOtherId = activeConversation
    ? activeConversation.user1_id === user?.id
      ? activeConversation.user2_id
      : activeConversation.user1_id
    : null;
  const activeOtherProfile = activeOtherId ? userProfiles[activeOtherId] : null;
  const activeTyping = activeId ? typingUsers[activeId]?.filter((id) => id !== user?.id) ?? [] : [];
  const isTyping = activeTyping.length > 0;
  const activeOnline = activeOtherProfile ? isOnline(activeOtherProfile.last_seen) : false;

  if (activeId && activeConversation) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--color-bg)" }}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <button aria-label="Back" onClick={() => setActiveId(null)} className="p-1">
            <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
          </button>
          {activeOtherProfile?.avatar_url ? (
            <div className="relative">
              <img src={activeOtherProfile.avatar_url} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm" alt="" />
              {activeOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
            </div>
          ) : (
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm" style={{ background: "var(--color-primary)" }}>
                {(activeOtherProfile?.full_name?.[0] || "?").toUpperCase()}
              </div>
              {activeOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
              {activeOtherProfile?.full_name || "Unknown"}
            </span>
            {isTyping ? (
              <p className="text-xs italic" style={{ color: "var(--color-primary)" }}>typing…</p>
            ) : activeOnline ? (
              <p className="text-xs" style={{ color: "var(--color-success)" }}>Online now</p>
            ) : activeOtherProfile?.last_seen ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Last seen {timeAgo(activeOtherProfile.last_seen)}</p>
            ) : null}
          </div>
          <button onClick={() => handleDeleteConversation(activeId)} className="p-2 rounded-full hover:bg-red-100" aria-label="Delete conversation" style={{ color: "var(--color-text-muted)" }}>
            <Trash2 size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {msgsLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2">
              <MessageCircle size={48} style={{ color: "var(--color-border)", opacity: 0.6 }} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No messages yet — say hello!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                isMe={msg.sender_id === user?.id}
                timestamp={msg.created_at ?? undefined}
                onDelete={() => handleDeleteMessage(msg.id)}
                readAt={msg.read_at}
                isTemp={msg.id.startsWith("temp-")}
                attachmentUrl={msg.attachment_url}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
          style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", paddingBottom: "max(12px, env(safe-area-inset-bottom))", boxShadow: "0 -1px 4px rgba(0,0,0,0.04)" }}
        >
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full" style={{ color: "var(--color-text-muted)" }}>
            <ImagePlus size={20} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <div className="flex-1 rounded-2xl" style={{ background: "var(--color-bg)", padding: "0.375rem" }}>
            <input
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              style={{ color: "var(--color-text)", border: "none" }}
              placeholder="Message…"
              value={input}
              onChange={(e) => { setInput(e.target.value); handleTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              aria-label="Type a message"
            />
          </div>
          <button onClick={handleSend} disabled={sendMessage.isPending || !input.trim()} className="flex items-center justify-center rounded-2xl px-4 py-2.5 transition-all active:scale-95" style={{ background: input.trim() ? "var(--color-primary)" : "var(--color-border)", color: input.trim() ? "#fff" : "var(--color-text-muted)", minWidth: 44 }} aria-label="Send message">
            {sendMessage.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 px-4 py-4" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--color-text)" }}>Messages</h1>
        <div className="relative mt-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
          <input className="input-field pl-9 text-sm" placeholder="Search conversations…" value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)} />
        </div>
      </div>

      <div className="px-4 pt-3 pb-8">
        {!isOnlineApp && (
          <div className="flex items-center gap-2 mb-3 text-xs text-yellow-600 bg-yellow-50 p-2 rounded-lg">
            <WifiOff size={14} /> You are offline — messages may not send
          </div>
        )}
        {convsLoading ? (
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
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-3xl py-20 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <MessageCircle size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px", opacity: 0.5 }} />
            <h3 className="text-base font-bold mb-1" style={{ color: "var(--color-text)" }}>No messages yet</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Start a conversation by contacting a seller or landlord.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredConversations.map((conv) => {
              const otherId = conv.user1_id === user!.id ? conv.user2_id : conv.user1_id;
              const otherProfile = userProfiles[otherId];
              const online = otherProfile ? isOnline(otherProfile.last_seen) : false;
              return (
                <ConversationItem
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  unreadCount={0}
                  otherUserName={otherProfile?.full_name || otherId.slice(0, 8) + "…"}
                  otherUserAvatar={otherProfile?.avatar_url || null}
                  isOnline={online}
                  onDelete={() => handleDeleteConversation(conv.id)}
                />
              );
            })}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  );
}