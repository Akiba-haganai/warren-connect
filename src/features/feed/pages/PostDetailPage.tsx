import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { postService, type FeedPost } from "@/services/posts/postService";
import { ArrowLeft, Loader2 } from "lucide-react";
import PostCard from "@/features/feed/components/PostCard";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading } = useQuery<FeedPost | null>({
    queryKey: ["post", id],
    queryFn: async () => {
      if (!id) return null;
      const all = await postService.getFeed();
      return all.find((p) => p.id === id) ?? null;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Post not found.</p>
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs">Go back</button>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <button aria-label="post"onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
        <h1 className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>Post</h1>
      </div>

      <div className="px-4 pt-4 pb-8">
        <PostCard post={post} />
      </div>
    </div>
  );
}