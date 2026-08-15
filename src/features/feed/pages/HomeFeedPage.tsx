import { useState } from "react";
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
import RecentlyViewedSection from "@/components/ui/RecentlyViewedSection";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import type { FeedPost } from "@/services/posts/postService";
import type { Tables } from "@/types/database/database.types";

import { useAuthStore } from "@/store/auth/authStore";
import { useMutedUsers } from "@/hooks/safety/useMuteUser";

export default function HomeFeedPage() {
  const { subHeaderVisible } = useScrollHeader();
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

  const { containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
    },
  });

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
    <div ref={containerRef} style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Glassmorphic Main Header (Hides on Scroll Down) */}
      <div
        className={`sticky top-0 z-20 px-3 py-2 flex items-center justify-between backdrop-blur-md bg-surface/85 border-b border-border/80 shadow-xs transition-all duration-300 transform origin-top ${
          subHeaderVisible
            ? "max-h-16 py-2 translate-y-0 opacity-100"
            : "max-h-0 py-0 opacity-0 -translate-y-full pointer-events-none border-transparent overflow-hidden"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-black shadow-xs">
            P
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Campus Feed</h1>
            <p className="text-[10px] text-slate-400 font-medium">PLAWZA Student Community</p>
          </div>
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="glass-select text-xs py-1 px-3 rounded-full">
          <option value="all">All Content</option>
          <option value="post">Posts</option>
          <option value="product">Marketplace</option>
          <option value="accommodation">Housing</option>
        </select>
      </div>

      {/* Side-Scrolling Feed Topic Sub-Header Pill Track (Hides on Scroll Down) */}
      {allTags && allTags.length > 0 && (
        <div
          className={`sticky top-[49px] z-10 px-3 flex items-center gap-1.5 overflow-x-auto hide-scrollbar backdrop-blur-md bg-surface/85 border-b border-border/80 shadow-xs transition-all duration-300 transform origin-top flex-nowrap ${
            subHeaderVisible
              ? "max-h-12 py-1.5 translate-y-0 opacity-100"
              : "max-h-0 py-0 opacity-0 -translate-y-full pointer-events-none border-transparent overflow-hidden"
          }`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <button
            type="button"
            onClick={() => setSelectedTag("")}
            className={`text-xs px-3.5 py-1 rounded-full font-bold transition-all shrink-0 border ${
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
                className={`text-xs px-3.5 py-1 rounded-full font-medium transition-all shrink-0 border flex items-center gap-1 ${
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