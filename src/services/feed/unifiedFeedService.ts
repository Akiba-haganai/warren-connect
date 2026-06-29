import { supabase } from "@/lib/supabase/client";

export interface UnifiedFeedItem {
  id: string;
  type: "post" | "product" | "accommodation";
  created_at: string;
  featured: boolean;
  data: any;
}

export const unifiedFeedService = {
  async getUnifiedFeed(limit = 30): Promise<UnifiedFeedItem[]> {
    const [postsRes, productsRes, accRes] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("products").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("accommodations").select("*").order("created_at", { ascending: false }).limit(limit),
    ]);

    const posts = postsRes.data || [];
    const products = productsRes.data || [];
    const accommodations = accRes.data || [];

    // Fetch profiles for all post authors
    const userIds = [...new Set(posts.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const postItems: UnifiedFeedItem[] = posts.map((p) => ({
      id: p.id,
      type: "post",
      created_at: p.created_at!,
      featured: p.featured ?? false,
      data: {
        ...p,
        user_name: profileMap.get(p.user_id)?.full_name ?? "Unknown",
        user_avatar: profileMap.get(p.user_id)?.avatar_url ?? null,
      },
    }));

    const productItems: UnifiedFeedItem[] = products.map((p) => ({
      id: p.id,
      type: "product",
      created_at: p.created_at!,
      featured: p.featured ?? false,
      data: p,
    }));

    const accItems: UnifiedFeedItem[] = accommodations.map((a) => ({
      id: a.id,
      type: "accommodation",
      created_at: a.created_at!,
      featured: a.featured ?? false,
      data: a,
    }));

    const all = [...postItems, ...productItems, ...accItems];
    all.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return all.slice(0, limit);
  },
};