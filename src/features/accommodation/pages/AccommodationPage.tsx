import { useEffect, useState, useMemo } from "react";
import { accommodationService } from "@/services/accommodation/accommodationService";
import type { Tables } from "@/types/database/database.types";
import { Plus, Building2 } from "lucide-react";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import AccommodationFilters from "@/features/accommodation/components/AccommodationFilters";
import AccommodationComposer from "@/features/accommodation/components/AccomodationComposer";

type Accommodation = Tables<"accommodations">;

export default function AccommodationPage() {
  const [listings, setListings] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  const load = async () => {
    try {
      const data = await accommodationService.getAccommodations();
      setListings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const locations = useMemo(
    () => [...new Set(listings.map((l) => l.location))].sort(),
    [listings]
  );

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLocation = !locationFilter || item.location === locationFilter;
      return matchSearch && matchLocation;
    });
  }, [listings, search, locationFilter]);

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

      <div className="px-4 pt-4 pb-8 flex flex-col gap-4">
        <AccommodationFilters
          search={search}
          onSearchChange={setSearch}
          locationFilter={locationFilter}
          onLocationChange={setLocationFilter}
          locations={locations}
        />

        {loading ? (
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
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <Building2 size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No listings found
            </p>
          </div>
        ) : (
          filtered.map((listing) => (
            <AccommodationCard key={listing.id} listing={listing} />
          ))
        )}
      </div>

      {showComposer && (
        <AccommodationComposer
          onClose={() => setShowComposer(false)}
          onCreated={() => load()}
        />
      )}
    </div>
  );
}