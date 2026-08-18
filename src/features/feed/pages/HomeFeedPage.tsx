import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { unifiedFeedService, type UnifiedFeedItem } from "@/services/feed/unifiedFeedService";
import { tagService } from "@/services/tags/tagService";
import { PlusCircle, MessageCircle } from "lucide-react";

import PostCard from "@/features/feed/components/PostCard";
import ProductCard from "@/features/marketplace/components/ProductCard";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import PostComposer from "@/features/feed/components/PostComposer";
import TrendingRow from "@/features/feed/components/TrendingRow";
import RecentlyViewedSection from "@/components/ui/RecentlyViewedSection";
import type { FeedPost } from "@/services/posts/postService";
import type { Tables } from "@/types/database/database.types";
import { useAuthStore } from "@/store/auth/authStore";
import { useMutedUsers } from "@/hooks/safety/useMuteUser";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

export default function HomeFeedPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showComposer, setShowComposer] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "product" | "accommodation">("all");
  const [selectedTag, setSelectedTag] = useState("");

  const { data: mutedUsers } = useMutedUsers(user?.id);

  const { data: allTags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAllTags(),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["unified-feed"],
    queryFn: () => unifiedFeedService.getUnifiedFeed(50),
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
  };

  // Filter by type AND tag AND muted status
  const filtered = (items || []).filter((item) => {
    // 1. Muted check
    let authorId = "";
    if (item.type === "post") authorId = item.data?.user_id;
    else if (item.type === "product") authorId = item.data?.seller_id;
    else if (item.type === "accommodation") authorId = item.data?.owner_id;
    
    if (authorId && mutedUsers?.includes(authorId)) {
      return false;
    }
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

  const profile = useAuthStore((s) => s.profile);

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Ultra-Compact 1-Line Glassmorphic Sticky Header */}
      <div className="sticky top-0 z-20 px-3 py-1.5 flex items-center gap-2 backdrop-blur-md bg-surface/85 border-b border-border/80 shadow-xs h-11">
        {/* Brand Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center text-[11px] font-black shadow-xs">
            P
          </div>
          <span className="text-xs font-extrabold text-slate-900 dark:text-white hidden sm:inline">Feed</span>
        </div>

        {/* Content Type Selector */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="glass-select text-[11px] font-bold py-1 px-2.5 rounded-full shrink-0 border-border"
        >
          <option value="all">All</option>
          <option value="post">Posts</option>
          <option value="product">Market</option>
          <option value="accommodation">Housing</option>
        </select>

        {/* Side-Scrolling Feed Topic Pills */}
        {allTags && allTags.length > 0 && (
          <div
            className="flex items-center gap-1 overflow-x-auto hide-scrollbar flex-nowrap flex-1 py-0.5 min-w-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <button
              type="button"
              onClick={() => setSelectedTag("")}
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all shrink-0 border ${
                !selectedTag
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
              }`}
            >
              All Topics
            </button>
            {allTags.map((tag: any) => {
              const isActive = selectedTag === tag.name;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTag(isActive ? "" : tag.name)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 border flex items-center gap-0.5 ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-xs font-bold"
                      : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
                  }`}
                >
                  <span>#{tag.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
      {/* Interactive Feed Composer Trigger Box */}
      <div className="px-4 pt-3 pb-1">
        <div
          onClick={() => setShowComposer(true)}
          className="p-3 rounded-2xl bg-surface border border-border flex items-center gap-3 cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-9 h-9 rounded-full object-cover shrink-0" alt="" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shrink-0">
              {(profile?.full_name?.[0] || user?.email?.[0] || "?").toUpperCase()}
            </div>
          )}
          <span className="text-xs text-slate-400 font-medium flex-1 truncate">
            What's happening on campus, {profile?.full_name?.split(" ")[0] || "student"}?
          </span>
          <span className="btn-primary text-xs px-3 py-1 rounded-full shrink-0">
            Post
          </span>
        </div>
      </div>

      {/* Trending */}
      <TrendingRow />

      {/* Recently Viewed */}
      <div className="px-4">
        <RecentlyViewedSection title="Pick Up Where You Left Off" />
      </div>

      {/* Feed items */}
      <div className="px-4 pt-2 pb-8">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nothing to show"
            description={selectedTag ? "No items with this tag." : typeFilter !== "all" ? `No ${typeFilter}s yet.` : "Be the first to post, sell, or list a property!"}
            actionLabel={!selectedTag && typeFilter === "all" ? "Create a post" : undefined}
            onAction={!selectedTag && typeFilter === "all" ? () => setShowComposer(true) : undefined}
          />
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
      </PullToRefresh>

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