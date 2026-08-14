import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { useInView } from "react-intersection-observer";
import { useSearchParams } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { locationService } from "@/services/locations/locationService";
import { ZAMBIA_LOCATIONS } from "@/constants/locations";
import { Plus, Building2, Loader2, MapPin } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import AccommodationFilters from "@/features/accommodation/components/AccommodationFilters";
import AccommodationComposer from "@/features/accommodation/components/AccomodationComposer";
import MyAccommodations from "@/features/accommodation/components/MyAccommodations";
import LandlordStats from "@/features/accommodation/components/LandlordStats";
import { supabase } from "@/lib/supabase/client";

const PAGE_SIZE = 10;

export default function AccommodationPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const parentIdFromUrl = searchParams.get("parentId");

  const [showComposer, setShowComposer] = useState(false);

  // ---- Debounced search ----
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [locationFilter, setLocationFilter] = useState("");
  const [roommateFilter, setRoommateFilter] = useState(false);
  const [genderFilter, setGenderFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showMyAccommodations, setShowMyAccommodations] = useState(false);
  const [listingTypeFilter, setListingTypeFilter] = useState<"all" | "property" | "room" | "bedspace">("all");
  const [landlordStats, setLandlordStats] = useState<any>(null);
  const [landlordProfiles, setLandlordProfiles] = useState<Record<string, any>>({});
  const [allLocations, setAllLocations] = useState<string[]>(Array.from(ZAMBIA_LOCATIONS));

  useEffect(() => {
    locationService.getLocations().then((locs) => setAllLocations(locs));
  }, []);

  useEffect(() => {
    if (parentIdFromUrl) setShowComposer(true);
  }, [parentIdFromUrl]);

  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "price_asc" | "price_desc">("newest");

  useEffect(() => {
    if (showMyAccommodations && user) {
      accommodationService.getLandlordStats(user.id).then(setLandlordStats);
    }
  }, [showMyAccommodations, user]);

  const fetchAccommodations = async ({ pageParam = 0 }) => {
    const offset = pageParam * PAGE_SIZE;
    const data = await accommodationService.getAccommodationsPaginated(PAGE_SIZE, offset, {
      search: debouncedSearch || undefined,
      location: locationFilter || undefined,
      roommate: roommateFilter || undefined,
      gender: genderFilter || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      listingType: listingTypeFilter,
      sort: sortMode,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
    });
    return { listings: data, nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined };
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useInfiniteQuery({
    queryKey: [
      "accommodations",
      debouncedSearch,
      locationFilter,
      roommateFilter,
      genderFilter,
      priceMin,
      priceMax,
      listingTypeFilter,
      sortMode,
      selectedAmenities,
    ],
    queryFn: fetchAccommodations,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const { ref: loadMoreRef, inView } = useInView();
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allListings = data?.pages.flatMap((p) => p.listings) ?? [];

  const locations = useMemo(
    () => Array.from(new Set([...allLocations, ...allListings.map((l) => l.location)])).sort(),
    [allLocations, allListings]
  );

  useEffect(() => {
    if (allListings.length === 0) return;
    const ownerIds = [...new Set(allListings.map((l) => l.owner_id))];
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified, is_landlord, total_response_time_ms, response_count")
      .in("id", ownerIds)
      .then(({ data: profiles }) => {
        const map: Record<string, any> = {};
        profiles?.forEach((p) => {
          map[p.id] = p;
        });
        setLandlordProfiles(map);
      });
  }, [allListings]);

  const filtered = allListings;
  const noListings = status !== "pending" && filtered.length === 0;

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["accommodations"] });
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <h1 className="text-base font-extrabold text-slate-900 dark:text-white">Housing & Boarding</h1>
        <button
          onClick={() => setShowComposer(true)}
          className="btn-primary text-xs font-semibold px-4 py-1.5 rounded-full shadow-xs"
        >
          <Plus size={14} /> List Property
        </button>
      </div>

      <div className="px-4 pt-4 pb-8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMyAccommodations(!showMyAccommodations)}
            className="btn-ghost text-xs text-blue-600 dark:text-blue-400 font-semibold px-2 py-1"
          >
            {showMyAccommodations ? "Hide My Listings" : "Manage My Listings"}
          </button>

          {/* Active Filters Reset Pill */}
          {(locationFilter || roommateFilter || genderFilter || priceMin || priceMax || selectedAmenities.length > 0 || debouncedSearch) && (
            <button
              onClick={() => {
                setLocationFilter("");
                setRoommateFilter(false);
                setGenderFilter("");
                setPriceMin("");
                setPriceMax("");
                setSelectedAmenities([]);
                setSearchInput("");
              }}
              className="text-[11px] font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900 transition-colors"
            >
              Reset Active Filters ✕
            </button>
          )}
        </div>

        {showMyAccommodations && landlordStats && (
          <LandlordStats accommodations={landlordStats.accommodations} totalConversations={landlordStats.totalEnquiries} />
        )}
        {showMyAccommodations && <MyAccommodations />}

        {/* Side-Scrolling Campus Location Pill Track */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5 flex-nowrap">
          <button
            type="button"
            onClick={() => setLocationFilter("")}
            className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 border ${
              !locationFilter
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
            }`}
          >
            All Locations
          </button>
          {locations.slice(0, 15).map((loc) => {
            const shortLoc = loc.replace("Lusaka - ", "").replace("Kitwe - ", "").replace("Ndola - ", "");
            const isActive = locationFilter === loc;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setLocationFilter(isActive ? "" : loc)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 border flex items-center gap-1 ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
                }`}
              >
                <MapPin size={12} />
                <span>{shortLoc}</span>
              </button>
            );
          })}
        </div>

        <AccommodationFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          locationFilter={locationFilter}
          onLocationChange={setLocationFilter}
          locations={locations}
          roommateFilter={roommateFilter}
          onRoommateChange={setRoommateFilter}
          genderFilter={genderFilter}
          onGenderChange={setGenderFilter}
          priceMin={priceMin}
          onPriceMinChange={setPriceMin}
          priceMax={priceMax}
          onPriceMaxChange={setPriceMax}
          selectedAmenities={selectedAmenities}
          onAmenitiesChange={setSelectedAmenities}
        />

        {/* Listing type chips & Sort selector */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto hide-scrollbar py-1">
          <div className="flex gap-1.5">
            {(["all", "property", "room", "bedspace"] as const).map((type) => {
              const label = type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1);
              const active = listingTypeFilter === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setListingTypeFilter(type)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 border ${
                    active
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
            className="glass-select text-xs py-1.5 px-3 rounded-full shrink-0"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {status === "pending" ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton" style={{ height: 180 }} />
                <div className="p-4 flex flex-col gap-2">
                  <div className="skeleton rounded" style={{ height: 14, width: "70%" }} />
                  <div className="skeleton rounded" style={{ height: 12, width: "45%" }} />
                </div>
              </div>
            ))}
          </>
        ) : noListings ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <Building2 size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
              {debouncedSearch || locationFilter || roommateFilter || genderFilter || priceMin || priceMax || selectedAmenities.length > 0
                ? "No listings match your criteria"
                : "No listings yet"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              {debouncedSearch || locationFilter || roommateFilter || genderFilter || priceMin || priceMax || selectedAmenities.length > 0
                ? "Try adjusting your filters."
                : "Add the first accommodation!"}
            </p>
            {!debouncedSearch && !locationFilter && !roommateFilter && !genderFilter && !priceMin && !priceMax && selectedAmenities.length === 0 && (
              <button onClick={() => setShowComposer(true)} className="btn-primary w-auto px-6 mx-auto inline-flex items-center gap-2">
                <Plus size={16} /> Add your first listing
              </button>
            )}
          </div>
        ) : (
          <>
            {filtered.map((listing) => {
              const landlord = landlordProfiles[listing.owner_id];
              return <AccommodationCard key={listing.id} listing={listing} landlord={landlord} />;
            })}
            <div ref={loadMoreRef} className="h-4" />
            {isFetchingNextPage && <Loader2 className="animate-spin mx-auto" style={{ color: "var(--color-text-muted)" }} />}
          </>
        )}
      </div>

      {showComposer && (
        <AccommodationComposer
          onClose={() => setShowComposer(false)}
          onCreated={handleCreated}
          initialListingType={parentIdFromUrl ? "room" : undefined}
          initialParentId={parentIdFromUrl ?? undefined}
        />
      )}
    </div>
  );
}

