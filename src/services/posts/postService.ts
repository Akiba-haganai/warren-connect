import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Post = Tables<"posts">;

export interface FeedPost extends Post {
  likes_count: number;
  comments_count: number;
  user_name: string;
  user_avatar: string | null;
  is_liked: boolean;
}

import { handleSupabaseError } from "@/utils/supabaseErrorHandler";

export const postService = {
  async createPost(_user_id: string, content: string, has_image?: boolean) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const { data, error } = await supabase.functions.invoke("create-post", {
      body: { content, has_image },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    
    if (error) {
      const customMessage = error.context?.json?.error || error.message;
      if (customMessage) {
         if (customMessage.includes("community guidelines")) {
             throw new Error("Your content violates community guidelines and cannot be posted.");
         }
         throw new Error(customMessage);
      }
      handleSupabaseError(error);
    }
    return data;
  },

  async getFeed(userId: string | undefined, limit = 100, offset = 0): Promise<FeedPost[]> {
    const { data: posts, error } = await (supabase.rpc as any)("get_feed_with_stats", {
      caller_id: userId || null,
      page_limit: limit,
      page_offset: offset
    });

    if (error) throw error;
    return (posts as unknown as FeedPost[]) || [];
  },

  async getPostById(postId: string, userId?: string): Promise<FeedPost | null> {
    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error || !post) return null;

    // Fetch author profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", post.user_id)
      .single();

    // Fetch stats
    const [{ count: likesCount }, { count: commentsCount }] = await Promise.all([
      supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", postId),
      supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", postId),
    ]);

    let isLiked = false;
    if (userId) {
      const { data: likeData } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();
      if (likeData) isLiked = true;
    }

    return {
      ...post,
      user_name: profile?.full_name ?? "Student",
      user_avatar: profile?.avatar_url ?? null,
      likes_count: likesCount ?? 0,
      comments_count: commentsCount ?? 0,
      is_liked: isLiked,
    };
  },

  async deletePost(id: string) {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw error;
  },
};