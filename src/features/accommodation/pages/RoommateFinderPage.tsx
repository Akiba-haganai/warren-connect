import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth/authStore";
import { roommateService } from "@/services/roommates/roommateService";
import { triggerNotification } from "@/services/notifications/triggerService";
import { triggerHaptic } from "@/utils/haptic";
import { isOnline } from "@/utils/timeAgo";
import { ZAMBIA_UNIVERSITIES_COLLEGES } from "@/constants/locations";
import { Users, Loader2, X, Sparkles, SlidersHorizontal, Search, GraduationCap } from "lucide-react";
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
      className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full flex-shrink-0 bg-surface border border-border text-slate-700 dark:text-slate-200 font-medium"
    >
      {label}
      <button onClick={onClear} aria-label={`Remove ${label} filter`} className="hover:text-red-500"><X size={13} /></button>
    </span>
  );
}

export default function RoommateFinderPage() {
  const currentProfile = useAuthStore((s) => s.profile);
  const currentUserId = useAuthStore((s) => s.user?.id) || undefined;
  const queryClient = useQueryClient();

  // ---- Search ----
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
      const dynamicUnis = (data ?? []).map((d: any) => d.university);
      return Array.from(new Set([...ZAMBIA_UNIVERSITIES_COLLEGES, ...dynamicUnis]));
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
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      {/* ---- Top Header Console ---- */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-surface border-b border-border shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="text-primary" size={18} /> Roommate Finder
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Discover compatible campus roommates</p>
          </div>
          <button
            onClick={() => setFiltersOpen(true)}
            className="btn-ghost text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-border text-slate-700 dark:text-slate-200 hover:border-slate-300 transition-all shrink-0"
          >
            <SlidersHorizontal size={14} className={activeFilterCount ? "text-primary" : ""} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4 max-w-5xl mx-auto">
        {/* Profile Completion Callout Banner */}
        {(!currentProfile?.university || !(currentProfile as any)?.location) && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles size={18} className="text-amber-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Boost Match Accuracy</p>
                <p className="text-[11px] text-blue-100 truncate">Complete your university & location to unlock 95%+ match scores.</p>
              </div>
            </div>
            <Link to="/profile" className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full shrink-0 transition-colors">
              Edit Profile
            </Link>
          </div>
        )}

        {/* ---- Search input ---- */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search roommate by name, course, or interests..."
            className="input-field pl-10 text-xs shadow-2xs rounded-full"
          />
        </div>

        {/* ---- Side-scrolling University Pill Bar ---- */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5 flex-nowrap">
          <button
            type="button"
            onClick={() => setUniversityFilter("")}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 border ${
              !universityFilter
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface text-slate-700 dark:text-slate-300 border-border hover:border-slate-300"
            }`}
          >
            All Universities
          </button>
          {ZAMBIA_UNIVERSITIES_COLLEGES.map((uni) => {
            const shortName = uni.includes("(") ? uni.split("(")[1].replace(")", "") : uni;
            const isActive = universityFilter === uni;
            return (
              <button
                key={uni}
                type="button"
                onClick={() => setUniversityFilter(isActive ? "" : uni)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 border flex items-center gap-1 ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface text-slate-700 dark:text-slate-300 border-border hover:border-slate-300"
                }`}
              >
                <GraduationCap size={13} />
                <span>{shortName}</span>
              </button>
            );
          })}
        </div>

        {/* ---- Horizontally scrollable active filter chips ---- */}
        {activeFilterCount > 0 && (
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar py-0.5 flex-nowrap items-center">
            {smokingFilter !== "no-preference" && <FilterChip label={`Smoking: ${smokingFilter}`} onClear={() => setSmokingFilter("no-preference")} />}
            {drinkingFilter !== "no-preference" && <FilterChip label={`Drinking: ${drinkingFilter}`} onClear={() => setDrinkingFilter("no-preference")} />}
            {studyFilter !== "no-preference" && <FilterChip label={`Study: ${studyFilter}`} onClear={() => setStudyFilter("no-preference")} />}
            {goingOutFilter !== "no-preference" && <FilterChip label={`Going out: ${goingOutFilter}`} onClear={() => setGoingOutFilter("no-preference")} />}
            {genderFilter !== "no-preference" && <FilterChip label={`Gender: ${genderFilter}`} onClear={() => setGenderFilter("no-preference")} />}
            {privacyFilter !== null && <FilterChip label={privacyFilter ? "Privacy needed" : "Privacy not needed"} onClear={() => setPrivacyFilter(null)} />}
            {universityFilter && <FilterChip label={universityFilter} onClear={() => setUniversityFilter("")} />}
            {(budgetMin || budgetMax) && <FilterChip label={`K${budgetMin||0}–K${budgetMax||"∞"}`} onClear={() => { setBudgetMinInput(""); setBudgetMaxInput(""); }} />}
            <button onClick={clearAllFilters} className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline shrink-0 ml-1">Clear all</button>
          </div>
        )}

        {/* ---- Results ---- */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <RoommateCardSkeleton key={i} />)}</div>
        ) : allResults.length === 0 ? (
          <div className="card p-12 text-center border border-dashed border-border bg-surface rounded-3xl">
            <Users size={44} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Roommate Matches Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              {currentProfile?.looking_for_roommate
                ? "Try relaxing your lifestyle filters or selecting a broader university area."
                : "Enable 'Looking for roommate' in your profile preferences to start matching!"}
            </p>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="btn-primary text-xs px-5 py-2 rounded-full font-bold">
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Top Match Spotlight Hero */}
            {topMatch && page === 0 && (
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl p-5 shadow-xl shadow-blue-500/10 mb-4 border border-blue-400/20">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-100 uppercase tracking-wider mb-3">
                  <Sparkles size={14} className="text-amber-300 animate-pulse" /> Top Match Recommendation
                </div>
                <RoommateCard
                  user={topMatch}
                  isOnline={isOnline(topMatch.last_seen)}
                  compatibility={topMatch.compatibility}
                  compatibilityBreakdown={getCompatibilityBreakdown(currentProfile, topMatch)}
                  isLiked={likedUsers.has(topMatch.id)}
                  isMutual={mutualUsers.has(topMatch.id)}
                  disabled={pendingLikes.has(topMatch.id)}
                  onToggleLike={() => handleLikeToggle(topMatch.id)}
                  spotlight
                />
              </div>
            )}

            {/* Roommate Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allResults.map((user) => (
                <RoommateCard
                  key={user.id}
                  user={user}
                  isOnline={isOnline(user.last_seen)}
                  compatibility={user.compatibility}
                  compatibilityBreakdown={getCompatibilityBreakdown(currentProfile, user)}
                  isLiked={likedUsers.has(user.id)}
                  isMutual={mutualUsers.has(user.id)}
                  disabled={pendingLikes.has(user.id)}
                  onToggleLike={() => handleLikeToggle(user.id)}
                />
              ))}
            </div>

            {isFetching && <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-primary" /></div>}

            {hasMore && !isLoading && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="btn-ghost text-xs font-semibold px-6 py-2.5 rounded-full border border-border text-slate-700 dark:text-slate-200 hover:border-slate-300 transition-all shadow-xs"
                >
                  {isFetching ? "Loading..." : "Load More Roommates"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Bottom Sheet for detailed filters ---- */}
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
              className="input-field w-full mt-3 text-xs text-left cursor-pointer rounded-xl font-medium"
            >
              🔒 {privacyFilter === null ? "Privacy Preference: Any" : privacyFilter ? "Occasional Privacy Needed" : "Shared Space Preferred"}
            </button>
            <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full mt-4 rounded-full py-2.5 font-bold text-xs">Show Results</button>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}