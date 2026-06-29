import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { unifiedFeedService, type UnifiedFeedItem } from "@/services/feed/unifiedFeedService";
import { tagService } from "@/services/tags/tagService";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PlusCircle, MessageCircle } from "lucide-react";

import PostCard from "@/features/feed/components/PostCard";
import ProductCard from "@/features/marketplace/components/ProductCard";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import PostComposer from "@/features/feed/components/PostComposer";
import TrendingRow from "@/features/feed/components/TrendingRow";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";
import type { FeedPost } from "@/services/posts/postService";
import type { Tables } from "@/types/database/database.types";

export default function HomeFeedPage() {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "product" | "accommodation">("all");
  const [selectedTag, setSelectedTag] = useState("");
  const { recentItems } = useRecentlyViewed();

  const { data: allTags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAllTags(),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["unified-feed"],
    queryFn: () => unifiedFeedService.getUnifiedFeed(50),
  });

  const { containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
    },
  });

  // Filter by type AND tag
  const filtered = (items || []).filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (selectedTag) {
      // For products and accommodations, we need to check tags
      // We'll skip tag filtering for posts for now (they already show their tags)
      if (item.type === "product" || item.type === "accommodation") {
        const tags = item.data?.tags || [];
        return tags.includes(selectedTag);
      }
      // For posts, check if the post has the tag via its tag list
      // This requires fetching tags for each post, which we can do client‑side
      // For simplicity, we'll allow all posts to pass (tag filtering on posts is a future enhancement)
      return true;
    }
    return true;
  });

  const handlePostCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
  };

  const renderItem = (item: UnifiedFeedItem) => {
    switch (item.type) {
      case "post":
        return <PostCard key={item.id} post={item.data as FeedPost} />;
      case "product":
        return <ProductCard key={item.id} product={item.data as Tables<"products">} />;
      case "accommodation":
        return <AccommodationCard key={item.id} listing={item.data as Tables<"accommodations">} />;
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} style={{ background: "var(--color-bg)", minHeight: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Explore</h1>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="text-xs bg-transparent border-none outline-none" style={{ color: "var(--color-text-secondary)" }}>
          <option value="all">All</option>
          <option value="post">Posts</option>
          <option value="product">Marketplace</option>
          <option value="accommodation">Housing</option>
        </select>
      </div>

      {/* Tag chips */}
      {allTags && allTags.length > 0 && (
        <div className="px-4 pt-2 pb-2 flex gap-2 overflow-x-auto">
          <button onClick={() => setSelectedTag("")} className={`text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap ${!selectedTag ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            style={!selectedTag ? { background: "var(--color-primary)", color: "#fff" } : { background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
            All
          </button>
          {allTags.map((tag: any) => (
            <button key={tag.id} onClick={() => setSelectedTag(tag.name)} className={`text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap ${selectedTag === tag.name ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              style={selectedTag === tag.name ? { background: "var(--color-primary)", color: "#fff" } : { background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Trending */}
      <TrendingRow />

      {/* Recently Viewed */}
      {recentItems.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <h3 className="section-title">Recently Viewed</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentItems.map((item) => (
              <Link key={`${item.type}-${item.id}`} to={`/${item.type === "product" ? "marketplace" : "accommodation"}/${item.id}`} className="flex-shrink-0 w-24 text-center" style={{ textDecoration: "none", color: "inherit" }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover mx-auto" />
                ) : (
                  <div className="w-16 h-16 rounded-lg mx-auto" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" }} />
                )}
                <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--color-text)" }}>{item.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feed items */}
      <div className="px-4 pt-2 pb-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="card p-4 skeleton" style={{ height: 120 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <MessageCircle size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>Nothing to show</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {selectedTag ? "No items with this tag." : typeFilter !== "all" ? `No ${typeFilter}s yet.` : "Be the first to post, sell, or list a property!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => (
              <div key={`${item.type}-${item.id}`} className="relative">
                {item.featured && (
                  <span className="absolute top-2 left-2 z-10 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Featured</span>
                )}
                {renderItem(item)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowComposer(true)}
        className="fixed bottom-28 right-5 z-[100] w-14 h-14 rounded-full flex items-center justify-center fab-glow fab-float active:scale-90 transition-transform"
        style={{ background: "var(--color-primary)", color: "#fff" }}
        aria-label="Create post"
      >
        <PlusCircle size={28} />
      </button>
      {showComposer && <PostComposer onClose={() => setShowComposer(false)} onCreated={handlePostCreated} />}
    </div>
  );
}