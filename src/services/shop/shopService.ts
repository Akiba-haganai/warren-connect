import { supabase } from "@/lib/supabase/client";

export const shopService = {
  async createShop(ownerId: string, name: string, description?: string, logoUrl?: string) {
    const { data, error } = await supabase
      .from("shops")
      .insert({ owner_id: ownerId, name, description, logo_url: logoUrl })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getShop(shopId: string) {
    const { data, error } = await supabase
      .from("shops")
      .select("*, products(*)")
      .eq("id", shopId)
      .single();
    if (error) throw error;
    return data;
  },

  async getMyShop(ownerId: string) {
    const { data, error } = await supabase
      .from("shops")
      .select("*, products(*)")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async addCollaborator(shopId: string, userId: string, role: string = "member") {
    const { error } = await supabase
      .from("shop_collaborators")
      .insert({ shop_id: shopId, user_id: userId, role });
    if (error) throw error;
  },

  async removeCollaborator(shopId: string, userId: string) {
    const { error } = await supabase
      .from("shop_collaborators")
      .delete()
      .eq("shop_id", shopId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async addProductToShop(productId: string, shopId: string) {
    const { error } = await supabase
      .from("products")
      .update({ shop_id: shopId })
      .eq("id", productId);
    if (error) throw error;
  },

  async removeProductFromShop(productId: string) {
    const { error } = await supabase
      .from("products")
      .update({ shop_id: null })
      .eq("id", productId);
    if (error) throw error;
  }
};