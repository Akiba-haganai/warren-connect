import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";


import { useInView } from "react-intersection-observer";
import { useSearchParams } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { Plus, Building2, Loader2 } from "lucide-react";
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

  useEffect(() => {
    if (parentIdFromUrl) setShowComposer(true);
  }, [parentIdFromUrl]);

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
    () => [...new Set(allListings.map((l) => l.location))].sort(),
    [allListings]
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

  // ---- Amenities – batched query (N+1 fix) ----
  const [allAmenities, setAllAmenities] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (allListings.length === 0) return;
    const ids = allListings.map((l) => l.id);
    supabase
      .from("accommodation_amenities")
      .select("accommodation_id, amenity")
      .in("accommodation_id", ids)
      .then(({ data }) => {
        const map: Record<string, string[]> = {};
        (data || []).forEach((row: any) => {
          if (!map[row.accommodation_id]) map[row.accommodation_id] = [];
          map[row.accommodation_id].push(row.amenity);
        });
        setAllAmenities(map);
      });
  }, [allListings]);

  const filtered = useMemo(() => {
    return allListings.filter((item) => {
      const matchAmenities =
        selectedAmenities.length === 0 ||
        (allAmenities[item.id] && selectedAmenities.every((a) => allAmenities[item.id].includes(a)));
      return matchAmenities;
    });
  }, [allListings, selectedAmenities, allAmenities]);

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
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Housing</h1>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          <Plus size={15} /> List
        </button>
      </div>

      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        <button onClick={() => setShowMyAccommodations(!showMyAccommodations)} className="btn-ghost text-xs self-start">
          {showMyAccommodations ? "Hide" : "My Accommodations"}
        </button>
        {showMyAccommodations && landlordStats && (
          <LandlordStats accommodations={landlordStats.accommodations} totalConversations={landlordStats.totalEnquiries} />
        )}
        {showMyAccommodations && <MyAccommodations />}

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

        {/* Listing type chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mb-1">
          {(["all", "property", "room", "bedspace"] as const).map((type) => {
            const label = type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1);
            const active = listingTypeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setListingTypeFilter(type)}
                className={`text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap ${
                  active ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                }`}
                style={{
                  background: active ? "var(--color-primary)" : "var(--color-bg)",
                  color: active ? "#fff" : "var(--color-text-secondary)",
                  border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                }}
              >
                {label}
              </button>
            );
          })}
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

