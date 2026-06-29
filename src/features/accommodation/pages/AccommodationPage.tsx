import { useState, useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { Plus, Building2, Loader2 } from "lucide-react";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import AccommodationFilters from "@/features/accommodation/components/AccommodationFilters";
import AccommodationComposer from "@/features/accommodation/components/AccomodationComposer";

import MyAccommodations from "@/features/accommodation/components/MyAccommodations";



const PAGE_SIZE = 10;

export default function AccommodationPage() {
  const queryClient = useQueryClient();
  const [showComposer, setShowComposer] = useState(false);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [roommateFilter, setRoommateFilter] = useState(false);
  const [genderFilter, setGenderFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showMyAccommodations, setShowMyAccommodations] = useState(false);
  
  const fetchAccommodations = async ({ pageParam = 0 }) => {
    const offset = pageParam * PAGE_SIZE;
    const data = await accommodationService.getAccommodationsPaginated(PAGE_SIZE, offset);
    return {
      listings: data,
      nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ["accommodations", search, locationFilter, roommateFilter, genderFilter, priceMin, priceMax],
      queryFn: fetchAccommodations,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextPage,
    });

  const { ref: loadMoreRef, inView } = useInView();
  if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();

  const allListings = data?.pages.flatMap((p) => p.listings) ?? [];

  const locations = useMemo(
    () => [...new Set(allListings.map((l) => l.location))].sort(),
    [allListings]
  );

  // Client‑side filtering (will move to server later for better performance)
  const filtered = useMemo(() => {
    return allListings.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLocation = !locationFilter || item.location === locationFilter;
      const matchRoommate = !roommateFilter || item.looking_for_roommate;
      const matchGender = !genderFilter || item.gender_preference === genderFilter;
      const matchPriceMin = !priceMin || item.monthly_rent >= Number(priceMin);
      const matchPriceMax = !priceMax || item.monthly_rent <= Number(priceMax);
      return matchSearch && matchLocation && matchRoommate && matchGender && matchPriceMin && matchPriceMax;
    });
  }, [allListings, search, locationFilter, roommateFilter, genderFilter, priceMin, priceMax]);

  const noListings = status !== "pending" && filtered.length === 0;

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["accommodations"] });
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
          Housing
        </h1>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          <Plus size={15} /> List
        </button>
      </div>
<button onClick={() => setShowMyAccommodations(!showMyAccommodations)} className="btn-ghost text-xs">
  {showMyAccommodations ? "Hide" : "My Accommodations"}
</button>

{showMyAccommodations && <MyAccommodations />}

      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        <AccommodationFilters
          search={search}
          onSearchChange={setSearch}
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
        />

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
          <div
          className="rounded-2xl py-16 text-center"
          style={{
              background: "var(--color-surface)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <Building2 size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
              {search || locationFilter || roommateFilter || genderFilter || priceMin || priceMax
                ? "No listings match your criteria"
                : "No listings yet"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              {search || locationFilter || roommateFilter || genderFilter || priceMin || priceMax
                ? "Try adjusting your filters."
                : "Add the first accommodation!"}
            </p>
            {!search && !locationFilter && !roommateFilter && !genderFilter && !priceMin && !priceMax && (
              <button
              onClick={() => setShowComposer(true)}
                className="btn-primary w-auto px-6 mx-auto inline-flex items-center gap-2"
              >
                <Plus size={16} /> Add your first listing
              </button>
            )}
          </div>
        ) : (
          <>
            {filtered.map((listing) => (
              <AccommodationCard key={listing.id} listing={listing} />
            ))}
            <div ref={loadMoreRef} className="h-4" />
            {isFetchingNextPage && (
              <Loader2 className="animate-spin mx-auto" style={{ color: "var(--color-text-muted)" }} />
            )}
          </>
        )}
      </div>

      {showComposer && (
        <AccommodationComposer onClose={() => setShowComposer(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}