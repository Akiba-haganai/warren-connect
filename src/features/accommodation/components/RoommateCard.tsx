import { Link } from "react-router-dom";
import { Heart, MessageCircle, Zap, Sparkles } from "lucide-react";

interface Props {
  user: any;
  isOnline: boolean;
  compatibility: number;
  isLiked: boolean;
  isMutual: boolean;
  onToggleLike: () => void;
}

export default function RoommateCard({
  user,
  isOnline,
  compatibility,
  isLiked,
  isMutual,
  onToggleLike,
}: Props) {
  return (
    <div className="card p-4 flex items-center gap-4 relative" style={{ color: "inherit" }}>
      <div className="relative flex-shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold">
            {(user.full_name?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/user/${user.id}`}
            className="font-semibold text-sm block truncate"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {user.full_name || user.username || "Unknown"}
          </Link>
          {compatibility > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color: "var(--color-accent)" }}>
              <Zap size={12} /> {compatibility}%
            </span>
          )}
        </div>
        {user.course && (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {user.course}
            {user.year_of_study ? ` · Year ${user.year_of_study}` : ""}
          </p>
        )}
        {user.university && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {user.university}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isMutual && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-bold"
            style={{ color: "var(--color-success)" }}
          >
            <Sparkles size={12} /> Match!
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleLike();
          }}
          className="p-1"
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <Heart
            size={18}
            fill={isLiked ? "var(--color-accent)" : "none"}
            style={{ color: isLiked ? "var(--color-accent)" : "var(--color-text-muted)" }}
          />
        </button>
        <Link to={`/user/${user.id}`} className="p-1" aria-label="Message">
          <MessageCircle size={16} style={{ color: "var(--color-primary)" }} />
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 mt-3 w-full">
        {user.smoking_preference && user.smoking_preference !== "no-preference" && (
          <span className="badge badge-amber text-[10px]">🚬 {user.smoking_preference}</span>
        )}
        {user.drinking_preference && user.drinking_preference !== "no-preference" && (
          <span className="badge badge-amber text-[10px]">🍺 {user.drinking_preference}</span>
        )}
        {user.study_habit && user.study_habit !== "no-preference" && (
          <span className="badge badge-amber text-[10px]">📚 {user.study_habit}</span>
        )}
        {user.going_out_pattern && user.going_out_pattern !== "no-preference" && (
          <span className="badge badge-amber text-[10px]">🌙 {user.going_out_pattern}</span>
        )}
        {user.roommate_gender_preference && user.roommate_gender_preference !== "no-preference" && (
          <span className="badge badge-amber text-[10px]">⚤ {user.roommate_gender_preference}</span>
        )}
        {(user.roommate_budget_min || user.roommate_budget_max) && (
          <span className="badge badge-green text-[10px]">
            K{user.roommate_budget_min || 0} – K{user.roommate_budget_max || "∞"}
          </span>
        )}
        {user.privacy_needed && (
          <span className="badge badge-amber text-[10px]">🔒 Occasional privacy needed</span>
        )}
      </div>

      {user.roommate_preferences && (
        <p className="text-xs mt-2 italic" style={{ color: "var(--color-text-muted)" }}>
          "{user.roommate_preferences}"
        </p>
      )}
    </div>
  );
}
