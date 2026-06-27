import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, Loader2, Flag, Minus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { likeService } from "@/services/posts/likeService";
import { commentService } from "@/services/posts/commentService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import { reportService } from "@/services/reports/reportService";
import { tagService } from "@/services/tags/tagService";                // ✅ new
import type { FeedPost } from "@/services/posts/postService";
import type { Tables } from "@/types/database/database.types";
import CommentItem from "@/features/feed/components/CommentItem";

type Profile = Tables<"profiles">;

export default function PostCard({ post }: { post: FeedPost }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();

  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);                     // ✅ new

  // Fetch tags for this post
  useEffect(() => {
    tagService.getTagsForPost(post.id).then(setTags);
  }, [post.id]);

  // Fetch comments with profiles
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const comments = await commentService.getComments(post.id);
      if (!comments.length) return [];

      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map<string, Pick<Profile, "full_name" | "avatar_url">>();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      return comments.map((comment) => ({
        ...comment,
        profile: profileMap.get(comment.user_id) || null,
      }));
    },
    enabled: showComments,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (liked) {
        await likeService.unlikePost(post.id, user.id);
      } else {
        await likeService.likePost(post.id, user.id);
      }
    },
    onSuccess: () => {
      setLiked(!liked);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      if (!liked && post.user_id !== user?.id) {
        triggerNotification.like(post.user_id, post.id, profile?.full_name ?? "Someone");
      }
    },
  });

  // Add comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Not logged in");
      await commentService.createComment(post.id, user.id, content);
    },
    onSuccess: (_data, content) => {
      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      setNewComment("");
      if (user && post.user_id !== user.id) {
        triggerNotification.comment(
          post.user_id,
          post.id,
          profile?.full_name ?? "Someone",
          content
        );
      }
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment.trim());
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      await commentService.deleteComment(commentId, user.id);
      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (err) {
      console.error("Delete comment failed:", err);
    }
  };

  const handleReport = async () => {
    if (!user) return;
    const reason = prompt("Why are you reporting this post?");
    if (reason) {
      try {
        await reportService.submitReport(user.id, "post", post.id, reason);
        alert("Report submitted. Thank you.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="card p-4" role="article" aria-label={`Post by ${post.user_name}`}>
      {/* Poster info */}
      <div className="flex items-center gap-2 mb-3">
        <Link to={`/user/${post.user_id}`} aria-label={`View ${post.user_name}'s profile`}>
          {post.user_avatar ? (
            <img src={post.user_avatar} alt={`${post.user_name}'s avatar`} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: "var(--color-primary)" }}
              aria-label={`${post.user_name}'s avatar`}
            >
              {(post.user_name?.[0] ?? "?").toUpperCase()}
            </div>
          )}
        </Link>
        <Link
          to={`/user/${post.user_id}`}
          className="text-xs font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          {post.user_name}
        </Link>
      </div>

      {/* Post content */}
      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
        {post.content}
      </p>
      {post.image_url && (
        <img
          src={post.image_url}
          alt="Post image"
          className="mt-3 rounded-xl w-full object-cover max-h-80"
          loading="lazy"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span>
          {new Date(post.created_at!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
        <button
          onClick={() => likeMutation.mutate()}
          className="flex items-center gap-1"
          style={{ color: liked ? "var(--color-accent)" : undefined }}
          aria-label={liked ? "Unlike post" : "Like post"}
        >
          <Heart size={16} fill={liked ? "var(--color-accent)" : "none"} /> {post.likes_count}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1"
          aria-label="Toggle comments"
        >
          <MessageCircle size={16} /> {post.comments_count}
        </button>
        <button onClick={handleReport} className="flex items-center gap-1" aria-label="Report post">
          <Flag size={14} /> Report
        </button>
      </div>

      {/* ===== TAGS ===== */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              to={`/tag/${tag}`}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--color-accent-light)",
                color: "var(--color-primary)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Comments section with grabber bar */}
      {showComments && (
        <div className="mt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          {/* Drag/grabber bar – tap to close */}
          <button
            onClick={() => setShowComments(false)}
            className="w-full flex justify-center py-2"
            aria-label="Close comments"
          >
            <Minus size={24} style={{ color: "var(--color-border)" }} strokeWidth={3} />
          </button>

          {commentsLoading ? (
            <div className="flex justify-center pb-4">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="max-h-48 overflow-y-auto pb-2">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  profile={(comment as any).profile}
                  isOwn={comment.user_id === user?.id}
                  onDelete={() => handleDeleteComment(comment.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs py-2 text-center" style={{ color: "var(--color-text-muted)" }}>
              No comments yet — be the first!
            </p>
          )}

          {user && (
            <form onSubmit={handleCommentSubmit} className="flex gap-2 pb-2">
              <input
                className="input-field flex-1 py-1.5 text-xs"
                placeholder="Write a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                aria-label="Write a comment"
              />
              <button
                type="submit"
                disabled={commentMutation.isPending || !newComment.trim()}
                className="flex items-center justify-center rounded-xl px-3"
                style={{
                  background: newComment.trim() ? "var(--color-primary)" : "var(--color-border)",
                  color: newComment.trim() ? "#fff" : "var(--color-text-muted)",
                  minWidth: 36,
                }}
                aria-label="Submit comment"
              >
                {commentMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}