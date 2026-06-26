import { supabase } from "@/lib/supabase/client";

export const reviewService = {
  async createReview(reviewerId: string, reviewedUserId: string, rating: number, comment?: string) {
    const { data, error } = await supabase
      .from("reviews")
      .insert({ reviewer_id: reviewerId, reviewed_user_id: reviewedUserId, rating, comment })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getUserReviews(userId: string) {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)")
      .eq("reviewed_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getUserAverageRating(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("reviewed_user_id", userId);
    if (error || !data.length) return 0;
    const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
    return Math.round(avg * 10) / 10;
  },

  async deleteReview(reviewId: string) {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) throw error;
  }
};