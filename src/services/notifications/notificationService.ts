import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Notification = Tables<"notifications">;

export const notificationService = {
  async getNotificationsPaginated(userId: string, limit: number, offset: number) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createNotification(
    user_id: string,
    type: Notification["type"],
    title: string,
    body?: string,
    link?: string
  ) {
    // Check user preferences before inserting
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", user_id)
      .single();

    const prefs = (profile?.notification_preferences as any) || {};
    if (prefs[type] === false) return null;

    const { data, error } = await supabase
      .from("notifications")
      .insert({ user_id, type, title, body: body ?? null, link: link ?? null })
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
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw error;
  },

  async deleteNotification(id: string) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) return 0;
    return count || 0;
  },
 
  async updateNotificationPreferences(
    userId: string,
    preferences: Record<string, boolean>
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: preferences })
      .eq("id", userId);

    if (error) throw error;
  },

  async getNotificationPreferences(
    userId: string
  ): Promise<Record<string, boolean>> {
    const { data, error } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .single();

    if (error || !data?.notification_preferences) {
      return {
        likes: true,
        comments: true,
        messages: true,
        accommodation: true,
        system: true,
        push: true,
      };
    }
    return data.notification_preferences as any;
  },
};