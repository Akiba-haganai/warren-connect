import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { commentLikeService } from "@/services/posts/commentLikeService";
import { useAuthStore } from "@/store/auth/authStore";
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
  const user = useAuthStore((s) => s.user);
  const displayName = profile?.full_name || comment.user_id.slice(0, 8) + "…";
  const avatarLetter = displayName[0]?.toUpperCase() || "?";

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    commentLikeService.hasUserLiked(comment.id, user.id).then(setLiked);
    commentLikeService.getLikeCount(comment.id).then(setLikeCount);
  }, [comment.id, user]);

  const handleToggleLike = async () => {
    if (!user) return;
    if (liked) {
      await commentLikeService.unlikeComment(comment.id, user.id);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await commentLikeService.likeComment(comment.id, user.id);
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  return (
    <div className="flex items-start gap-2 py-2">
      {/* Avatar – clickable */}
      <Link to={`/user/${comment.user_id}`} className="flex-shrink-0">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "var(--color-primary)" }}
          >
            {avatarLetter}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Name – clickable */}
          <Link
            to={`/user/${comment.user_id}`}
            className="text-xs font-semibold"
            style={{ color: "var(--color-text)" }}
          >
            {displayName}
          </Link>
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

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleToggleLike}
            className="flex items-center gap-1 text-xs"
            style={{ color: liked ? "var(--color-accent)" : "var(--color-text-muted)" }}
            aria-label={liked ? "Unlike comment" : "Like comment"}
          >
            <Heart size={12} fill={liked ? "var(--color-accent)" : "none"} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          {isOwn && (
            <button
              onClick={onDelete}
              className="text-[10px]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}