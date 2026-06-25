import { supabase } from "@/lib/supabase/client";

export const savedService = {
  async getSavedItems(userId: string) {
    const { data, error } = await supabase
      .from("saved_items")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async saveItem(userId: string, itemType: "product" | "accommodation", itemId: string) {
    const { error } = await supabase
      .from("saved_items")
      .insert({ user_id: userId, item_type: itemType, item_id: itemId });
    if (error) throw error;
  },

  async unsaveItem(userId: string, itemType: string, itemId: string) {
    const { error } = await supabase
      .from("saved_items")
      .delete()
      .eq("user_id", userId)
      .eq("item_type", itemType)
      .eq("item_id", itemId);
    if (error) throw error;
  },

  async isSaved(userId: string, itemType: string, itemId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("saved_items")
      .select("id")
      .eq("user_id", userId)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  }
};