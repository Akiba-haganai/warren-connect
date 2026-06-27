import { Link } from "react-router-dom";
import { MapPin, Building2 } from "lucide-react";
import type { Tables } from "@/types/database/database.types";
import SaveButton from "@/components/ui/SaveButton";

type Accommodation = Tables<"accommodations">;

interface Props {
  listing: Accommodation;
  onView?: (id: string) => void; // for recently viewed
}

export default function AccommodationCard({ listing, onView }: Props) {
  return (
    <Link
      to={`/accommodation/${listing.id}`}
      className="card overflow-hidden block relative"
      style={{ textDecoration: "none", color: "inherit" }}
      onClick={() => onView?.(listing.id)}
      aria-label={`View accommodation: ${listing.title}`}
    >
      {/* Save button top-right */}
      <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
        <SaveButton itemType="accommodation" itemId={listing.id} />
      </div>

      {listing.image_url ? (
        <img
          src={listing.image_url}
          alt={listing.title}
          className="w-full object-cover"
          style={{ height: 180 }}
          loading="lazy"
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            height: 160,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
          }}
        >
          <Building2 size={36} color="rgba(255,255,255,0.3)" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
          {listing.title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin size={12} style={{ color: "var(--color-text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {listing.location}
          </p>
        </div>
        {listing.description && (
          <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
            {listing.description}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
            K{listing.monthly_rent.toLocaleString()}
            <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
              /mo
            </span>
          </span>
          {listing.looking_for_roommate && (
  <span className="badge badge-amber ml-1">🧑‍🤝‍🧑 Roommate</span>
)}
          <span className={`badge ${listing.status === "available" ? "badge-amber" : "badge-green"}`}>
            {listing.status || "available"}
          </span>
        </div>
      </div>
    </Link>
  );
}