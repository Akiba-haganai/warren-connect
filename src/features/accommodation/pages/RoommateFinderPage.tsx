import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth/authStore";
import { roommateService } from "@/services/roommates/roommateService";
import { triggerNotification } from "@/services/notifications/triggerService";
import { triggerHaptic } from "@/utils/haptic";
import { Users, Loader2 } from "lucide-react";
import RoommateFilters from "@/features/accommodation/components/RoommateFilters";
import RoommateCard from "@/features/accommodation/components/RoommateCard";

const PAGE_SIZE = 20;

function computeCompatibility(me: any, them: any): number {
  if (!me || !them) return 0;
  let score = 0;
  let total = 0;
  const fields = [
    "smoking_preference",
    "drinking_preference",
    "study_habit",
    "going_out_pattern",
    "roommate_gender_preference",
  ];
  fields.forEach((field) => {
    const myVal = me[field];
    const theirVal = them[field];
    if (myVal && myVal !== "no-preference") {
      total++;
      if (myVal === theirVal) score++;
    }
  });
  const myMin = me.roommate_budget_min ?? 0;
  const myMax = me.roommate_budget_max ?? Infinity;
  const theirMin = them.roommate_budget_min ?? 0;
  const theirMax = them.roommate_budget_max ?? Infinity;
  if (myMax > 0 || theirMax > 0) {
    total++;
    if (myMax >= theirMin && theirMax >= myMin) score++;
  }
  return total === 0 ? 0 : Math.round((score / total) * 100);
}

export default function RoommateFinderPage() {
  const currentProfile = useAuthStore((s) => s.profile);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Filters
  const [search, setSearch] = useState("");
  const [universityFilter, setUniversityFilter] = useState("");
  const [smokingFilter, setSmokingFilter] = useState("no-preference");
  const [drinkingFilter, setDrinkingFilter] = useState("no-preference");
  const [studyFilter, setStudyFilter] = useState("no-preference");
  const [goingOutFilter, setGoingOutFilter] = useState("no-preference");
  const [genderFilter, setGenderFilter] = useState("no-preference");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  // Like state
  const [likedUsers, setLikedUsers] = useState<Set<string>>(new Set());
  const [mutualUsers, setMutualUsers] = useState<Set<string>>(new Set());

  const { data: users, isLoading } = useQuery({
    queryKey: ["roommate-users"],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(
          "id, full_name, username, avatar_url, last_seen, course, year_of_study, university, roommate_preferences, smoking_preference, drinking_preference, study_habit, going_out_pattern, roommate_budget_min, roommate_budget_max, roommate_gender_preference"
        )
        .eq("looking_for_roommate", true)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (smokingFilter !== "no-preference") query = query.eq("smoking_preference", smokingFilter);
      if (drinkingFilter !== "no-preference") query = query.eq("drinking_preference", drinkingFilter);
      if (studyFilter !== "no-preference") query = query.eq("study_habit", studyFilter);
      if (goingOutFilter !== "no-preference") query = query.eq("going_out_pattern", goingOutFilter);
      if (genderFilter !== "no-preference") query = query.eq("roommate_gender_preference", genderFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch like statuses
  useEffect(() => {
    if (!currentUserId || !users) return;
    Promise.all(
      users.map(async (u) => {
        const [liked, mutual] = await Promise.all([
          roommateService.hasLiked(currentUserId, u.id),
          roommateService.checkMutual(currentUserId, u.id),
        ]);
        return { id: u.id, liked, mutual };
      })
    ).then((results) => {
      const likedSet = new Set<string>();
      const mutualSet = new Set<string>();
      results.forEach((r) => {
        if (r.liked) likedSet.add(r.id);
        if (r.mutual) mutualSet.add(r.id);
      });
      setLikedUsers(likedSet);
      setMutualUsers(mutualSet);
    });
  }, [users, currentUserId]);

  const handleLikeToggle = async (userId: string) => {
    if (!currentUserId || !currentProfile) return;
    triggerHaptic();
    const currentlyLiked = likedUsers.has(userId);
    if (currentlyLiked) {
      await roommateService.unlikeUser(currentUserId, userId);
      setLikedUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } else {
      await roommateService.likeUser(currentUserId, userId);
      setLikedUsers((prev) => new Set(prev).add(userId));
      triggerNotification.like(userId, currentUserId, currentProfile.full_name ?? "Someone");
    }
    const mutual = await roommateService.checkMutual(currentUserId, userId);
    setMutualUsers((prev) => {
      const next = new Set(prev);
      if (mutual) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const allUniversities = useMemo(
    () => [...new Set((users ?? []).map((u) => u.university).filter(Boolean))].sort() as string[],
    [users]
  );

  const processed = useMemo(() => {
    if (!users) return [];
    const filtered = users.filter((u) => {
      const matchSearch =
        (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.course ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.roommate_preferences ?? "").toLowerCase().includes(search.toLowerCase());
      const matchUniversity = !universityFilter || u.university === universityFilter;
      const matchBudgetMin = !budgetMin || (u.roommate_budget_min ?? 0) >= Number(budgetMin);
      const matchBudgetMax = !budgetMax || (u.roommate_budget_max ?? Infinity) <= Number(budgetMax);
      return matchSearch && matchUniversity && matchBudgetMin && matchBudgetMax;
    });
    const hasOwnPrefs = currentProfile?.looking_for_roommate;
    const scored = filtered.map((u) => ({
      ...u,
      compatibility: hasOwnPrefs ? computeCompatibility(currentProfile, u) : 0,
    }));
    if (hasOwnPrefs) {
      scored.sort((a, b) => b.compatibility - a.compatibility);
    }
    return scored;
  }, [users, search, universityFilter, budgetMin, budgetMax, currentProfile]);

  const isOnline = (lastSeen: string | null) : boolean =>
    !!(lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000);

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
          🧑‍🤝‍🧑 Roommate Finder
        </h1>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">
        <RoommateFilters
          search={search} onSearchChange={setSearch}
          universityFilter={universityFilter} onUniversityChange={setUniversityFilter}
          universities={allUniversities}
          smokingFilter={smokingFilter} onSmokingChange={setSmokingFilter}
          drinkingFilter={drinkingFilter} onDrinkingChange={setDrinkingFilter}
          studyFilter={studyFilter} onStudyChange={setStudyFilter}
          goingOutFilter={goingOutFilter} onGoingOutChange={setGoingOutFilter}
          genderFilter={genderFilter} onGenderChange={setGenderFilter}
          budgetMin={budgetMin} onBudgetMinChange={setBudgetMin}
          budgetMax={budgetMax} onBudgetMaxChange={setBudgetMax}
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : processed.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <Users size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>No roommates found</h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {currentProfile?.looking_for_roommate
                ? "No matches right now. Tell your friends to join and set their preferences!"
                : "Set your own roommate preferences first to get personalised matches."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {processed.map((user) => (
              <RoommateCard
                key={user.id}
                user={user}
                isOnline={isOnline(user.last_seen)}
                compatibility={user.compatibility}
                isLiked={likedUsers.has(user.id)}
                isMutual={mutualUsers.has(user.id)}
                onToggleLike={() => handleLikeToggle(user.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}