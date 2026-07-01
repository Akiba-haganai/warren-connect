import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { messageService } from "@/services/messages/messageService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import { reportService } from "@/services/reports/reportService";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";
import type { Tables } from "@/types/database/database.types";
import {
  ArrowLeft, MapPin, MessageCircle, Share2, Loader2,
  ShieldCheck, Building2, Flag, Calendar,
  Wifi, Droplet, Zap, Sofa, Car, Shield, BookOpen, Bath
} from "lucide-react";

type Accommodation = Tables<"accommodations">;
type Profile = Tables<"profiles">;

type AccommodationWithLandlord = Accommodation & {
  landlord?: Pick<Profile, "id" | "full_name" | "avatar_url" | "is_verified" | "is_landlord">;
};

const COMMON_AMENITIES = [
  "WiFi", "Water included", "Electricity included", "Furnished",
  "Parking", "Security", "Study desk", "Private bathroom",
];

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi size={14} />,
  "Water included": <Droplet size={14} />,
  "Electricity included": <Zap size={14} />,
  Furnished: <Sofa size={14} />,
  Parking: <Car size={14} />,
  Security: <Shield size={14} />,
  "Study desk": <BookOpen size={14} />,
  "Private bathroom": <Bath size={14} />,
};

export default function AccommodationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [accommodation, setAccommodation] = useState<AccommodationWithLandlord | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [images, setImages] = useState<{ id: string; image_url: string }[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [editingAmenities, setEditingAmenities] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const { addToRecent } = useRecentlyViewed();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await accommodationService.getAccommodationWithLandlord(id);
        setAccommodation(data);
        const imgs = await accommodationService.getImages(id);
        setImages(imgs);
        const ams = await accommodationService.getAmenities(id);
        setAmenities(ams);
        setSelectedAmenities(ams);
        addToRecent({
          id: data.id,
          type: "accommodation",
          title: data.title,
          imageUrl: data.image_url,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, addToRecent]);

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
      triggerNotification.accommodationInterest(
        accommodation.owner_id, accommodation.id,
        accommodation.title, profile?.full_name ?? "Someone"
      );
      navigate(`/messages?conversation=${convId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setContacting(false);
    }
  };

  const handleRequestBooking = async () => {
    if (!user || !accommodation) return;
    try {
      triggerNotification.accommodationInterest(
        accommodation.owner_id, accommodation.id,
        accommodation.title, profile?.full_name ?? "Someone"
      );
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
        await messageService.sendMessage(
          convId,
          user.id,
          `Hi, I'm interested in booking "${accommodation.title}". Is it still available?`
        );
      }
      navigate(`/messages?conversation=${convId}`);
    } catch (err) {
      console.error(err);
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

  const handleReport = async () => {
    if (!user) return;
    const reason = prompt("Why are you reporting this listing?");
    if (reason) {
      try {
        await reportService.submitReport(user.id, "accommodation", accommodation!.id, reason);
        alert("Report submitted.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveAmenities = async () => {
    if (!accommodation) return;
    await accommodationService.setAmenities(accommodation.id, selectedAmenities);
    setAmenities(selectedAmenities);
    setEditingAmenities(false);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
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
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Listing not found.</p>
        <button onClick={() => navigate(-1)} className="btn-ghost text-xs">Go back</button>
      </div>
    );
  }

  const isOwner = user?.id === accommodation.owner_id;
  const displayImages = images.length > 0
    ? images
    : (accommodation.image_url ? [{ id: "main", image_url: accommodation.image_url }] : []);

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Go back">
          <ArrowLeft size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
        <h1 className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>Detail</h1>
        <div className="flex items-center gap-2">
          {!isOwner && (
            <button onClick={handleReport} className="p-1" aria-label="Report listing">
              <Flag size={18} style={{ color: "var(--color-text-muted)" }} />
            </button>
          )}
          <button onClick={handleShare} className="p-1" aria-label="Share listing">
            <Share2 size={18} style={{ color: "var(--color-text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* Gallery */}
      {displayImages.length > 0 && (
        <div>
          <img
            src={displayImages[selectedImage]?.image_url}
            alt={accommodation.title}
            className="w-full h-56 object-cover"
            loading="lazy"
          />
          {displayImages.length > 1 && (
            <div className="flex gap-2 px-4 mt-2 overflow-x-auto pb-1">
              {displayImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                    i === selectedImage ? "border-primary" : "border-transparent"
                  }`}
                  style={{ borderColor: i === selectedImage ? "var(--color-primary)" : "transparent" }}
                >
                  <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {displayImages.length === 0 && (
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
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{accommodation.title}</h2>
          <p className="flex items-center gap-1 text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            <MapPin size={14} /> {accommodation.location}
          </p>
        </div>

        {/* Rent & status */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-extrabold" style={{ color: "var(--color-primary)" }}>K{accommodation.monthly_rent.toLocaleString()}</span>
            <span className="text-sm ml-1" style={{ color: "var(--color-text-muted)" }}>/month</span>
          </div>
          <span className={`badge ${accommodation.status === "available" ? "badge-amber" : "badge-green"}`}>
            {accommodation.status || "available"}
          </span>
        </div>

        {/* Amenities */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Amenities</h3>
            {isOwner && !editingAmenities && (
              <button onClick={() => setEditingAmenities(true)} className="text-xs text-primary">Edit</button>
            )}
          </div>
          {editingAmenities ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_AMENITIES.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    selectedAmenities.includes(a)
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-secondary border-border"
                  }`}
                  style={{
                    background: selectedAmenities.includes(a) ? "var(--color-primary)" : "var(--color-surface)",
                    color: selectedAmenities.includes(a) ? "#fff" : "var(--color-text-secondary)",
                    borderColor: selectedAmenities.includes(a) ? "var(--color-primary)" : "var(--color-border)",
                  }}
                >
                  {a}
                </button>
              ))}
              <button onClick={handleSaveAmenities} className="btn-primary w-auto px-4 py-1 text-xs">Save</button>
              <button onClick={() => { setSelectedAmenities(amenities); setEditingAmenities(false); }} className="btn-ghost text-xs">Cancel</button>
            </div>
          ) : amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => (
                <span key={a} className="badge badge-amber flex items-center gap-1">
                  {AMENITY_ICONS[a] || null}
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">No amenities listed.</p>
          )}
        </div>

        {/* Description */}
        {accommodation.description && (
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-secondary)" }}>Description</h3>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{accommodation.description}</p>
          </div>
        )}

        {/* Landlord Card */}
        {accommodation.landlord && (
          <div className="card p-4 flex items-center gap-4">
            <Link to={`/user/${accommodation.landlord.id}`} className="flex-shrink-0">
              {accommodation.landlord.avatar_url ? (
                <img src={accommodation.landlord.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "var(--color-primary)" }}>
                  {(accommodation.landlord.full_name?.[0] ?? "?").toUpperCase()}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/user/${accommodation.landlord.id}`} className="font-semibold text-sm flex items-center gap-1" style={{ color: "var(--color-text)" }}>
                {accommodation.landlord.full_name || "Landlord"}
                {accommodation.landlord.is_verified && <ShieldCheck size={14} style={{ color: "var(--color-accent)", fill: "var(--color-accent)" }} />}
                {accommodation.landlord.is_landlord && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-accent-light)", color: "#0C4A6E" }}>Landlord</span>
                )}
              </Link>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{accommodation.landlord.is_verified ? "Verified" : "Unverified"} profile</p>
            </div>
            {!isOwner && (
              <div className="flex flex-col gap-2">
                <button onClick={handleRequestBooking} className="btn-accent w-auto px-4 py-2 text-sm flex items-center gap-2">
                  <Calendar size={14} /> Request to Book
                </button>
                <button onClick={handleContactLandlord} disabled={contacting} className="btn-primary w-auto px-4 py-2 text-sm flex items-center gap-2">
                  {contacting ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />} Contact
                </button>
              </div>
            )}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => accommodationService.updateAccommodationStatus(accommodation.id, "rented").then(() => navigate(-1))}
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              Mark as Rented
            </button>
            <button
              onClick={async () => { if (confirm("Delete?")) { await accommodationService.deleteAccommodation(accommodation.id); navigate(-1); } }}
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