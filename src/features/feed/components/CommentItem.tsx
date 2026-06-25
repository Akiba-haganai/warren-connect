import type { Tables } from "@/types/database/database.types";

type Comment = Tables<"post_comments">;
type Profile = Tables<"profiles">;

interface Props {
  comment: Comment;
  profile?: Pick<Profile, "full_name" | "avatar_url"> | null;
  isOwn: boolean;
  onDelete?: () => void;
}

export default function CommentItem({ comment, profile, isOwn, onDelete }: Props) {
  const displayName = profile?.full_name || comment.user_id.slice(0, 8) + "…";
  const avatarLetter = displayName[0]?.toUpperCase() || "?";

  return (
    <div className="flex items-start gap-2 py-2">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={displayName}
          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "var(--color-primary)" }}
        >
          {avatarLetter}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
            {displayName}
          </p>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            {comment.created_at
              ? new Date(comment.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap" style={{ color: "var(--color-text-secondary)" }}>
          {comment.content}
        </p>
        {isOwn && (
          <button
            onClick={onDelete}
            className="text-[10px] mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}