export type SellerStats = {
  completedSales: number;
  avgResponseMinutes: number;
  avgRating: number;
  disputeRate: number;
  accountAgeDays: number;
};

export function computeReputationScore(stats: SellerStats): number {
  const salesScore = Math.min(stats.completedSales / 50, 1) * 30;
  const responseScore = Math.max(0, 1 - stats.avgResponseMinutes / 720) * 20;
  const ratingScore = (stats.avgRating / 5) * 30;
  const disputePenalty = stats.disputeRate * 40;
  const ageScore = Math.min(stats.accountAgeDays / 365, 1) * 20;

  return Math.max(
    0,
    Math.round(
      salesScore + responseScore + ratingScore + ageScore - disputePenalty
    )
  );
}

export function reputationBadge(score: number): string | null {
  if (score >= 80) return "Top Seller";
  if (score >= 60) return "Trusted Seller";
  if (score >= 40) return "Established Seller";
  return null;
}

