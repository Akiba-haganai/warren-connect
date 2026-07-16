import { supabase } from "@/lib/supabase/client";

export interface SellerStats {
  completedSales: number;
  avgResponseMinutes: number;
  avgRating: number;
  disputeRate: number;
  accountAgeDays: number;
}

export function computeReputationScore(stats: SellerStats): number {
  const salesScore = Math.min(stats.completedSales / 50, 1) * 30;
  const responseScore = Math.max(0, 1 - stats.avgResponseMinutes / 720) * 20;
  const ratingScore = (stats.avgRating / 5) * 30;
  const disputePenalty = stats.disputeRate * 40;
  const ageScore = Math.min(stats.accountAgeDays / 365, 1) * 20;

  return Math.max(
    0,
    Math.round(salesScore + responseScore + ratingScore + ageScore - disputePenalty)
  );
}

export function reputationBadge(score: number): string | null {
  if (score >= 80) return "Top Seller";
  if (score >= 60) return "Trusted Seller";
  if (score >= 40) return "Established Seller";
  return null;
}

export const reputationEngine = {
  async recalculateForUser(userId: string) {
    const [
      { count: completedSales },
      { data: profile },
      { data: reviews },
      { count: disputes },
      { data: userData },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "sold"),
      supabase
        .from("profiles")
        .select(
          "response_count, total_response_time_ms, avg_rating, created_at"
        )
        .eq("id", userId)
        .single(),
      supabase
        .from("reviews")
        .select("rating")
        .eq("reviewed_user_id", userId),
      supabase
        .from("escrow_transactions")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "disputed"),
      supabase
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .single(),
    ]);

    const totalReviews = reviews?.length || 0;
    const avgRating =
      totalReviews > 0
        ? (reviews || []).reduce((s, r) => s + r.rating, 0) / totalReviews
        : 0;

    const avgResponseMs =
      profile?.response_count
        ? (profile.total_response_time_ms || 0) / profile.response_count
        : 0;
    const avgResponseMinutes = avgResponseMs / 60000;

    const disputeRate =
      (completedSales ?? 0) > 0 ? (disputes ?? 0) / (completedSales ?? 1) : 0;

    const accountAgeDays = userData?.created_at
      ? Math.floor(
          (Date.now() - new Date(userData.created_at).getTime()) / 86400000
        )
      : 0;

    const stats: SellerStats = {
      completedSales: completedSales ?? 0,
      avgResponseMinutes,
      avgRating,
      disputeRate,
      accountAgeDays,
    };

    const score = computeReputationScore(stats);
    const badge = reputationBadge(score);

    const { error } = await supabase
      .from("reputation_scores")
      .upsert({
        user_id: userId,
        score,
        badge,
        completed_sales: stats.completedSales,
        avg_response_minutes: stats.avgResponseMinutes,
        avg_rating: stats.avgRating,
        dispute_rate: stats.disputeRate,
        account_age_days: stats.accountAgeDays,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return { score, badge };
  },
};

