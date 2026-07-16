import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeReputationScore,
  reputationBadge,
  type SellerStats,
} from "./reputationEngine.ts";

type AnyRecord = Record<string, any>;

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sellers } = await supabase
    .from("products")
    .select("seller_id")
    .eq("status", "sold");

  const uniqueSellers = [
    ...new Set((sellers || []).map((s: AnyRecord) => s.seller_id)),
  ];

  for (const userId of uniqueSellers) {
    try {
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
      const avgRating = totalReviews
        ? (reviews || []).reduce(
          (sum: number, r: AnyRecord) => sum + (r.rating ?? 0),
          0
        ) / totalReviews
        : 0;

      const avgResponseMs = profile?.response_count
        ? (profile.total_response_time_ms || 0) / profile.response_count
        : 0;
      const avgResponseMinutes = avgResponseMs / 60000;

      const disputeRate = (completedSales ?? 0) > 0
        ? (disputes ?? 0) / (completedSales ?? 1)
        : 0;

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
    } catch (err) {
      console.error(`Failed for user ${userId}:`, err);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

