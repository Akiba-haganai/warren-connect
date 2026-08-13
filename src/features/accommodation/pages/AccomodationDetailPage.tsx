import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { messageService } from "@/services/messages/messageService";
import { useAuthStore } from "@/store/auth/authStore";
import { triggerNotification } from "@/services/notifications/triggerService";
import { reportService } from "@/services/reports/reportService";
import { listingInterestService } from "@/services/accommodation/listingInterestService";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";

import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/database.types";
import {
  ArrowLeft, MapPin, MessageCircle, Share2, Loader2,
  ShieldCheck, Building2, Flag, Calendar, ChevronDown, Plus, Trash2, Search,
  Wifi, Droplet, Zap, Sofa, Car, Shield, BookOpen, Bath
} from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";
import InterestQueue from "@/features/accommodation/components/InterestQueue";

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
  const { confirm, ConfirmDialog } = useConfirm();
  const { addToRecent } = useRecentlyViewed();

  const [accommodation, setAccommodation] = useState<AccommodationWithLandlord | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);
  const [images, setImages] = useState<{ id: string; image_url: string }[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [editingAmenities, setEditingAmenities] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [rooms, setRooms] = useState<Accommodation[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [collabSearch, setCollabSearch] = useState("");
  const [collabResults, setCollabResults] = useState<any[]>([]);
  const [addingCollaboratorLoading, setAddingCollaboratorLoading] = useState(false);

  const [myAccommodations, setMyAccommodations] = useState<Accommodation[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadAccommodation = async () => {
    if (!id) return;
    const data = await accommodationService.getAccommodationWithLandlord(id);
    if (!data) {
      setAccommodation(null); // triggers "Listing not found" UI
      return;
    }
    setAccommodation(data);
    const imgs = await accommodationService.getImages(id);
    setImages(imgs);
    const ams = await accommodationService.getAmenities(id);
    setAmenities(ams);
    setSelectedAmenities(ams);
    addToRecent({ id: data.id, type: "accommodation", title: data.title, imageUrl: data.image_url });

    if (data.listing_type === "property") {
      setLoadingRooms(true);
      accommodationService.getRooms(data.id).then((r) => setRooms(r)).finally(() => setLoadingRooms(false));
    }
  };

  const loadCollaborators = async () => {
    if (!id || !user) return;
    const collabs = await accommodationService.getCollaborators(id);
    setCollaborators(collabs);
    setIsCollaborator(collabs.some((c: any) => c.user_id === user.id));
  };

  const loadMyAccommodations = async () => {
    if (!user) return;
    const accs = await accommodationService.getMyAccommodations(user.id);
    setMyAccommodations(accs);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAccommodation(), loadCollaborators(), loadMyAccommodations()]).finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isOwner = user?.id === accommodation?.owner_id;

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

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const handleReport = async () => {
    if (!user) return;
    const ok = await confirm({
      title: "Report this listing?",
      message: "Do you want to report this content to the administrators?",
    });
    if (!ok) return;
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!user || !accommodation) return;
    if (!reportReason.trim()) return;
    try {
      await reportService.submitReport(
        user.id,
        "accommodation",
        accommodation.id,
        reportReason.trim()
      );
      toast.success("Report submitted. Thank you.");
      setShowReportModal(false);
      setReportReason("");
    } catch (err) {
      toast.error("Failed to submit report.");
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

  const handleCollabSearch = async (val: string) => {
    setCollabSearch(val);
    if (val.trim().length < 2) { setCollabResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .ilike("full_name", `%${val}%`)
      .limit(5);
    setCollabResults(data || []);
  };

  const handleAddCollaborator = async (userId: string) => {
    if (!accommodation) return;
    setAddingCollaboratorLoading(true);
    try {
      await accommodationService.addCollaborator(accommodation.id, userId);
      const cols = await accommodationService.getCollaborators(accommodation.id);
      setCollaborators(cols);
      setIsCollaborator(user ? cols.some((c: any) => c.user_id === user.id) : false);
      setCollabSearch("");
      setCollabResults([]);
      toast.success("Co‑landlord added.");
    } catch (e: any) {
      toast.error(e.message || "Failed to add co‑landlord.");
    } finally {
      setAddingCollaboratorLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!accommodation) return;
    const ok = await confirm({ title: "Remove co‑landlord?", message: "They will lose access." });
    if (!ok) return;
    try {
      await accommodationService.removeCollaborator(accommodation.id, userId);
      const cols = await accommodationService.getCollaborators(accommodation.id);
      setCollaborators(cols);
      toast.success("Co‑landlord removed.");
    } catch (e: any) {
      toast.error(e.message || "Could not remove.");
    }
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
      <div className="flex flex-col items-center justify-center h-64 gap-3 px-4">
        <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>This listing could not be found or has been removed.</p>
        <button onClick={() => navigate("/accommodation")} className="btn-primary w-auto px-6">← Back to Housing</button>
      </div>
    );
  }

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
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <h1 className="text-sm font-bold truncate max-w-[150px]" style={{ color: "var(--color-primary)" }}>
            {accommodation.title}
          </h1>
          {isOwner && myAccommodations.length > 1 && (
            <button onClick={() => setShowDropdown(!showDropdown)} className="p-1" aria-label="Switch property">
              <ChevronDown size={16} />
            </button>
          )}
          {showDropdown && myAccommodations.length > 1 && (
            <div className="absolute top-full left-0 mt-2 w-56 rounded-xl shadow-lg overflow-hidden z-20"
                 style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              {myAccommodations.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { navigate(`/accommodation/${acc.id}`); setShowDropdown(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 ${acc.id === accommodation.id ? "bg-primary/10 font-semibold" : ""}`}
                  style={{ color: "var(--color-text)" }}
                >
                  <Building2 size={14} />
                  <span className="truncate">{acc.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isOwner && (
            <button onClick={handleReport} className="p-1" aria-label="Report listing" title="Report">
              <Flag size={18} style={{ color: "var(--color-text-muted)" }} />
            </button>
          )}
          <button onClick={handleShare} className="p-1" aria-label="Share listing" title="Share">
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
          {isCollaborator && (
            <span className="inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              You are a co‑landlord
            </span>
          )}
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

        {/* Interest Queue */}
        <InterestQueue
          accommodationId={accommodation.id}
          isOwner={isOwner}
          isCollaborator={isCollaborator}
          listingFull={accommodation.status !== "available"}
        />

        {/* Rooms grid (only for properties) */}
        {accommodation.listing_type === "property" && (
          <div className="mt-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>Rooms ({rooms.length})</h3>
                {isOwner && (
                  <button
                    onClick={() => navigate(`/accommodation?parentId=${accommodation.id}`)}
                    className="btn-primary w-auto px-3 py-1 text-xs"
                    title="Add room"
                  >
                    <Plus size={14} /> Add Room
                  </button>
                )}
              </div>
              {loadingRooms ? (
                <div className="flex items-center gap-2 text-xs text-muted">Loading rooms…</div>
              ) : rooms.length === 0 ? (
                <p className="text-xs text-muted">No rooms yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {rooms.map((room) => (
                    <Link
                      key={room.id}
                      to={`/accommodation/${room.id}`}
                      className="card p-3 flex flex-col gap-1"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <p className="text-sm font-semibold">{room.title}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        K{room.monthly_rent}/mo
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
                        {room.capacity ? `${room.capacity} tenants` : "Shared"}
                      </p>
                      <span className={`badge text-[10px] ${room.status === "available" ? "badge-amber" : "badge-green"}`}>
                        {room.status || "available"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Co‑landlords (owner only) */}
            {isOwner && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Co‑landlords</h3>

                {collaborators.length > 0 ? (
                  <ul className="space-y-2 mb-3">
                    {collaborators.map((c) => (
                      <li key={c.user_id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{c.profiles?.full_name ?? "Unknown"}</span>
                          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>({c.role})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(c.user_id)}
                          className="text-red-500"
                          title="Remove co-landlord"
                          aria-label="Remove co-landlord"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted mb-3">No co‑landlords yet.</p>
                )}

                <div className="space-y-2 relative">
                  <label className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    Add co‑landlord
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      className="input-field pl-9 text-sm"
                      placeholder="Search by name..."
                      value={collabSearch}
                      onChange={(e) => handleCollabSearch(e.target.value)}
                      aria-label="Co-landlord search"
                    />
                  </div>
                  {collabResults.length > 0 && (
                    <div className="absolute z-20 w-full rounded-xl shadow-lg overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                      {collabResults.map((profile) => (
                        <button
  key={profile.id}
  onClick={() => handleAddCollaborator(profile.id)}
  disabled={addingCollaboratorLoading}
  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
  style={{ color: "var(--color-text)" }}
>
  {addingCollaboratorLoading ? (
    <Loader2 size={14} className="animate-spin" />
  ) : (
    <>
      {profile.avatar_url ? (
        <img src={profile.avatar_url} className="w-6 h-6 rounded-full" alt="" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
          {(profile.full_name?.[0] ?? "?")}
        </div>
      )}
      {profile.full_name}
    </>
  )}
</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
              onClick={async () => {
                const ok = await confirm({ title: "Mark as rented?", message: "This will close the interest queue." });
                if (!ok) return;
                try {
                  await accommodationService.updateAccommodationStatus(accommodation.id, "rented");
                  await listingInterestService.closeQueue(accommodation.id);

                  toast.success("Marked as rented.");
                  navigate(-1);
                } catch (e: any) { toast.error(e.message); }
              }}
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--color-accent)", color: "var(--color-primary)" }}
            >
              Mark as Rented
            </button>
            <button
              onClick={async () => {
                const ok = await confirm({ title: "Delete listing?", message: "This cannot be undone." });
                if (!ok) return;
                try {
                  await accommodationService.deleteAccommodation(accommodation.id);
                  toast.success("Listing deleted.");
                  navigate(-1);
                } catch (e: any) { toast.error(e.message); }
              }}
              className="w-full py-2 rounded-lg text-sm font-semibold"
              style={{ background: "#FEE2E2", color: "var(--color-danger)" }}
            >
              Delete Listing
            </button>
          </div>
        )}
      </div>
      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="w-[90vw] max-w-md rounded-3xl p-6"
            style={{ background: "var(--color-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Report this listing</h2>
            <textarea
              rows={3}
              className="input-field mb-4"
              placeholder="Please describe the issue..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason.trim()}
                className="btn-primary flex-1"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  );
}

