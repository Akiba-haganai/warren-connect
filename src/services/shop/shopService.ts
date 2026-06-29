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

  /** All shops the user can manage (owned + collaborated) */
  async getShopsForUser(userId: string) {
    const [{ data: owned, error: ownErr }, { data: collabRows, error: colErr }] =
      await Promise.all([
        supabase.from("shops").select("*").eq("owner_id", userId),
        supabase
          .from("shop_collaborators")
          .select("shop_id, shops(*)")
          .eq("user_id", userId),
      ]);

    if (ownErr) throw ownErr;
    if (colErr) throw colErr;

    const ownedShops = owned || [];
    const collabShops = (collabRows || [])
      .map((c: any) => c.shops)
      .filter(Boolean);

    const map = new Map<string, any>();
    [...ownedShops, ...collabShops].forEach((shop) => map.set(shop.id, shop));
    return Array.from(map.values());
  },

  async isCollaborator(shopId: string, userId: string) {
    const { data, error } = await supabase
      .from("shop_collaborators")
      .select("id")
      .eq("shop_id", shopId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  async getCollaborators(shopId: string) {
    const { data, error } = await supabase
      .from("shop_collaborators")
      .select("user_id, role, profiles(id, full_name, avatar_url)")
      .eq("shop_id", shopId);
    if (error) throw error;
    return (data || []) as Array<{
      user_id: string;
      role: string;
      profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    }>;
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
  },
  // services/shop/shopService.ts
async deleteProduct(productId: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) throw error;
},

  // ---------- Invite Token ----------
  async generateInviteToken(shopId: string, ownerId: string): Promise<string> {
    const { data, error } = await supabase.rpc("generate_shop_invite_token", {
      shop_id: shopId,
      owner_id: ownerId,
    });
    if (error) throw error;
    return data as string;
  },

  async verifyInviteToken(token: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("verify_shop_invite_token", { token });
    if (error) return null;
    return data as string | null;
  },
  async updateShop(shopId: string, updates: { name?: string; description?: string; logo_url?: string }) {
  const { error } = await supabase
    .from("shops")
    .update(updates)
    .eq("id", shopId);
  if (error) throw error;
},
async deleteReview(reviewId: string, userId: string) {
  const { error } = await supabase
    .from("shop_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("reviewer_id", userId); // only the reviewer can delete
  if (error) throw error;
},
   /**
   * Search shops by name, returns logo, description, and product count.
   */
  async searchShops(query: string, limit: number = 30) {
    const { data, error } = await supabase
      .from("shops")
      .select("id, name, logo_url, description, products(count)")
      .ilike("name", `%${query}%`)
      .order("name", { ascending: true })
      .limit(limit);
    if (error) throw error;
    // Transform products from an array of counts to a number
    return (data || []).map((shop: any) => ({
      ...shop,
      product_count: shop.products?.[0]?.count ?? 0,
    }));
  },
};