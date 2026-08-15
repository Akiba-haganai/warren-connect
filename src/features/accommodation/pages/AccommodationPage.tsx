import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { useInView } from "react-intersection-observer";
import { useSearchParams } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { locationService } from "@/services/locations/locationService";
import { ZAMBIA_LOCATIONS } from "@/constants/locations";
import { Plus, Building2, Loader2, MapPin, X } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import AccommodationFilters from "@/features/accommodation/components/AccommodationFilters";
import AccommodationComposer from "@/features/accommodation/components/AccomodationComposer";
import LandlordPortal from "@/features/accommodation/components/LandlordPortal";
import EditAccommodationModal from "@/features/accommodation/components/EditAccommodationModal";
import RecentlyViewedSection from "@/components/ui/RecentlyViewedSection";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { supabase } from "@/lib/supabase/client";

const PAGE_SIZE = 10;

export default function AccommodationPage() {
  const { subHeaderVisible } = useScrollHeader();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const parentIdFromUrl = searchParams.get("parentId");

  const [showComposer, setShowComposer] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [composerParentId, setComposerParentId] = useState<string | undefined>(undefined);

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
  const [listingTypeFilter, setListingTypeFilter] = useState<"all" | "property" | "room" | "bedspace">("all");
  const [landlordProfiles, setLandlordProfiles] = useState<Record<string, any>>({});
  const [allLocations, setAllLocations] = useState<string[]>(Array.from(ZAMBIA_LOCATIONS));

  useEffect(() => {
    locationService.getLocations().then((locs) => setAllLocations(locs));
  }, []);

  useEffect(() => {
    if (parentIdFromUrl) setShowComposer(true);
  }, [parentIdFromUrl]);

  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "price_asc" | "price_desc">("newest");

  const [myListings, setMyListings] = useState<any[]>([]);

  const fetchMyListings = () => {
    if (!user) return;
    accommodationService.getMyAccommodations(user.id).then(setMyListings).catch(() => {});
  };

  useEffect(() => {
    if (user) fetchMyListings();
  }, [user]);

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
  const totalCount = data?.pages.reduce((acc, p) => acc + p.listings.length, 0) ?? 0;
  const noListings = status !== "pending" && filtered.length === 0;

  const handleCreated = () => {
    fetchMyListings();
    queryClient.invalidateQueries({ queryKey: ["accommodations"] });
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
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
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Housing &amp; Student Hubs</h1>
            <p className="text-[10px] text-slate-400 font-medium">PLAWZA Campus Accommodations</p>
          </div>
        </div>
        <button
          onClick={() => {
            setComposerParentId(undefined);
            setShowComposer(true);
          }}
          className="btn-primary text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-xs flex items-center gap-1.5"
        >
          <Plus size={14} /> List Property
        </button>
      </div>

      <div className="px-4 pt-4 pb-8 flex flex-col gap-3">
        <RecentlyViewedSection filterType="accommodation" title="Recently Viewed Housing" />

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowPortal(true)}
            className="btn-ghost text-xs text-primary font-bold px-2 py-1 flex items-center gap-1"
          >
            <Building2 size={13} />
            Landlord Management Hub
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

        {/* Active filter chips — individual removable tags */}
        {(locationFilter || roommateFilter || genderFilter || priceMin || priceMax || selectedAmenities.length > 0 || debouncedSearch) && (
          <div className="flex flex-wrap gap-1.5">
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-border">
                🔍 &ldquo;{debouncedSearch}&rdquo;
                <button type="button" onClick={() => setSearchInput("")} className="hover:text-red-500 transition-colors"><X size={11} /></button>
              </span>
            )}
            {locationFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <MapPin size={11} />{locationFilter.replace("Lusaka - ", "").replace("Kitwe - ", "").replace("Ndola - ", "")}
                <button type="button" onClick={() => setLocationFilter("")} className="hover:text-red-500 transition-colors"><X size={11} /></button>
              </span>
            )}
            {roommateFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Roommate
                <button type="button" onClick={() => setRoommateFilter(false)} className="hover:text-red-500 transition-colors"><X size={11} /></button>
              </span>
            )}
            {genderFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {genderFilter.charAt(0).toUpperCase() + genderFilter.slice(1)}
                <button type="button" onClick={() => setGenderFilter("")} className="hover:text-red-500 transition-colors"><X size={11} /></button>
              </span>
            )}
            {(priceMin || priceMax) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                K{priceMin || "0"} – K{priceMax || "∞"}
                <button type="button" onClick={() => { setPriceMin(""); setPriceMax(""); }} className="hover:text-red-500 transition-colors"><X size={11} /></button>
              </span>
            )}
            {selectedAmenities.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-white dark:bg-white dark:text-slate-900 border border-transparent">
                {a}
                <button type="button" onClick={() => setSelectedAmenities((prev) => prev.filter((x) => x !== a))} className="hover:text-red-400 dark:hover:text-red-600 transition-colors"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}


        {/* Side-Scrolling Campus Location Pill Track */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1 flex-nowrap" style={{ WebkitOverflowScrolling: "touch" }}>
          <button
            type="button"
            onClick={() => setLocationFilter("")}
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all shrink-0 border ${
              !locationFilter
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
            }`}
          >
            All Locations
          </button>
          {locations.map((loc) => {
            const shortLoc = loc.replace("Lusaka - ", "").replace("Kitwe - ", "").replace("Ndola - ", "");
            const isActive = locationFilter === loc;
            return (
              <button
                key={loc}
                type="button"
                onClick={() => setLocationFilter(isActive ? "" : loc)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 border flex items-center gap-1 ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-xs font-bold"
                    : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
                }`}
              >
                <MapPin size={12} className={isActive ? "text-white" : "text-primary"} />
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
            {status === "success" && totalCount > 0 && (
              <p className="text-[11px] text-slate-400 font-medium px-1">
                Showing {totalCount} listing{totalCount !== 1 ? "s" : ""}{hasNextPage ? "+" : ""}
              </p>
            )}
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
          onClose={() => {
            setShowComposer(false);
            setComposerParentId(undefined);
          }}
          onCreated={handleCreated}
          initialListingType={composerParentId || parentIdFromUrl ? "room" : undefined}
          initialParentId={composerParentId || parentIdFromUrl || undefined}
        />
      )}

      {showPortal && (
        <LandlordPortal
          listings={myListings}
          onClose={() => setShowPortal(false)}
          onRefresh={handleCreated}
          onAddProperty={() => {
            setComposerParentId(undefined);
            setShowComposer(true);
          }}
          onAddRoom={(parentId) => {
            setComposerParentId(parentId);
            setShowComposer(true);
          }}
          onEditListing={(listing) => setEditingListing(listing)}
        />
      )}

      {editingListing && (
        <EditAccommodationModal
          accommodation={editingListing}
          onClose={() => setEditingListing(null)}
          onUpdated={() => {
            setEditingListing(null);
            handleCreated();
          }}
        />
      )}
    </div>
  );
}

