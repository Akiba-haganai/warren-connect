import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth/authStore";
import { roommateService } from "@/services/roommates/roommateService";
import { triggerNotification } from "@/services/notifications/triggerService";
import { triggerHaptic } from "@/utils/haptic";
import { isOnline } from "@/utils/timeAgo";
import { Users, Loader2, X, Sparkles, SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import RoommateFilters from "@/features/accommodation/components/RoommateFilters";
import RoommateCard from "@/features/accommodation/components/RoommateCard";
import RoommateCardSkeleton from "@/features/accommodation/components/RoommateCardSkeleton";
import BottomSheet from "@/features/accommodation/components/BottomSheet";
import { AnimatePresence } from "framer-motion";

const PAGE_SIZE = 20;

// ---- Helpers ----
function getCompatibilityBreakdown(me: any, them: any): string[] {
  if (!me) return [];
  const fields: { key: string; label: string }[] = [
    { key: "smoking_preference", label: "Smoking" },
    { key: "drinking_preference", label: "Drinking" },
    { key: "study_habit", label: "Study habits" },
    { key: "going_out_pattern", label: "Going out" },
    { key: "roommate_gender_preference", label: "Gender pref" },
  ];
  const matched = fields
    .filter((f) => me[f.key] && me[f.key] !== "no-preference" && me[f.key] === them[f.key])
    .map((f) => f.label);
  const budgetOverlap =
    me.roommate_budget_min != null &&
    me.roommate_budget_max != null &&
    them.roommate_budget_min != null &&
    them.roommate_budget_max != null &&
    me.roommate_budget_max >= them.roommate_budget_min &&
    them.roommate_budget_max >= me.roommate_budget_min;
  if (budgetOverlap) matched.push("Budget range");
  return matched;
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
    >
      {label}
      <button onClick={onClear} aria-label={`Remove ${label} filter`}><X size={12} /></button>
    </span>
  );
}

export default function RoommateFinderPage() {
  const currentProfile = useAuthStore((s) => s.profile);
  const currentUserId = useAuthStore((s) => s.user?.id) || undefined;
  const queryClient = useQueryClient();

  // ---- Search (always visible) ----
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ---- Budget ----
  const [budgetMinInput, setBudgetMinInput] = useState("");
  const [budgetMaxInput, setBudgetMaxInput] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setBudgetMin(budgetMinInput); setBudgetMax(budgetMaxInput); }, 400);
    return () => clearTimeout(t);
  }, [budgetMinInput, budgetMaxInput]);

  // ---- Filters ----
  const [universityFilter, setUniversityFilter] = useState("");
  const [smokingFilter, setSmokingFilter] = useState("no-preference");
  const [drinkingFilter, setDrinkingFilter] = useState("no-preference");
  const [studyFilter, setStudyFilter] = useState("no-preference");
  const [goingOutFilter, setGoingOutFilter] = useState("no-preference");
  const [genderFilter, setGenderFilter] = useState("no-preference");
  const [privacyFilter, setPrivacyFilter] = useState<boolean | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [
    smokingFilter, drinkingFilter, studyFilter, goingOutFilter,
    genderFilter, privacyFilter, universityFilter, budgetMin, budgetMax, debouncedSearch,
  ]);

  const activeFilterCount = [
    smokingFilter !== "no-preference", drinkingFilter !== "no-preference",
    studyFilter !== "no-preference", goingOutFilter !== "no-preference",
    genderFilter !== "no-preference", privacyFilter !== null,
    !!universityFilter, !!budgetMin, !!budgetMax,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSmokingFilter("no-preference"); setDrinkingFilter("no-preference");
    setStudyFilter("no-preference"); setGoingOutFilter("no-preference");
    setGenderFilter("no-preference"); setPrivacyFilter(null);
    setUniversityFilter(""); setBudgetMinInput(""); setBudgetMaxInput("");
  };

  // ---- Universities ----
  const { data: allUniversities = [] } = useQuery({
    queryKey: ["roommate-universities"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("university").eq("looking_for_roommate", true).not("university", "is", null);
      return [...new Set((data ?? []).map((d: any) => d.university))].sort() as string[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // ---- Main RPC ----
  const { data: pageUsers, isLoading, isFetching } = useQuery({
    queryKey: ["roommate-users", currentUserId, smokingFilter, drinkingFilter, studyFilter, goingOutFilter, genderFilter, privacyFilter, universityFilter, budgetMin, budgetMax, debouncedSearch, page],
    queryFn: async () => {
      if (!currentUserId || typeof currentUserId !== "string") return [];
      const { data, error } = await supabase.rpc("get_roommate_matches", {
        me: currentUserId,
        p_smoking:    smokingFilter !== "no-preference" ? smokingFilter : undefined,
        p_drinking:   drinkingFilter !== "no-preference" ? drinkingFilter : undefined,
        p_study:      studyFilter !== "no-preference" ? studyFilter : undefined,
        p_going_out:  goingOutFilter !== "no-preference" ? goingOutFilter : undefined,
        p_gender:     genderFilter !== "no-preference" ? genderFilter : undefined,
        p_privacy:    privacyFilter ?? undefined,
        p_university: universityFilter || undefined,
        p_budget_min: budgetMin ? Number(budgetMin) : undefined,
        p_budget_max: budgetMax ? Number(budgetMax) : undefined,
        p_search:     debouncedSearch || undefined,
        p_offset:     page * PAGE_SIZE,
        p_limit:      PAGE_SIZE,
      });
      if (error) { toast.error("Couldn't load matches"); throw error; }
      return (data ?? []) as any[];
    },
    enabled: typeof currentUserId === "string" && currentUserId.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5000,
    retry: false,
  });

  // ---- Pagination ----
  const [allResults, setAllResults] = useState<any[]>([]);
  useEffect(() => {
    if (pageUsers) {
      setAllResults((prev) => (page === 0 ? pageUsers : [...prev, ...pageUsers]));
    }
  }, [pageUsers, page]);

  const hasMore = (pageUsers?.length ?? 0) === PAGE_SIZE;

  // ---- Like state ----
  const { data: likeState } = useQuery({
    queryKey: ["roommate-like-state", currentUserId],
    queryFn: async () => {
      // Narrow currentUserId to string — enabled guard stops us reaching here
      // when undefined, but TS can't see that connection statically
      if (!currentUserId) throw new Error("No user");
      const [{ data: myLikes }, { data: likesOnMe }] = await Promise.all([
        supabase.from("roommate_likes").select("liked_id").eq("liker_id", currentUserId),
        supabase.from("roommate_likes").select("liker_id").eq("liked_id", currentUserId),
      ]);
      const likedSet = new Set((myLikes ?? []).map((l: any) => l.liked_id));
      const likedMeSet = new Set((likesOnMe ?? []).map((l: any) => l.liker_id));
      const mutualSet = new Set([...likedSet].filter((id) => likedMeSet.has(id)));
      return { likedSet, mutualSet };
    },
    enabled: typeof currentUserId === "string" && currentUserId.length > 0,
  });

  const [optimisticLiked, setOptimisticLiked] = useState<Record<string, boolean>>({});
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());

  const likedUsers = useMemo(() => {
    const base = new Set(likeState?.likedSet ?? []);
    for (const [id, liked] of Object.entries(optimisticLiked)) {
      if (liked) base.add(id); else base.delete(id);
    }
    return base;
  }, [likeState, optimisticLiked]);

  const mutualUsers = likeState?.mutualSet ?? new Set<string>();

  const topMatch = useMemo(() => {
    if (!allResults.length) return null;
    const best = allResults[0];
    return best.compatibility >= 60 ? best : null;
  }, [allResults]);

  const handleLikeToggle = async (userId: string) => {
    if (!currentUserId || !currentProfile || pendingLikes.has(userId)) return;
    triggerHaptic();
    const currentlyLiked = likedUsers.has(userId);
    setOptimisticLiked((prev) => ({ ...prev, [userId]: !currentlyLiked }));
    setPendingLikes((prev) => new Set(prev).add(userId));
    try {
      if (currentlyLiked) {
        await roommateService.unlikeUser(currentUserId, userId);
      } else {
        await roommateService.likeUser(currentUserId, userId);
        triggerNotification.like(userId, "roommate", currentProfile.full_name ?? "Someone");
        const mutual = await roommateService.checkMutual(currentUserId, userId);
        if (mutual) {
          const { messageService } = await import("@/services/messages/messageService");
          const existingConvos = await messageService.getConversations(currentUserId);
          const existingConv = existingConvos.find(
            (c) => (c.user1_id === currentUserId && c.user2_id === userId) || (c.user2_id === currentUserId && c.user1_id === userId)
          );
          let convId = existingConv?.id;
          if (!convId) { const newConv = await messageService.createConversation(currentUserId, userId); convId = newConv.id; }
          toast.success("It's a match! 🎉", { duration: 4000 });
          await triggerNotification.system(currentUserId, "Mutual Match!", `You and ${currentProfile.full_name || "someone"} matched!`, `/messages?conversation=${convId}`);
          await triggerNotification.system(userId, "Mutual Match!", `You and ${currentProfile.full_name || "someone"} matched!`, `/messages?conversation=${convId}`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["roommate-like-state", currentUserId] });
    } catch {
      setOptimisticLiked((prev) => ({ ...prev, [userId]: currentlyLiked }));
      toast.error("Couldn't update like");
    } finally { setPendingLikes((prev) => { const n = new Set(prev); n.delete(userId); return n; }); }
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* ---- Compact header ---- */}
      <div className="sticky top-0 z-10 px-4 py-2 flex items-center justify-between"
           style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Roommates</h1>
        <button onClick={() => setFiltersOpen(true)} className="relative p-1.5 rounded-full"
                style={{ background: activeFilterCount ? "var(--color-primary-light)" : "transparent" }}>
          <SlidersHorizontal size={20} style={{ color: activeFilterCount ? "var(--color-primary)" : "var(--color-text-secondary)" }} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ width: 16, height: 16, background: "var(--color-primary)", color: "#fff" }}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      <div className="px-4 pt-3 pb-8">
        {/* ---- Always‑visible search ---- */}
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
               placeholder="Search by name, course…" className="input-field mb-3 w-full" />

        {/* ---- Horizontally scrollable filter chips ---- */}
        {activeFilterCount > 0 && (
          <div className="flex gap-1.5 overflow-x-auto flex-nowrap mb-3 pb-1 scrollbar-hide">
            {smokingFilter !== "no-preference" && <FilterChip label={`Smoking: ${smokingFilter}`} onClear={() => setSmokingFilter("no-preference")} />}
            {drinkingFilter !== "no-preference" && <FilterChip label={`Drinking: ${drinkingFilter}`} onClear={() => setDrinkingFilter("no-preference")} />}
            {studyFilter !== "no-preference" && <FilterChip label={`Study: ${studyFilter}`} onClear={() => setStudyFilter("no-preference")} />}
            {goingOutFilter !== "no-preference" && <FilterChip label={`Going out: ${goingOutFilter}`} onClear={() => setGoingOutFilter("no-preference")} />}
            {genderFilter !== "no-preference" && <FilterChip label={`Gender: ${genderFilter}`} onClear={() => setGenderFilter("no-preference")} />}
            {privacyFilter !== null && <FilterChip label={privacyFilter ? "Privacy needed" : "Privacy not needed"} onClear={() => setPrivacyFilter(null)} />}
            {universityFilter && <FilterChip label={universityFilter} onClear={() => setUniversityFilter("")} />}
            {(budgetMin || budgetMax) && <FilterChip label={`K${budgetMin||0}–K${budgetMax||"∞"}`} onClear={() => { setBudgetMinInput(""); setBudgetMaxInput(""); }} />}
            <button onClick={clearAllFilters} className="text-xs underline flex-shrink-0 self-center ml-1" style={{ color: "var(--color-text-secondary)" }}>Clear all</button>
          </div>
        )}

        {/* ---- Results ---- */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">{Array.from({ length: 4 }).map((_, i) => <RoommateCardSkeleton key={i} />)}</div>
        ) : allResults.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <Users size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <h3 className="text-lg font-bold mb-1">No roommates found</h3>
            <p className="text-sm mb-3">{currentProfile?.looking_for_roommate ? "Try loosening a filter or invite friends." : "Set your preferences first to get matches."}</p>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} className="text-sm font-medium underline" style={{ color: "var(--color-primary)" }}>Clear all filters</button>}
          </div>
        ) : (
          <>
            {topMatch && page === 0 && (
              <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)" }}>
                <div className="flex items-center gap-1 text-xs font-bold text-white mb-2 opacity-90"><Sparkles size={14} /> Your top match</div>
                <RoommateCard user={topMatch} isOnline={isOnline(topMatch.last_seen)} compatibility={topMatch.compatibility}
                  compatibilityBreakdown={getCompatibilityBreakdown(currentProfile, topMatch)}
                  isLiked={likedUsers.has(topMatch.id)} isMutual={mutualUsers.has(topMatch.id)}
                  disabled={pendingLikes.has(topMatch.id)} onToggleLike={() => handleLikeToggle(topMatch.id)} spotlight />
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {allResults.map((user) => (
                <RoommateCard key={user.id} user={user} isOnline={isOnline(user.last_seen)} compatibility={user.compatibility}
                  compatibilityBreakdown={getCompatibilityBreakdown(currentProfile, user)}
                  isLiked={likedUsers.has(user.id)} isMutual={mutualUsers.has(user.id)}
                  disabled={pendingLikes.has(user.id)} onToggleLike={() => handleLikeToggle(user.id)} />
              ))}
            </div>
            {isFetching && <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin" /></div>}
            {hasMore && !isLoading && (
              <div className="flex justify-center pt-4">
                <button onClick={() => setPage((p) => p + 1)} disabled={isFetching}
                        className="text-sm font-medium px-6 py-2.5 rounded-full transition-opacity"
                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)", opacity: isFetching ? 0.6 : 1 }}>
                  {isFetching ? "Loading…" : "Load 20 more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Bottom Sheet for filters ---- */}
      <AnimatePresence>
        {filtersOpen && (
          <BottomSheet onClose={() => setFiltersOpen(false)}>
            <RoommateFilters
              search={searchInput} onSearchChange={setSearchInput}
              universityFilter={universityFilter} onUniversityChange={setUniversityFilter}
              universities={allUniversities}
              smokingFilter={smokingFilter} onSmokingChange={setSmokingFilter}
              drinkingFilter={drinkingFilter} onDrinkingChange={setDrinkingFilter}
              studyFilter={studyFilter} onStudyChange={setStudyFilter}
              goingOutFilter={goingOutFilter} onGoingOutChange={setGoingOutFilter}
              genderFilter={genderFilter} onGenderChange={setGenderFilter}
              budgetMin={budgetMinInput} onBudgetMinChange={setBudgetMinInput}
              budgetMax={budgetMaxInput} onBudgetMaxChange={setBudgetMaxInput}
            />
            <button
              onClick={() => setPrivacyFilter((prev) => (prev === null ? true : prev === true ? false : null))}
              className="input-field w-full mt-3 text-sm text-left"
              style={{
                background: privacyFilter === true ? "var(--color-primary)" : "var(--color-surface)",
                color: privacyFilter !== null ? "#fff" : "var(--color-text)",
              }}
            >
              🔒 {privacyFilter === null ? "Privacy: any" : privacyFilter ? "Needed" : "Not needed"}
            </button>
            <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full mt-4">Show results</button>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}