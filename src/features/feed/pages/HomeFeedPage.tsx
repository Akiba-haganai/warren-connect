import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { unifiedFeedService, type UnifiedFeedItem } from "@/services/feed/unifiedFeedService";
import { tagService } from "@/services/tags/tagService";
import { PlusCircle, MessageCircle, Sparkles, ArrowUp } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import PostCard from "@/features/feed/components/PostCard";
import ProductCard from "@/features/marketplace/components/ProductCard";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import PostComposer from "@/features/feed/components/PostComposer";
import ProductComposer from "@/features/marketplace/components/ProductComposer";
import AccommodationComposer from "@/features/accommodation/components/AccomodationComposer";
import CreateActionSheet from "@/features/feed/components/CreateActionSheet";
import TrendingRow from "@/features/feed/components/TrendingRow";
import RecentlyViewedSection from "@/components/ui/RecentlyViewedSection";
import type { FeedPost } from "@/services/posts/postService";
import type { Tables } from "@/types/database/database.types";
import { useAuthStore } from "@/store/auth/authStore";
import { useMutedUsers } from "@/hooks/safety/useMuteUser";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { triggerHaptic } from "@/utils/haptic";

export default function HomeFeedPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  // Filters & State
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "product" | "accommodation">("all");
  const [selectedTag, setSelectedTag] = useState("");
  const [newUpdatesCount, setNewUpdatesCount] = useState(0);

  // Composer Modals (Persist active composer to localStorage to survive Android LMK reloads)
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [activeComposer, setActiveComposer] = useState<"post" | "product" | "accommodation" | null>(() => {
    try {
      const saved = localStorage.getItem("plawza_active_composer");
      if (saved === "post" || saved === "product" || saved === "accommodation") {
        return saved;
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      if (activeComposer) {
        localStorage.setItem("plawza_active_composer", activeComposer);
      } else {
        localStorage.removeItem("plawza_active_composer");
      }
    } catch {}
  }, [activeComposer]);

  const { data: mutedUsers } = useMutedUsers(user?.id);

  const { data: allTags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAllTags(),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["unified-feed"],
    queryFn: () => unifiedFeedService.getUnifiedFeed(50),
  });

  // Realtime listener for new posts / products / housing
  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
        setNewUpdatesCount((prev) => prev + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, () => {
        setNewUpdatesCount((prev) => prev + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "accommodations" }, () => {
        setNewUpdatesCount((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setNewUpdatesCount(0);
    await queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
  };

  const handleLoadNewUpdates = () => {
    triggerHaptic();
    handleRefresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter items
  const filtered = (items || []).filter((item) => {
    let authorId = "";
    if (item.type === "post") authorId = item.data?.user_id;
    else if (item.type === "product") authorId = item.data?.seller_id;
    else if (item.type === "accommodation") authorId = item.data?.owner_id;

    if (authorId && mutedUsers?.includes(authorId)) {
      return false;
    }
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (selectedTag) {
      if (item.type === "product" || item.type === "accommodation") {
        const tags = item.data?.tags || [];
        return tags.includes(selectedTag);
      }
      return true;
    }
    return true;
  });

  const handleCreated = () => {
    handleRefresh();
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
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Sleek Segmented Header with 1-Tap Category Filters */}
      <div className="sticky top-0 z-20 px-3 py-2 flex flex-col gap-1.5 backdrop-blur-md bg-surface/90 border-b border-border/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar flex-nowrap w-full">
          {/* Segmented Filter Pills */}
          {[
            { id: "all", label: "🔥 All" },
            { id: "post", label: "💬 Campus" },
            { id: "product", label: "🛍️ Market" },
            { id: "accommodation", label: "🏠 Housing" },
          ].map((tab) => {
            const isActive = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setTypeFilter(tab.id as any);
                }}
                className={`text-xs px-3 py-1 rounded-full font-bold transition-all shrink-0 border select-none ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-xs scale-100"
                    : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <div className="w-px h-4 bg-border/80 shrink-0 mx-0.5" />

          {/* Topic Tags */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setSelectedTag("");
            }}
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 border ${
              !selectedTag
                ? "bg-primary/15 text-primary font-bold border-primary/30"
                : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:border-slate-300"
            }`}
          >
            All Topics
          </button>
          {allTags?.map((tag: any) => {
            const isActive = selectedTag === tag.name;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setSelectedTag(isActive ? "" : tag.name);
                }}
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 border flex items-center gap-0.5 ${
                  isActive
                    ? "bg-primary/20 text-primary font-bold border-primary/40"
                    : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:border-slate-300"
                }`}
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        {/* Floating "✨ New Updates Available" Chip */}
        {newUpdatesCount > 0 && (
          <div className="sticky top-14 z-30 flex justify-center px-4 pt-2 animate-in slide-in-from-top-4 duration-200">
            <button
              type="button"
              onClick={handleLoadNewUpdates}
              className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transform active:scale-95 transition-all"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span>
                {newUpdatesCount} new update{newUpdatesCount > 1 ? "s" : ""} • Tap to view
              </span>
              <ArrowUp size={13} />
            </button>
          </div>
        )}

        {/* Interactive Multi-Action Feed Composer Trigger Box */}
        <div className="px-4 pt-3 pb-1">
          <div
            onClick={() => {
              triggerHaptic();
              setShowActionSheet(true);
            }}
            className="p-3 rounded-2xl bg-surface border border-border flex items-center gap-3 cursor-pointer shadow-2xs hover:border-slate-300 transition-colors active:scale-[0.99]"
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
              Create +
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
              {[1, 2, 3].map((i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Nothing to show"
              description={
                selectedTag
                  ? "No items with this tag."
                  : typeFilter !== "all"
                  ? `No ${typeFilter}s yet.`
                  : "Be the first to post, sell, or list a property!"
              }
              actionLabel={!selectedTag && typeFilter === "all" ? "Create something" : undefined}
              onAction={!selectedTag && typeFilter === "all" ? () => setShowActionSheet(true) : undefined}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((item) => (
                <div key={`${item.type}-${item.id}`} className="relative">
                  {item.featured && (
                    <span className="absolute top-2 left-2 z-10 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Featured
                    </span>
                  )}
                  {renderItem(item)}
                </div>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Floating Action Button (Opens Action Sheet) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic();
          setShowActionSheet(true);
        }}
        className="fixed bottom-28 right-5 z-[100] w-14 h-14 rounded-full flex items-center justify-center fab-glow fab-float active:scale-90 transition-transform shadow-xl"
        style={{ background: "var(--color-primary)", color: "#fff" }}
        aria-label="Create new item"
      >
        <PlusCircle size={28} />
      </button>

      {/* Multi-Action Bottom Sheet Modal */}
      <CreateActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onSelectAction={(action) => setActiveComposer(action)}
      />

      {/* Composer Overlays */}
      {activeComposer === "post" && (
        <PostComposer onClose={() => setActiveComposer(null)} onCreated={handleCreated} />
      )}
      {activeComposer === "product" && (
        <ProductComposer onClose={() => setActiveComposer(null)} onCreated={handleCreated} />
      )}
      {activeComposer === "accommodation" && (
        <AccommodationComposer onClose={() => setActiveComposer(null)} onCreated={handleCreated} />
      )}
    </div>
  );
}