import { useState } from "react";
import { Link } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { postService } from "@/services/posts/postService";
import { PlusCircle, Loader2 } from "lucide-react";
import PostCard from "@/features/feed/components/PostCard";
import PostComposer from "@/features/feed/components/PostComposer";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";

export default function HomeFeedPage() {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const { recentItems } = useRecentlyViewed();

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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
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
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
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
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover mx-auto"
                  />
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

      {/* Post list */}
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
        <PostComposer
          onClose={() => setShowComposer(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  );
}