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
    const { data: posts, error } = await supabase.rpc("get_feed_with_stats", {
      caller_id: userId || null,
      page_limit: limit,
      page_offset: offset
    });

    if (error) throw error;
    return posts as FeedPost[] || [];
  },

  async deletePost(id: string) {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) throw error;
  },
};