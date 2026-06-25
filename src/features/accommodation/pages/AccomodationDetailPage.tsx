import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { messageService } from "@/services/messages/messageService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import type { Tables } from "@/types/database/database.types";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Share2,
  Loader2,
  ShieldCheck,
  Building2,
} from "lucide-react";

type Accommodation = Tables<"accommodations">;
type Profile = Tables<"profiles">;

type AccommodationWithLandlord = Accommodation & {
  landlord?: Pick<Profile, "id" | "full_name" | "avatar_url" | "is_verified" | "is_landlord">;
};

export default function AccommodationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [accommodation, setAccommodation] = useState<AccommodationWithLandlord | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    if (!id) return;
    accommodationService.getAccommodationWithLandlord(id).then((data) => {
      setAccommodation(data);
      setLoading(false);
    });
  }, [id]);

  const handleContactLandlord = async () => {
    if (!user || !accommodation) return;
    setContacting(true);
    try {
      const existingConvos = await messageService.getConversations(user.id);
      const existing = existingConvos.find(
        (c) =>
          (c.user1_id === user.id && c.user2_id === accommodation.owner_id) ||
          (c.user2_id === user.id && c.user1_id === accommodation.owner_id)
      );
      let convId = existing?.id;
      if (!convId) {
        const newConv = await messageService.createConversation(user.id, accommodation.owner_id);
        convId = newConv.id;
      }

      // ✅ Fixed: added accommodation.id as second argument
      triggerNotification.accommodationInterest(
        accommodation.owner_id,
        accommodation.id,
        accommodation.title,
        profile?.full_name ?? "Someone"
      );

      navigate(`/messages?conversation=${convId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setContacting(false);
    }
  };

  const handleShare = async () => {
    if (!accommodation) return;
    try {
      await navigator.share({
        title: accommodation.title,
        text: `Check out: ${accommodation.title} at ${accommodation.location} for K${accommodation.monthly_rent}/month`,
        url: window.location.href,
      });
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={24} />
      </div>
    );
  }

  if (!accommodation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Listing not found.
        </p>
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs">
          Go back
        </button>
      </div>
    );
  }

  const isOwner = user?.id === accommodation.owner_id;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <button aria-label="button" onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
        <h1 className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
          Detail
        </h1>
        <button aria-label="button" onClick={handleShare} className="p-1">
          <Share2 size={18} style={{ color: "var(--color-text-secondary)" }} />
        </button>
      </div>

      {/* Image */}
      {accommodation.image_url ? (
        <img
          src={accommodation.image_url}
          alt={accommodation.title}
          className="w-full h-56 object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-56 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))" }}
        >
          <Building2 size={48} color="rgba(255,255,255,0.3)" />
        </div>
      )}

      <div className="px-4 pt-4 pb-8 space-y-4">
        {/* Title & location */}
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            {accommodation.title}
          </h2>
          <p className="flex items-center gap-1 text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            <MapPin size={14} /> {accommodation.location}
          </p>
        </div>

        {/* Rent & status */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>
              K{accommodation.monthly_rent.toLocaleString()}
            </span>
            <span className="text-sm ml-1" style={{ color: "var(--color-text-muted)" }}>
              /month
            </span>
          </div>
          <span className={`badge ${accommodation.status === "available" ? "badge-amber" : "badge-green"}`}>
            {accommodation.status || "available"}
          </span>
        </div>

        {/* Description */}
        {accommodation.description && (
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>
              Description
            </h3>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
              {accommodation.description}
            </p>
          </div>
        )}

        {/* Landlord Card */}
        {accommodation.landlord && (
          <div className="card p-4 flex items-center gap-4">
            {accommodation.landlord.avatar_url ? (
              <img
              alt="avatar"
                src={accommodation.landlord.avatar_url}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: "var(--color-primary)" }}
              >
                {(accommodation.landlord.full_name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm flex items-center gap-1">
                {accommodation.landlord.full_name || "Landlord"}
                {accommodation.landlord.is_verified && (
                  <ShieldCheck
                    size={14}
                    style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }}
                  />
                )}
                {accommodation.landlord.is_landlord && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--color-accent-light)", color: "#0C4A6E" }}
                  >
                    Landlord
                  </span>
                )}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {accommodation.landlord.is_verified ? "Verified" : "Unverified"} profile
              </p>
            </div>
            {!isOwner && (
              <button
                onClick={handleContactLandlord}
                disabled={contacting}
                className="btn-primary w-auto px-4 py-2 text-sm flex items-center gap-2"
              >
                {contacting ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                Contact
              </button>
            )}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="mt-4 space-y-2">
            <button
              onClick={() =>
                accommodationService
                  .updateAccommodationStatus(accommodation.id, "rented")
                  .then(() => navigate(-1))
              }
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              Mark as Rented
            </button>
            <button
              onClick={async () => {
                if (confirm("Delete this listing?")) {
                  await accommodationService.deleteAccommodation(accommodation.id);
                  navigate(-1);
                }
              }}
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ background: "#FEE2E2", color: "var(--color-danger)" }}
            >
              Delete Listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}