import { Link } from "react-router-dom";
import { Heart, MessageCircle, Zap, Sparkles } from "lucide-react";

interface Props {
  user: any;
  isOnline: boolean;
  compatibility: number;
  isLiked: boolean;
  isMutual: boolean;
  onToggleLike: () => void;
  compatibilityBreakdown?: string[];
  disabled?: boolean;
  spotlight?: boolean;
}

export default function RoommateCard({
  user,
  isOnline,
  compatibility,
  isLiked,
  isMutual,
  onToggleLike,
  compatibilityBreakdown,
  disabled,
  spotlight,
}: Props) {
  return (
    <div
      className={`card p-3 ${spotlight ? "border-0" : ""}`}
      style={{
        background: spotlight ? "transparent" : "var(--color-surface)",
        border: spotlight ? "none" : "1px solid var(--color-border)",
      }}
    >
      {/* ---- Avatar row ---- */}
      <div className="flex items-center gap-3">
        {/* Avatar + online dot */}
        <Link to={`/user/${user.id}`} className="relative flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
              {(user.full_name?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          )}
        </Link>

        {/* Name + details */}
        <div className="flex-1 min-w-0">
          <Link to={`/user/${user.id}`} className="text-sm font-semibold block truncate" style={{ color: spotlight ? "#fff" : "var(--color-text)" }}>
            {user.full_name || user.username || "Unknown"}
          </Link>
          {user.course && (
            <p className="text-xs truncate" style={{ color: spotlight ? "rgba(255,255,255,0.8)" : "var(--color-text-secondary)" }}>
              {user.course}{user.year_of_study ? ` · Year ${user.year_of_study}` : ""}
            </p>
          )}
          {user.university && (
            <p className="text-xs truncate" style={{ color: spotlight ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)" }}>
              {user.university}
            </p>
          )}
        </div>

        {/* Like + compatibility */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {compatibility > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-xs font-bold cursor-default"
              style={{ color: spotlight ? "rgba(255,255,255,0.9)" : "var(--color-accent)" }}
              title={compatibilityBreakdown?.join(", ") || ""}
            >
              <Zap size={12} /> {compatibility}%
            </span>
          )}
          {isMutual && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold" style={{ color: "var(--color-success)" }}>
              <Sparkles size={12} /> Match!
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLike();
            }}
            disabled={disabled}
            className="p-1 rounded-full transition-opacity"
            style={{ opacity: disabled ? 0.5 : 1 }}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart
              size={18}
              fill={isLiked ? "var(--color-accent)" : "none"}
              style={{ color: isLiked ? "var(--color-accent)" : spotlight ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)" }}
            />
          </button>
          <Link
            to={`/messages?conversation=${user.id}`}
            className="p-1 rounded-full transition-opacity"
            onClick={(e) => e.stopPropagation()}
            aria-label="Message"
          >
            <MessageCircle size={16} style={{ color: spotlight ? "rgba(255,255,255,0.7)" : "var(--color-primary)" }} />
          </Link>
        </div>
      </div>

      {/* ---- Lifestyle badges (single horizontally scrollable row) ---- */}
      <div className="mt-2 flex gap-1 overflow-x-auto flex-nowrap pb-1 scrollbar-hide">
        {user.smoking_preference && user.smoking_preference !== "no-preference" && (
          <span className="badge badge-amber text-[10px] whitespace-nowrap flex-shrink-0">🚬 {user.smoking_preference}</span>
        )}
        {user.drinking_preference && user.drinking_preference !== "no-preference" && (
          <span className="badge badge-amber text-[10px] whitespace-nowrap flex-shrink-0">🍺 {user.drinking_preference}</span>
        )}
        {user.study_habit && user.study_habit !== "no-preference" && (
          <span className="badge badge-amber text-[10px] whitespace-nowrap flex-shrink-0">📚 {user.study_habit}</span>
        )}
        {user.going_out_pattern && user.going_out_pattern !== "no-preference" && (
          <span className="badge badge-amber text-[10px] whitespace-nowrap flex-shrink-0">🌙 {user.going_out_pattern}</span>
        )}
        {user.roommate_gender_preference && user.roommate_gender_preference !== "no-preference" && (
          <span className="badge badge-amber text-[10px] whitespace-nowrap flex-shrink-0">⚤ {user.roommate_gender_preference}</span>
        )}
        {(user.roommate_budget_min || user.roommate_budget_max) && (
          <span className="badge badge-green text-[10px] whitespace-nowrap flex-shrink-0">
            K{user.roommate_budget_min || 0} – K{user.roommate_budget_max || "∞"}
          </span>
        )}
        {user.privacy_needed && (
          <span className="badge badge-amber text-[10px] whitespace-nowrap flex-shrink-0">🔒 Occasional privacy needed</span>
        )}
      </div>

      {/* ---- Free‑text preferences (truncated to 1 line) ---- */}
      {user.roommate_preferences && (
        <p className="text-xs mt-1.5 line-clamp-1 italic" style={{ color: spotlight ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)" }}>
          "{user.roommate_preferences}"
        </p>
      )}
    </div>
  );
}
