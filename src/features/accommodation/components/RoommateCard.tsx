import { Link } from "react-router-dom";
import { Heart, MessageCircle, Zap, Sparkles, GraduationCap, CheckCircle2 } from "lucide-react";

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
      className={`card p-4 transition-all ${
        spotlight
          ? "bg-transparent text-white border-0"
          : "bg-surface border border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
      }`}
    >
      {/* Avatar & Header Info */}
      <div className="flex items-start gap-3">
        {/* Avatar + Online Badge */}
        <Link to={`/user/${user.id}`} className="relative flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} className="w-13 h-13 rounded-2xl object-cover border border-border" alt="" />
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-xs">
              {(user.full_name?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface rounded-full" />
          )}
        </Link>

        {/* User Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/user/${user.id}`}
              className={`text-sm font-bold truncate hover:underline ${
                spotlight ? "text-white" : "text-slate-900 dark:text-white"
              }`}
            >
              {user.full_name || user.username || "Anonymous Student"}
            </Link>
            {user.is_verified && (
              <CheckCircle2 size={14} className={spotlight ? "text-emerald-300" : "text-blue-500"} />
            )}
          </div>

          {user.course && (
            <p
              className={`text-xs font-medium truncate mt-0.5 ${
                spotlight ? "text-blue-100" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {user.course}{user.year_of_study ? ` · Year ${user.year_of_study}` : ""}
            </p>
          )}

          {user.university && (
            <p
              className={`text-xs truncate flex items-center gap-1 mt-0.5 ${
                spotlight ? "text-blue-200" : "text-slate-400 dark:text-slate-400"
              }`}
            >
              <GraduationCap size={12} className="shrink-0" />
              <span className="truncate">{user.university}</span>
            </p>
          )}
        </div>

        {/* Compatibility & Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-start">
          {compatibility > 0 && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                spotlight
                  ? "bg-white/20 text-white border-white/30 backdrop-blur-xs"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-500/20"
              }`}
              title={compatibilityBreakdown?.join(", ") || ""}
            >
              <Zap size={12} className="fill-current" /> {compatibility}%
            </span>
          )}

          {isMutual && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-xs">
              <Sparkles size={12} /> Match!
            </span>
          )}

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleLike();
            }}
            disabled={disabled}
            className={`p-2 rounded-full transition-transform active:scale-90 ${
              isLiked
                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-500"
                : spotlight
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            }`}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart
              size={16}
              className={isLiked ? "fill-rose-500 text-rose-500" : ""}
            />
          </button>

          {/* Message Button */}
          <Link
            to={`/messages?conversation=${user.id}`}
            className={`p-2 rounded-full transition-transform active:scale-90 ${
              spotlight
                ? "bg-white text-blue-700 shadow-sm"
                : "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
            }`}
            onClick={(e) => e.stopPropagation()}
            aria-label="Message"
          >
            <MessageCircle size={16} />
          </Link>
        </div>
      </div>

      {/* Lifestyle Badges */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5 flex-nowrap">
        {user.smoking_preference && user.smoking_preference !== "no-preference" && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 border ${
            spotlight ? "bg-white/15 text-white border-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border"
          }`}>
            🚬 {user.smoking_preference}
          </span>
        )}
        {user.drinking_preference && user.drinking_preference !== "no-preference" && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 border ${
            spotlight ? "bg-white/15 text-white border-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border"
          }`}>
            🍷 {user.drinking_preference}
          </span>
        )}
        {user.study_habit && user.study_habit !== "no-preference" && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 border ${
            spotlight ? "bg-white/15 text-white border-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border"
          }`}>
            📚 {user.study_habit}
          </span>
        )}
        {user.going_out_pattern && user.going_out_pattern !== "no-preference" && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium shrink-0 border ${
            spotlight ? "bg-white/15 text-white border-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border"
          }`}>
            🌙 {user.going_out_pattern}
          </span>
        )}
        {(user.roommate_budget_min || user.roommate_budget_max) && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold shrink-0 border ${
            spotlight ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-500/20"
          }`}>
            K{user.roommate_budget_min || 0} – K{user.roommate_budget_max || "∞"}
          </span>
        )}
      </div>

      {/* Free Text Preferences */}
      {user.roommate_preferences && (
        <p
          className={`text-xs mt-2 line-clamp-1 italic ${
            spotlight ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          "{user.roommate_preferences}"
        </p>
      )}
    </div>
  );
}
