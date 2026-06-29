import { supabase } from "@/lib/supabase/client";

export const shopReviewService = {
  async createReview(reviewerId: string, shopId: string, rating: number, comment?: string) {
    const { data, error } = await supabase
      .from("shop_reviews")
      .insert({ reviewer_id: reviewerId, shop_id: shopId, rating, comment })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  // services/shop/shopReviewService.ts
async deleteReview(reviewId: string, userId: string) {
  const { error } = await supabase
    .from("shop_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("reviewer_id", userId); // only reviewer can delete
  if (error) throw error;
},

  async getReviews(shopId: string) {
    const { data, error } = await supabase
      .from("shop_reviews")
      .select("*, reviewer:profiles!shop_reviews_reviewer_id_fkey(full_name, avatar_url)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAverageRating(shopId: string): Promise<number> {
    const { data, error } = await supabase
      .from("shop_reviews")
      .select("rating")
      .eq("shop_id", shopId);
    if (error || !data?.length) return 0;
    const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
    return Math.round(avg * 10) / 10;
  },
};