import { supabase } from "@/lib/supabase/client";
import { blockService } from "@/services/safety/blockService";

export type FeedType = "all" | "post" | "product" | "accommodation";

export interface UnifiedFeedItem {
  id: string;
  type: "post" | "product" | "accommodation";
  created_at: string;
  featured: boolean;
  data: any;
}

export interface FeedCursorParams {
  limit?: number;
  userId?: string;
  feedType?: FeedType;
  tag?: string;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
}

export interface FeedResponse {
  items: UnifiedFeedItem[];
  nextCursor: {
    cursorCreatedAt: string;
    cursorId: string;
  } | null;
}

export const unifiedFeedService = {
  /**
   * Primary cursor-based unified feed fetcher with server-side filtering
   */
  async getUnifiedFeedCursor({
    limit = 20,
    userId,
    feedType = "all",
    tag,
    cursorCreatedAt = null,
    cursorId = null,
  }: FeedCursorParams): Promise<FeedResponse> {
    try {
      // 1. Attempt high-performance RPC
      const { data, error } = await (supabase.rpc as any)("get_unified_feed_cursor", {
        caller_id: userId || null,
        feed_type: feedType,
        filter_tag: tag || null,
        cursor_created_at: cursorCreatedAt || null,
        cursor_id: cursorId || null,
        page_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        const items: UnifiedFeedItem[] = data.map((row: any) => ({
          id: row.id,
          type: row.type,
          created_at: row.created_at,
          featured: Boolean(row.featured),
          data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
        }));

        const lastItem = items.length >= limit ? items[items.length - 1] : null;
        return {
          items,
          nextCursor: lastItem
            ? {
                cursorCreatedAt: lastItem.created_at,
                cursorId: lastItem.id,
              }
            : null,
        };
      }

      if (error) {
        console.warn("RPC get_unified_feed_cursor not available or failed, using fallback:", error.message);
      }
    } catch (err) {
      console.warn("RPC error, falling back to query engine:", err);
    }

    // 2. Resilient Fallback (works on standard tables without new RPC)
    return this.getFallbackCursorFeed({
      limit,
      userId,
      feedType,
      tag,
      cursorCreatedAt,
      cursorId,
    });
  },

  /**
   * Resilient fallback query engine
   */
  async getFallbackCursorFeed({
    limit = 20,
    userId,
    feedType = "all",
    tag,
    cursorCreatedAt,
  }: FeedCursorParams): Promise<FeedResponse> {
    const mutedUserIds = userId ? await blockService.getMutedUsers(userId).catch(() => []) : [];

    const fetchPosts = feedType === "all" || feedType === "post";
    const fetchProducts = feedType === "all" || feedType === "product";
    const fetchAccommodations = feedType === "all" || feedType === "accommodation";

    const promises: PromiseLike<any>[] = [];

    // Posts Query
    if (fetchPosts) {
      let query = supabase
        .from("posts")
        .select("*")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cursorCreatedAt) {
        query = query.lt("created_at", cursorCreatedAt);
      }
      promises.push(query);
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    // Products Query
    if (fetchProducts) {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_hidden", false)
        .neq("moderation_status", "rejected")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cursorCreatedAt) {
        query = query.lt("created_at", cursorCreatedAt);
      }
      promises.push(query);
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    // Accommodations Query
    if (fetchAccommodations) {
      let query = supabase
        .from("accommodations")
        .select("*")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cursorCreatedAt) {
        query = query.lt("created_at", cursorCreatedAt);
      }
      promises.push(query);
    } else {
      promises.push(Promise.resolve({ data: [] }));
    }

    const [postsRes, productsRes, accRes] = await Promise.all(promises);

    let rawPosts = (postsRes.data || []).filter((p: any) => !mutedUserIds.includes(p.user_id));
    let rawProducts = (productsRes.data || []).filter((p: any) => !mutedUserIds.includes(p.seller_id));
    let rawAccs = (accRes.data || []).filter((a: any) => !mutedUserIds.includes(a.owner_id));

    // Tag filtering in fallback
    if (tag) {
      rawProducts = rawProducts.filter((p: any) => Array.isArray(p.tags) && p.tags.includes(tag));
      rawAccs = rawAccs.filter((a: any) => Array.isArray(a.tags) && a.tags.includes(tag));
    }

    // Fetch profiles for posts
    const postUserIds: string[] = Array.from(new Set(rawPosts.map((p: any) => String(p.user_id))));
    const { data: profiles } = postUserIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, avatar_url, is_verified").in("id", postUserIds)
      : { data: [] };
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const postItems: UnifiedFeedItem[] = rawPosts.map((p: any) => ({
      id: p.id,
      type: "post",
      created_at: p.created_at!,
      featured: p.featured ?? false,
      data: {
        ...p,
        user_name: profileMap.get(p.user_id)?.full_name ?? "Student",
        user_avatar: profileMap.get(p.user_id)?.avatar_url ?? null,
        is_verified: profileMap.get(p.user_id)?.is_verified ?? false,
      },
    }));

    const productItems: UnifiedFeedItem[] = rawProducts.map((p: any) => ({
      id: p.id,
      type: "product",
      created_at: p.created_at!,
      featured: p.featured ?? false,
      data: p,
    }));

    const accItems: UnifiedFeedItem[] = rawAccs.map((a: any) => ({
      id: a.id,
      type: "accommodation",
      created_at: a.created_at!,
      featured: a.featured ?? false,
      data: a,
    }));

    const allItems = [...postItems, ...productItems, ...accItems];
    allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const pagedItems = allItems.slice(0, limit);
    const lastItem = pagedItems.length >= limit ? pagedItems[pagedItems.length - 1] : null;

    return {
      items: pagedItems,
      nextCursor: lastItem
        ? {
            cursorCreatedAt: lastItem.created_at,
            cursorId: lastItem.id,
          }
        : null,
    };
  },

  /**
   * Backwards compatible helper
   */
  async getUnifiedFeed(limit = 20, userId?: string, _offset = 0): Promise<UnifiedFeedItem[]> {
    const res = await this.getUnifiedFeedCursor({
      limit,
      userId,
      feedType: "all",
    });
    return res.items;
  },
};