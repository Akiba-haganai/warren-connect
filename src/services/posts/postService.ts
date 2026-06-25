import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";

export type Post = Tables<"posts">;

export interface FeedPost extends Post {
  likes_count: number;
  comments_count: number;
  user_name: string;
  user_avatar: string | null;
}

export const postService = {
  async createPost(user_id: string, content: string, image_url?: string) {
    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id, content, image_url: image_url ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getFeed(): Promise<FeedPost[]> {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
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