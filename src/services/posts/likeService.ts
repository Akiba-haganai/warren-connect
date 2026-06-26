import { supabase } from "@/lib/supabase/client";

export const likeService = {
  async likePost(postId: string, userId: string) {
    // Upsert: insert if not exists, ignore if already liked
    const { error } = await supabase
      .from("post_likes")
      .upsert(
        { post_id: postId, user_id: userId },
        { onConflict: "post_id,user_id", ignoreDuplicates: true }
      );

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

  async getLikes(postId: string) {
    const { data, error } = await supabase
      .from("post_likes")
      .select("*")
      .eq("post_id", postId);

    if (error) throw error;
    return data;
  },
};