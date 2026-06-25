import { supabase } from "@/lib/supabase/client";

export const commentService = {
  async createComment(postId: string, userId: string, content: string) {
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: userId, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getComments(postId: string) {
    const { data, error } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },

  async deleteComment(commentId: string, userId: string) {
    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
  },
};