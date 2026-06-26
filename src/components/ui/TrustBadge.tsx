import { ShieldCheck, Star, MessageCircle, Clock } from "lucide-react";

interface Props {
  isVerified: boolean;
  reviewCount: number;
  avgRating: number;
  responseRate?: number;
  joinedDate: string;
}

export default function TrustBadges({ isVerified, reviewCount, avgRating, responseRate, joinedDate }: Props) {
  const memberSince = new Date(joinedDate);
  const monthsActive = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24 * 30));

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {isVerified && (
        <span className="badge badge-amber flex items-center gap-1">
          <ShieldCheck size={12} /> Verified
        </span>
      )}
      {reviewCount > 0 && (
        <span className="badge badge-green flex items-center gap-1">
          <Star size={12} /> {avgRating} ({reviewCount})
        </span>
      )}
      {responseRate !== undefined && responseRate > 0 && (
        <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1">
          <MessageCircle size={12} /> Responds quickly
        </span>
      )}
      {monthsActive > 6 && (
        <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1">
          <Clock size={12} /> {monthsActive} months active
        </span>
      )}
    </div>
  );
}