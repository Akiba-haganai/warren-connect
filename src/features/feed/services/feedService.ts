import { supabase } from "@/lib/supabase/client";

export const feedService = {
  async likePost(postId: string, userId: string) {
    const { error } = await supabase
      .from("post_likes")
      .insert({
        post_id: postId,
        user_id: userId,
      });

    if (error) throw error;
  },

  async unlikePost(postId: string, userId: string) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  async addComment(
    postId: string,
    userId: string,
    content: string
  ) {
    const { error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content,
      });

    if (error) throw error;
  },

  async getComments(postId: string) {
    const { data, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", {
        ascending: true,
      });

    if (error) throw error;

    return data;
  },
};