import { supabase } from "@/lib/supabase/client";

export interface UnifiedFeedItem {
  id: string;
  type: "post" | "product" | "accommodation";
  created_at: string;
  featured: boolean;
  data: any;
}

export const unifiedFeedService = {
  async getUnifiedFeed(limit = 50, userId?: string): Promise<UnifiedFeedItem[]> {
    const [postsRes, productsRes, accRes] = await Promise.all([
      supabase.rpc("get_feed_with_stats", {
        caller_id: userId || null,
        page_limit: limit,
        page_offset: 0
      }),
      supabase
        .from("products")
        .select("*")
        .eq("is_hidden", false)
        .neq("moderation_status", "rejected")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("accommodations")
        .select("*")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const posts = postsRes.data || [];
    const products = productsRes.data || [];
    const accommodations = accRes.data || [];

    // Fetch profiles for all post authors
    const userIds = [...new Set(posts.map((p) => p.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
      : { data: [] };
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const postItems: UnifiedFeedItem[] = posts.map((p) => ({
      id: p.id,
      type: "post",
      created_at: p.created_at!,
      featured: p.featured ?? false,
      data: {
        ...p,
        user_name: profileMap.get(p.user_id)?.full_name ?? "Student",
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

    // 1. Separate featured items (they always stay at the top, sorted by date)
    const featuredItems = [...postItems, ...productItems, ...accItems].filter((item) => item.featured);
    featuredItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 2. Non-featured items: Smart Interleave
    const regularPosts = postItems.filter((i) => !i.featured);
    const regularProducts = productItems.filter((i) => !i.featured);
    const regularAccs = accItems.filter((i) => !i.featured);

    const interleaved: UnifiedFeedItem[] = [];
    let pIdx = 0;
    let prodIdx = 0;
    let accIdx = 0;

    // Pattern: 2 posts -> 2 products -> 1 accommodation (balanced campus mix)
    while (
      pIdx < regularPosts.length ||
      prodIdx < regularProducts.length ||
      accIdx < regularAccs.length
    ) {
      if (pIdx < regularPosts.length) interleaved.push(regularPosts[pIdx++]);
      if (pIdx < regularPosts.length) interleaved.push(regularPosts[pIdx++]);
      if (prodIdx < regularProducts.length) interleaved.push(regularProducts[prodIdx++]);
      if (prodIdx < regularProducts.length) interleaved.push(regularProducts[prodIdx++]);
      if (accIdx < regularAccs.length) interleaved.push(regularAccs[accIdx++]);
    }

    const result = [...featuredItems, ...interleaved];
    return result.slice(0, limit);
  },
};