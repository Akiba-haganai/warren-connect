import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { messageService } from "@/services/messages/messageService";
import { useQueryClient } from "@tanstack/react-query";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useSendMessage } from "@/hooks/useSendMessage";
import { triggerNotification } from "@/services/notifications/triggerService";
import { sendPushNotification } from "@/lib/notifications";
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
  const queryClient = useQueryClient();

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
          queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId, queryClient, user?.id]);

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

    // Optional haptic tap
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    sendMessage.mutate(
      { conversationId: activeId, senderId: user.id, content: input.trim() },
      {
        onSuccess: () => {
          setInput("");
          triggerNotification.message(otherUserId, profile?.full_name ?? "Someone", input.trim());
          sendPushNotification(otherUserId, "New Message", input.trim().slice(0, 100), `/messages?conversation=${activeId}`);
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
      <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header (Glassmorphic) */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 pt-[max(env(safe-area-inset-top),12px)]">
          <button 
            aria-label="Back" 
            onClick={() => setActiveId(null)} 
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          {/* Recipient Profile Clickable Header */}
          {activeOtherId ? (
            <Link to={`/user/${activeOtherId}`} className="flex items-center gap-3 min-w-0 flex-1 group hover:opacity-90 transition-opacity">
              {activeOtherProfile?.avatar_url ? (
                <div className="relative shrink-0">
                  <img src={activeOtherProfile.avatar_url} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-xs group-hover:scale-105 transition-transform" alt="" />
                  {activeOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />}
                </div>
              ) : (
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs bg-gradient-to-br from-primary to-primary-dark group-hover:scale-105 transition-transform">
                    {(activeOtherProfile?.full_name?.[0] || "?").toUpperCase()}
                  </div>
                  {activeOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-bold text-[15px] text-slate-900 dark:text-white block truncate group-hover:text-primary transition-colors">
                  {activeOtherProfile?.full_name || "View Profile"}
                </span>
                {isTyping ? (
                  <p className="text-xs font-semibold text-primary flex items-center gap-1">
                    typing
                    <span className="flex gap-0.5 mt-1">
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </p>
                ) : activeOnline ? (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Online now</p>
                ) : activeOtherProfile?.last_seen ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Last seen {timeAgo(activeOtherProfile.last_seen)}</p>
                ) : null}
              </div>
            </Link>
          ) : (
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Chat</span>
            </div>
          )}

          <button 
            onClick={() => handleDeleteConversation(activeId)} 
            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors" 
            aria-label="Delete conversation"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {msgsLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <MessageCircle size={28} className="text-primary" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No messages yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Say hello to start the conversation!</p>
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
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input (Glassmorphic) */}
        <div className="flex items-end gap-2 px-4 py-3 flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] pb-[max(12px,env(safe-area-inset-bottom))]">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2.5 rounded-full text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none shrink-0"
          >
            <ImagePlus size={22} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          
          <div className="flex-1 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all flex items-end min-h-[44px]">
            <input
              className="w-full bg-transparent px-4 py-3 text-[15px] outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => { setInput(e.target.value); handleTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              aria-label="Type a message"
            />
          </div>
          
          <button 
            onClick={handleSend} 
            disabled={sendMessage.isPending || !input.trim()} 
            className="flex items-center justify-center rounded-full h-11 w-11 transition-all active:scale-95 disabled:opacity-50 shrink-0" 
            style={{ 
              background: input.trim() ? "var(--color-primary)" : "var(--color-surface)", 
              color: input.trim() ? "#fff" : "var(--color-text-muted)",
              boxShadow: input.trim() ? "0 4px 12px rgba(0, 137, 123, 0.25)" : "none"
            }} 
            aria-label="Send message"
          >
            {sendMessage.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? "ml-0.5" : ""} />}
          </button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="sticky top-0 z-30 px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm pt-[max(env(safe-area-inset-top),12px)]">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Messages</h1>
        <div className="relative mt-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm outline-none text-slate-900 dark:text-white placeholder:text-slate-500 border border-slate-200/50 dark:border-slate-700/50 focus:ring-2 focus:ring-primary/20 transition-all" 
            placeholder="Search conversations..." 
            value={conversationSearch} 
            onChange={(e) => setConversationSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 max-w-3xl mx-auto">
        {!isOnlineApp && (
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl shadow-xs">
            <WifiOff size={14} /> You are offline — messages may not send
          </div>
        )}
        
        {convsLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2 animate-pulse" />
                  <div className="h-2.5 bg-slate-50 dark:bg-slate-800/60 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-3xl p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 mt-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={28} className="text-primary" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No messages yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px] mx-auto">
              Start a conversation by contacting a seller or landlord.
            </p>
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