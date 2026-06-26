import { supabase } from "@/lib/supabase/client";

export const commentLikeService = {
  async likeComment(commentId: string, userId: string) {
    const { error } = await supabase
      .from("comment_likes")
      .upsert(
        { comment_id: commentId, user_id: userId },
        { onConflict: "comment_id,user_id", ignoreDuplicates: true }
      );
    if (error) throw error;
  },

  async unlikeComment(commentId: string, userId: string) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async getLikeCount(commentId: string): Promise<number> {
    const { count, error } = await supabase
      .from("comment_likes")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", commentId);
    if (error) return 0;
    return count ?? 0;
  },

  async hasUserLiked(commentId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  },
};