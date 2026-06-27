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
    <Link
      to={`/user/${user.id}`}
      className="card p-4"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar + online dot */}
        <div className="relative">
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
            <p className="font-semibold text-sm">{user.full_name || user.username || "Unknown"}</p>
            {compatibility > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color: "var(--color-accent)" }}>
                <Zap size={12} /> {compatibility}%
              </span>
            )}
          </div>
          {user.course && (
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {user.course}{user.year_of_study ? ` · Year ${user.year_of_study}` : ""}
            </p>
          )}
          {user.university && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{user.university}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isMutual && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color: "var(--color-success)" }}>
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
          <MessageCircle size={16} style={{ color: "var(--color-primary)" }} />
        </div>
      </div>

      {/* Preference chips */}
      <div className="flex flex-wrap gap-1 mt-3">
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
      </div>
      {user.roommate_preferences && (
        <p className="text-xs mt-2 italic" style={{ color: "var(--color-text-muted)" }}>
          "{user.roommate_preferences}"
        </p>
      )}
    </Link>
  );
}