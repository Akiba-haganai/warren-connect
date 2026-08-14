import { Link } from "react-router-dom";
import { MapPin, Building2, Zap, Users, CheckCircle2 } from "lucide-react";

import type { Tables } from "@/types/database/database.types";
import SaveButton from "@/components/ui/SaveButton";

type Accommodation = Tables<"accommodations">;

interface Props {
  listing: Accommodation;
  onView?: (id: string) => void;
  landlord?: {
    full_name?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean | null;
    is_landlord?: boolean | null;
    total_response_time_ms?: number | null;
    response_count?: number | null;
  };
}

export default function AccommodationCard({ listing, onView, landlord }: Props) {
  const avgResponseMs = landlord && landlord.response_count && landlord.total_response_time_ms
    ? landlord.total_response_time_ms / landlord.response_count
    : null;
  const isFastResponder = avgResponseMs !== null && avgResponseMs < 60000;

  return (
    <Link
      to={`/accommodation/${listing.id}`}
      className="card overflow-hidden block relative"
      style={{ textDecoration: "none", color: "inherit" }}
      onClick={() => onView?.(listing.id)}
      aria-label={`View accommodation: ${listing.title}`}
    >
      <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
        <SaveButton itemType="accommodation" itemId={listing.id} />
      </div>

      {listing.image_url ? (
        <img src={listing.image_url} alt={listing.title} className="w-full object-cover" style={{ height: 180 }} loading="lazy" />
      ) : (
        <div className="flex items-center justify-center" style={{ height: 160, background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" }}>
          <Building2 size={36} color="rgba(255,255,255,0.3)" />
        </div>
      )}

      {/* Verified Landlord Badge Overlay */}
      {landlord?.is_verified && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs">
          <CheckCircle2 size={12} className="text-emerald-300" /> Verified Landlord
        </div>
      )}

      {isFastResponder && (
        <div className="absolute top-9 left-2 z-10 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
          <Zap size={10} /> Fast responder
        </div>
      )}

      <div className="p-4">
        <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{listing.title}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin size={12} style={{ color: "var(--color-text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{listing.location}</p>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {listing.capacity ? (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
              <Users size={12} /> {listing.capacity}
            </span>
          ) : null}

          {listing.listing_type && listing.listing_type !== "property" ? (
            <span className="badge text-[10px] capitalize bg-purple-100 text-purple-700">
              {listing.listing_type}
            </span>
          ) : null}
        </div>

        {listing.description && (
          <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>{listing.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
            K{listing.monthly_rent.toLocaleString()}<span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>/mo</span>
          </span>
          {listing.looking_for_roommate && <span className="badge badge-amber ml-1">🧑‍🤝‍🧑 Roommate</span>}
          <span className={`badge ${listing.status === "available" ? "badge-amber" : "badge-green"}`}>{listing.status || "available"}</span>
        </div>

      </div>
    </Link>
  );
}