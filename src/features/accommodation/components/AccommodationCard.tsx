import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Building2, Zap, Users, CheckCircle2, DoorClosed, BedDouble, Share2 } from "lucide-react";

import type { Tables } from "@/types/database/database.types";
import SaveButton from "@/components/ui/SaveButton";
import ShareModal from "@/components/share/ShareModal";

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
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const avgResponseMs = landlord && landlord.response_count && landlord.total_response_time_ms
    ? landlord.total_response_time_ms / landlord.response_count
    : null;
  const isFastResponder = avgResponseMs !== null && avgResponseMs < 1800000; // < 30 minutes

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareModalOpen(true);
  };

  return (
    <>
      <Link
        to={`/accommodation/${listing.id}`}
        className="card overflow-hidden block relative"
        style={{ textDecoration: "none", color: "inherit" }}
        onClick={() => onView?.(listing.id)}
        aria-label={`View accommodation: ${listing.title}`}
      >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleShare}
          className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/40 hover:scale-105 active:scale-95 shadow-lg transition-all cursor-pointer"
          aria-label="Share listing"
        >
          <Share2 size={14} style={{ filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.3))" }} />
        </button>
        <SaveButton itemType="accommodation" itemId={listing.id} />
      </div>

      {listing.image_url ? (
        <img src={listing.image_url} alt={listing.title} className="w-full object-cover" style={{ height: 180 }} loading="lazy" decoding="async" />
      ) : (
        <div className="flex items-center justify-center" style={{ height: 160, background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" }}>
          <Building2 size={36} color="rgba(255,255,255,0.3)" />
        </div>
      )}

      {/* Overlay badge stack — both anchored top-left, stacked vertically */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {landlord?.is_verified && (
          <div className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs">
            <CheckCircle2 size={12} className="text-emerald-300" /> Verified Landlord
          </div>
        )}
        {isFastResponder && (
          <div className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            <Zap size={10} /> Fast responder
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{listing.title}</h3>
        </div>
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

          {listing.listing_type ? (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
              listing.listing_type === "room"
                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                : listing.listing_type === "bedspace"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
            }`}>
              {listing.listing_type === "room" ? (
                <DoorClosed size={11} />
              ) : listing.listing_type === "bedspace" ? (
                <BedDouble size={11} />
              ) : (
                <Building2 size={11} />
              )}
              <span>{listing.listing_type}</span>
            </span>
          ) : null}
        </div>

        {listing.description && (
          <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>{listing.description}</p>
        )}
        
        <div className="flex flex-col gap-0.5 mt-2">
          {listing.created_at && (
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Listed {new Date(listing.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
          {(listing as any).updated_at && listing.created_at && (new Date((listing as any).updated_at).getTime() - new Date(listing.created_at).getTime() > 60000) && (
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Edited {new Date((listing as any).updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
            K{listing.monthly_rent.toLocaleString()}<span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>/mo</span>
          </span>
          {listing.looking_for_roommate && <span className="badge badge-amber ml-1">🧑‍🤝‍🧑 Roommate</span>}
          <span className={`badge ${listing.status === "available" ? "badge-green" : "badge-amber"}`}>{listing.status || "available"}</span>
        </div>

      </div>
    </Link>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={listing.title}
        price={listing.monthly_rent}
        url={`${window.location.origin}/accommodation/${listing.id}`}
        imageUrl={listing.image_url || undefined}
        location={listing.location}
        category="accommodation"
      />
    </>
  );
}