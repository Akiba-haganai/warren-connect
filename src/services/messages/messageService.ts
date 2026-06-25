import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Message = Tables<"messages">;
export type Conversation = Tables<"conversations">;

export const messageService = {
  async getConversations(userId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (error) throw error;
    return data;
  },

  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    // ❗ IMPORTANT: notifications should be handled OUTSIDE this service
    // (we will wire it properly later using triggers or service layer)

    return data;
  },

  async createConversation(user1_id: string, user2_id: string) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user1_id,
        user2_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};