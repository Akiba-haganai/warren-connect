import { useState, useEffect } from "react";
import { Heart, MessageCircle, Send, X, Share2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { triggerHaptic } from "@/utils/haptic";
import toast from "react-hot-toast";

interface ItemSocialBarProps {
  itemId: string;
  type: "product" | "accommodation";
  onShare: () => void;
  getStats: (id: string, userId?: string) => Promise<{ likes_count: number; comments_count: number; is_liked: boolean }>;
  toggleLike: (id: string, userId: string, isCurrentlyLiked: boolean) => Promise<void>;
  getComments: (id: string) => Promise<any[]>;
  createComment: (id: string, userId: string, content: string) => Promise<any>;
  onCommentAdded?: () => void;
  requireAuth: () => boolean;
}

export default function ItemSocialBar({
  itemId, type, onShare, getStats, toggleLike, getComments, createComment, onCommentAdded, requireAuth
}: ItemSocialBarProps) {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const { data: stats } = useQuery({
    queryKey: [`${type}-stats`, itemId, user?.id],
    queryFn: () => getStats(itemId, user?.id),
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: [`${type}-comments`, itemId],
    queryFn: () => getComments(itemId),
    enabled: showComments,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!requireAuth()) throw new Error("Not auth");
      if (!stats) return;
      triggerHaptic();
      await toggleLike(itemId, user!.id, stats.is_liked);
    },
    onMutate: async () => {
      if (!stats) return;
      await queryClient.cancelQueries({ queryKey: [`${type}-stats`, itemId, user?.id] });
      const prevStats = queryClient.getQueryData([`${type}-stats`, itemId, user?.id]);
      queryClient.setQueryData([`${type}-stats`, itemId, user?.id], {
        ...stats,
        is_liked: !stats.is_liked,
        likes_count: stats.is_liked ? Math.max(0, stats.likes_count - 1) : stats.likes_count + 1
      });
      return { prevStats };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData([`${type}-stats`, itemId, user?.id], context?.prevStats);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [`${type}-stats`, itemId, user?.id] });
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!requireAuth()) throw new Error("Not auth");
      await createComment(itemId, user!.id, content);
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: [`${type}-comments`, itemId] });
      queryClient.invalidateQueries({ queryKey: [`${type}-stats`, itemId, user?.id] });
      if (onCommentAdded) onCommentAdded();
    }
  });

  const handleLike = () => {
    if (!requireAuth()) return;
    likeMutation.mutate();
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || commentMutation.isPending) return;
    commentMutation.mutate(newComment.trim());
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] z-40">
        <div className="flex items-center justify-around p-3 max-w-lg mx-auto">
          <button onClick={handleLike} className="flex items-center gap-2 p-2" style={{ color: stats?.is_liked ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
            <Heart size={22} fill={stats?.is_liked ? "var(--color-accent)" : "none"} />
            <span className="text-sm font-medium">{stats?.likes_count || 0}</span>
          </button>
          
          <button onClick={() => setShowComments(true)} className="flex items-center gap-2 p-2" style={{ color: "var(--color-text-secondary)" }}>
            <MessageCircle size={22} />
            <span className="text-sm font-medium">{stats?.comments_count || 0}</span>
          </button>

          <button onClick={onShare} className="flex items-center gap-2 p-2" style={{ color: "var(--color-text-secondary)" }}>
            <Share2 size={22} />
          </button>
        </div>
      </div>

      {showComments && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm" onClick={() => setShowComments(false)}>
          <div 
            className="mt-auto h-[75vh] bg-surface rounded-t-3xl flex flex-col shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-lg">Comments</h3>
              <button onClick={() => setShowComments(false)} className="p-2 rounded-full bg-border/50">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {commentsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent" size={24} /></div>
              ) : comments?.length === 0 ? (
                <div className="text-center text-text-secondary py-10">No comments yet. Be the first!</div>
              ) : (
                comments?.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.profiles?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=guest"} alt="Avatar" className="w-8 h-8 rounded-full bg-border object-cover" />
                    <div className="bg-bg p-3 rounded-2xl rounded-tl-none text-sm flex-1">
                      <span className="font-bold block mb-1">{c.profiles?.full_name || "Unknown"}</span>
                      <p className="whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={submitComment} className="p-4 border-t border-border bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-2 items-end">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 input-primary resize-none min-h-[44px] max-h-32 py-3 rounded-2xl"
                rows={1}
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment(e as any);
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={!newComment.trim() || commentMutation.isPending}
                className="p-3 bg-accent text-white rounded-full flex-shrink-0 disabled:opacity-50"
              >
                {commentMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
