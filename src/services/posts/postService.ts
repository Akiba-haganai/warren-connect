import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Post = Tables<"posts">;

export interface FeedPost extends Post {
  likes_count: number;
  comments_count: number;
  user_name: string;
  user_avatar: string | null;
}

import { handleSupabaseError } from "@/utils/supabaseErrorHandler";

export const postService = {
  async createPost(_user_id: string, content: string, has_image?: boolean) {
    const { data, error } = await supabase.functions.invoke("create-post", {
      body: { content, has_image },
    });
    
    if (error) {
      // Supabase Edge Functions store custom JSON errors in error.context or we can check data
      const customMessage = error.context?.json?.error || error.message;
      if (customMessage) {
         // Create a synthetic error object that handleSupabaseError can parse, or just throw it
         if (customMessage.includes("community guidelines")) {
             throw new Error("Your content violates community guidelines and cannot be posted.");
         }
         throw new Error(customMessage);
      }
      handleSupabaseError(error);
    }
    return data;
  },

  async getFeed(): Promise<FeedPost[]> {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("is_hidden", false)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!posts) return [];

    // Get unique user IDs
    const userIds = [...new Set(posts.map((p) => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map<string, Pick<Tables<"profiles">, "full_name" | "avatar_url">>();
    profiles?.forEach((p) => profileMap.set(p.id, p));

    const feed = await Promise.all(
      posts.map(async (post) => {
        const [{ count: likes }, { count: comments }] = await Promise.all([
          supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", post.id),
          supabase.from("post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
        ]);

        return {
          ...post,
          user_name: profileMap.get(post.user_id)?.full_name ?? "Unknown",
          user_avatar: profileMap.get(post.user_id)?.avatar_url ?? null,
          likes_count: likes ?? 0,
          comments_count: comments ?? 0,
        };
      })
    );

    return feed;
  },

  async deletePost(id: string) {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw error;
  },
};