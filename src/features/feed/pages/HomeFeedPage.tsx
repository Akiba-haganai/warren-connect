import { useState } from "react";
import { Link } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { postService } from "@/services/posts/postService";
import { PlusCircle, Loader2, MessageCircle } from "lucide-react";
import PostCard from "@/features/feed/components/PostCard";
import PostComposer from "@/features/feed/components/PostComposer";
import TrendingRow from "@/features/feed/components/TrendingRow";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export default function HomeFeedPage() {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const { recentItems } = useRecentlyViewed();

  // ----- Normal feed with pagination -----
  const fetchPosts = async ({ pageParam = 0 }) => {
    const all = await postService.getFeed();
    const pageSize = 10;
    const from = pageParam * pageSize;
    const to = from + pageSize - 1;
    const chunk = all.slice(from, to + 1);
    return {
      posts: chunk,
      nextPage: all.length > to + 1 ? pageParam + 1 : undefined,
    };
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["feed"],
      queryFn: fetchPosts,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextPage,
    });

  const { ref: loadMoreRef, inView } = useInView();
  if (inView && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }

  const handlePostCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["trending"] });
  };

  // Pull‑to‑refresh
  const { containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["trending"] });
    },
  });

  const noPostsYet = status !== "pending" && data?.pages.every((p) => p.posts.length === 0);

  return (
    <div
      ref={containerRef}
      style={{ background: "var(--color-bg)", minHeight: "100%", overflowY: "auto" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
          Feed
        </h1>
      </div>

      {/* Trending Section */}
      <TrendingRow />

      {/* Recently Viewed */}
      {recentItems.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <h3 className="section-title">Recently Viewed</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                to={`/${item.type === "product" ? "marketplace" : "accommodation"}/${item.id}`}
                className="flex-shrink-0 w-24 text-center"
                style={{ textDecoration: "none", color: "inherit" }}
                aria-label={`View ${item.title}`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover mx-auto" />
                ) : (
                  <div
                    className="w-16 h-16 rounded-lg mx-auto"
                    style={{
                      background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                    }}
                  />
                )}
                <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--color-text)" }}>
                  {item.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {noPostsYet && (
        <div className="px-4 pt-8">
          <div
            className="rounded-2xl py-16 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <MessageCircle size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
              Welcome to the feed!
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              Share your first post with the community.
            </p>
            <button
              onClick={() => setShowComposer(true)}
              className="btn-primary w-auto px-6 mx-auto inline-flex items-center gap-2"
            >
              <PlusCircle size={16} /> Create your first post
            </button>
          </div>
        </div>
      )}

      {/* Post list */}
      {!noPostsYet && (
        <div className="px-4 pt-2 pb-8">
          {status === "pending" ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-4 skeleton" style={{ height: 120 }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {data?.pages.map((page) =>
                page.posts.map((post) => <PostCard key={post.id} post={post} />)
              )}
              <div ref={loadMoreRef} className="h-4" />
              {isFetchingNextPage && (
                <Loader2 className="animate-spin mx-auto" style={{ color: "var(--color-text-muted)" }} />
              )}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowComposer(true)}
        className="fixed bottom-28 right-5 z-[100] w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: "var(--color-primary)", color: "#fff" }}
        aria-label="Create post"
      >
        <PlusCircle size={28} />
      </button>

      {showComposer && (
        <PostComposer onClose={() => setShowComposer(false)} onCreated={handlePostCreated} />
      )}
    </div>
  );
}