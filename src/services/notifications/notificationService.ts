import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Notification = Tables<"notifications">;

export const notificationService = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createNotification(
    user_id: string,
    type: Notification["type"],
    title: string,
    body?: string,
    link?: string              // ✅ new parameter
  ) {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        type,
        title,
        body: body ?? null,
        link: link ?? null,     // ✅ save link
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId);

    if (error) throw error;
  },
};