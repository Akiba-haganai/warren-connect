import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Message = Tables<"messages">;
export type Conversation = Tables<"conversations">;

export const messageService = {
  // ---- Conversations ----

  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createConversation(user1_id: string, user2_id: string) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user1_id, user2_id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteConversation(conversationId: string) {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);
    if (error) throw error;
  },

  async getUnreadCount(conversationId: string, userId: string) {
    const { data, error } = await supabase.rpc("get_unread_count", {
      conversation_id: conversationId,
      user_id: userId,
    });
    if (error) return 0;
    return data ?? 0;
  },

  // ---- Messages ----

  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    attachmentUrl?: string,
    attachmentType?: string
  ) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        attachment_url: attachmentUrl ?? null,
        attachment_type: attachmentType ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMessage(messageId: string) {
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);
    if (error) throw error;
  },

  async editMessage(messageId: string, content: string) {
    const { error } = await supabase
      .from("messages")
      .update({ content, edited_at: new Date().toISOString() })
      .eq("id", messageId);
    if (error) throw error;
  },

  async markAsRead(conversationId: string, userId: string) {
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .is("read_at", null);

    if (error) throw error;
  },

  // ---- Typing ----

  async setTyping(conversationId: string, userId: string) {
    await supabase.from("conversation_typing").upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" }
    );
  },

  async clearTyping(conversationId: string, userId: string) {
    await supabase
      .from("conversation_typing")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);
  },

  // ---- Attachments ----

  async uploadAttachment(file: File, userId: string) {
    const { storageService } = await import("@/services/storage/storageService");
    const { publicUrl } = await storageService.uploadFile(
      "message-attachments",
      file,
      userId,
      true
    );
    return publicUrl;
  },
};