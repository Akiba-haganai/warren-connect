import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Send, Loader2, Flag, Minus, Share2, MoreVertical, Trash2 } from "lucide-react";
import { shareToWhatsApp } from "@/utils/whatsappShare";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { likeService } from "@/services/posts/likeService";
import { commentService } from "@/services/posts/commentService";
import { postService, type FeedPost } from "@/services/posts/postService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import { reportService } from "@/services/reports/reportService";
import { tagService } from "@/services/tags/tagService";
import CommentItem from "@/features/feed/components/CommentItem";
import ImageLightbox from "@/components/shared/ImageLightbox";
import { triggerHaptic } from "@/utils/haptic";
import toast from "react-hot-toast";

interface PostCardProps {
  post: FeedPost;
  isDetailView?: boolean;
}

export default function PostCard({ post, isDetailView = false }: PostCardProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [liked, setLiked] = useState(post.is_liked ?? false);

  useEffect(() => {
    if (post.is_liked !== undefined) {
      setLiked(post.is_liked);
    }
  }, [post.is_liked]);

  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch tags for this post
  useEffect(() => {
    tagService.getTagsForPost(post.id).then(setTags);
  }, [post.id]);

  const requireAuth = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return false;
    }
    return true;
  };

  const handleDeletePost = async () => {
    if (!requireAuth()) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    triggerHaptic();
    try {
      await postService.deletePost(post.id);
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete post");
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  // Fetch comments with profiles
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const comments = await commentService.getComments(post.id);
      if (!comments.length) return [];

      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

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
      if (!requireAuth()) return;
      triggerHaptic();
      if (liked) {
        await likeService.unlikePost(post.id, user!.id);
      } else {
        await likeService.likePost(post.id, user!.id);
      }
    },
    onSuccess: () => {
      if (!user) return; // Prevent onSuccess if requireAuth returned early
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
      if (!requireAuth()) throw new Error("Not logged in");
      await commentService.createComment(post.id, user!.id, content);
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
    if (!requireAuth()) return;
    if (!newComment.trim()) return;
    commentMutation.mutate(newComment.trim());
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!requireAuth()) return;
    try {
      await commentService.deleteComment(commentId, user!.id);
      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (err) {
      console.error("Delete comment failed:", err);
    }
  };

  const handleReport = async () => {
    if (!requireAuth()) return;
    const reason = prompt("Why are you reporting this post?");
    if (reason) {
      try {
        await reportService.submitReport(user!.id, "post", post.id, reason);
        alert("Report submitted. Thank you.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div
      className={`card p-4 transition-colors ${
        !isDetailView ? "cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/40 select-none" : ""
      }`}
      role="article"
      aria-label={`Post by ${post.user_name}`}
      onClick={() => {
        if (!isDetailView) {
          navigate(`/post/${post.id}`);
        }
      }}
    >
      {/* Poster info & Options Menu */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Link
            to={`/user/${post.user_id}`}
            aria-label={`View ${post.user_name}'s profile`}
            onClick={(e) => e.stopPropagation()}
          >
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
            className="text-xs font-semibold hover:underline"
            style={{ color: "var(--color-text)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {post.user_name}
          </Link>
        </div>

        {/* 3-Dot Menu for Post Owner */}
        {user?.id === post.user_id && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Post options"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-7 z-30 min-w-[130px] bg-surface border border-border rounded-xl shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    <span>Delete post</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Post content */}
      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
        {post.content}
      </p>
      
      {(post as any).moderation_status === "pending" ? (
        <div className="mt-3 rounded-xl w-full h-40 flex flex-col items-center justify-center text-center" style={{ background: "var(--color-bg)", border: "1px dashed var(--color-border)" }}>
          <Loader2 className="animate-spin mb-2" size={24} style={{ color: "var(--color-text-muted)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Scanning image...</span>
        </div>
      ) : post.image_url ? (
        <>
          <div
            className="mt-3 rounded-xl overflow-hidden cursor-pointer relative group"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            title="Tap to view full image"
          >
            <img
              src={post.image_url}
              alt="Post image"
              className="w-full object-cover max-h-80 group-hover:opacity-95 transition-opacity"
              loading="lazy"
            />
          </div>
          <ImageLightbox
            isOpen={lightboxOpen}
            imageUrl={post.image_url}
            altText={post.content.slice(0, 50) || "Post image"}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span>
          {new Date(post.created_at!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            likeMutation.mutate();
          }}
          className="flex items-center gap-1 cursor-pointer"
          style={{ color: liked ? "var(--color-accent)" : undefined }}
          aria-label={liked ? "Unlike post" : "Like post"}
        >
          <Heart size={16} fill={liked ? "var(--color-accent)" : "none"} /> {post.likes_count}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isDetailView) {
              navigate(`/post/${post.id}`);
            } else {
              setShowComments(!showComments);
            }
          }}
          className="flex items-center gap-1 cursor-pointer"
          aria-label="View comments"
        >
          <MessageCircle size={16} /> {post.comments_count}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReport();
          }}
          className="flex items-center gap-1 cursor-pointer"
          aria-label="Report post"
        >
          <Flag size={14} /> Report
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            shareToWhatsApp({
              title: post.content.slice(0, 80),
              type: "post",
              id: post.id,
            });
          }}
          className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:opacity-80 transition-opacity ml-auto cursor-pointer"
          aria-label="Share to WhatsApp"
        >
          <Share2 size={13} /> Share
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