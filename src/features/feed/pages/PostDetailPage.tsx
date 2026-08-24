import { useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postService, type FeedPost } from "@/services/posts/postService";
import { likeService } from "@/services/posts/likeService";
import { commentService } from "@/services/posts/commentService";
import { triggerNotification } from "@/services/notifications/triggerService";
import { reportService } from "@/services/reports/reportService";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { shareToWhatsApp } from "@/utils/whatsappShare";
import { triggerHaptic } from "@/utils/haptic";
import ImageLightbox from "@/components/shared/ImageLightbox";
import CommentItem from "@/features/feed/components/CommentItem";
import {
  ArrowLeft,
  Heart,
  Share2,
  Send,
  Loader2,
  Flag,
  MoreVertical,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [newComment, setNewComment] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch post details
  const { data: post, isLoading: postLoading } = useQuery<FeedPost | null>({
    queryKey: ["post", id, user?.id],
    queryFn: () => (id ? postService.getPostById(id, user?.id) : Promise.resolve(null)),
    enabled: !!id,
  });

  // Fetch comments for this post
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      if (!id) return [];
      const rawComments = await commentService.getComments(id);
      if (!rawComments.length) return [];

      const userIds = [...new Set(rawComments.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_verified")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return rawComments.map((comment) => ({
        ...comment,
        profile: profileMap.get(comment.user_id) || null,
      }));
    },
    enabled: !!id,
  });

  const requireAuth = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return false;
    }
    return true;
  };

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!requireAuth() || !post) return;
      triggerHaptic();
      if (post.is_liked) {
        await likeService.unlikePost(post.id, user!.id);
      } else {
        await likeService.likePost(post.id, user!.id);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["post", id, user?.id] });
      const previous = queryClient.getQueryData<FeedPost | null>(["post", id, user?.id]);
      if (previous) {
        queryClient.setQueryData<FeedPost | null>(["post", id, user?.id], (old) => {
          if (!old) return old;
          return {
            ...old,
            is_liked: !old.is_liked,
            likes_count: old.is_liked ? old.likes_count - 1 : old.likes_count + 1,
          };
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["post", id, user?.id], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
    },
    onSuccess: () => {
      if (post && !post.is_liked && post.user_id !== user?.id) {
        triggerNotification.like(post.user_id, post.id, profile?.full_name ?? "Someone");
      }
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!requireAuth() || !id) throw new Error("Not logged in");
      return commentService.createComment(id, user!.id, content);
    },
    onSuccess: (_data, content) => {
      triggerHaptic();
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });

      if (user && post && post.user_id !== user.id) {
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
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      queryClient.invalidateQueries({ queryKey: ["post", id] });
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
    } catch (err) {
      console.error("Delete comment failed:", err);
    }
  };

  const handleDeletePost = async () => {
    if (!requireAuth() || !post) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    triggerHaptic();
    try {
      await postService.deletePost(post.id);
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      navigate("/feed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete post");
      setIsDeleting(false);
    }
  };

  const handleReport = async () => {
    if (!requireAuth() || !post) return;
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

  if (postLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-primary" size={32} />
        <span className="text-xs text-slate-400 font-medium">Loading post...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          This post could not be found or was removed.
        </p>
        <button
          onClick={() => navigate("/feed")}
          className="btn-primary text-xs px-4 py-2 rounded-xl cursor-pointer"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-36" style={{ background: "var(--color-bg)" }}>
      {/* Mobile-First Sticky Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} style={{ color: "var(--color-text)" }} />
          </button>
          <h1 className="text-sm font-bold text-primary">Post</h1>
        </div>

        <div className="flex items-center gap-2">
          {user?.id === post.user_id && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Post options"
              >
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 z-50 min-w-[140px] bg-surface border border-border rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100">
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

          <button
            type="button"
            onClick={() => {
              shareToWhatsApp({
                title: post.content.slice(0, 80),
                type: "post",
                id: post.id,
              });
            }}
            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity cursor-pointer"
            aria-label="Share post"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* Main Post Container */}
      <div className="px-4 py-4 max-w-lg mx-auto w-full">
        {/* Author Header */}
        <div className="flex items-center gap-3 mb-3">
          <Link to={`/user/${post.user_id}`} aria-label={`View ${post.user_name}'s profile`}>
            {post.user_avatar ? (
              <img
                src={post.user_avatar}
                alt={`${post.user_name}'s avatar`}
                className="w-10 h-10 rounded-full object-cover shadow-xs"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs"
                style={{ background: "var(--color-primary)" }}
              >
                {(post.user_name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </Link>
          <div>
            <Link
              to={`/user/${post.user_id}`}
              className="text-sm font-bold hover:underline"
              style={{ color: "var(--color-text)" }}
            >
              {post.user_name}
            </Link>
            <p className="text-[11px] text-slate-400">
              {new Date(post.created_at!).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Content */}
        <p className="text-base whitespace-pre-wrap leading-relaxed mb-3" style={{ color: "var(--color-text)" }}>
          {post.content}
        </p>

        {/* Image with Tap to Lightbox */}
        {post.image_url && (
          <>
            <div
              className="mt-3 mb-4 rounded-2xl overflow-hidden cursor-pointer shadow-xs border border-border"
              onClick={() => setLightboxOpen(true)}
              title="Tap to zoom"
            >
              <img
                src={post.image_url}
                alt="Post content"
                className="w-full object-cover max-h-96 hover:opacity-95 transition-opacity"
              />
            </div>
            <ImageLightbox
              isOpen={lightboxOpen}
              imageUrl={post.image_url}
              altText={post.content.slice(0, 50) || "Post image"}
              onClose={() => setLightboxOpen(false)}
            />
          </>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 py-3 border-t border-b border-border text-xs text-slate-400 mb-3">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {post.likes_count} <span className="font-normal text-slate-400">Likes</span>
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {post.comments_count} <span className="font-normal text-slate-400">Comments</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around py-1 text-sm border-b border-border pb-3 mb-4">
          <button
            onClick={() => likeMutation.mutate()}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
              post.is_liked ? "text-red-500 bg-red-50 dark:bg-red-950/30" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Heart size={18} fill={post.is_liked ? "currentColor" : "none"} />
            <span>{post.is_liked ? "Liked" : "Like"}</span>
          </button>

          <button
            onClick={handleReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
          >
            <Flag size={16} />
            <span>Report</span>
          </button>
        </div>

        {/* Comments Section */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Comments ({comments?.length || 0})
          </h2>

          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : !comments || comments.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No comments yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3">
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
          )}
        </div>
      </div>

      {/* Sticky Bottom Comment Input Bar */}
      <div
        className="fixed left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border px-4 py-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 max-w-lg mx-auto">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shrink-0">
              {(profile?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
            </div>
          )}

          <input
            className="input-field flex-1 py-2 px-3.5 text-xs rounded-full border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={user ? "Add a comment..." : "Sign in to comment"}
            value={newComment}
            disabled={!user}
            onChange={(e) => setNewComment(e.target.value)}
            aria-label="Add a comment"
          />

          <button
            type="submit"
            disabled={commentMutation.isPending || !newComment.trim() || !user}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-white disabled:opacity-40 active:scale-95 transition-transform cursor-pointer shrink-0"
            aria-label="Post comment"
          >
            {commentMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
}