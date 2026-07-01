import { useState } from "react";
import { MapPin, Plus, X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";

const COMMON_AMENITIES = [
  "WiFi", "Water included", "Electricity included", "Furnished",
  "Parking", "Security", "Study desk", "Private bathroom",
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AccommodationComposer({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [monthly_rent, setRent] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !location.trim() || !monthly_rent) return;
    setPosting(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        const { publicUrl } = await storageService.uploadFile(
          "accommodation-images",
          compressed,
          user.id,
          true
        );
        image_url = publicUrl;
      }
      const newAcc = await accommodationService.createAccommodation(
        user.id,
        title.trim(),
        description.trim() || "",
        location.trim(),
        Number(monthly_rent),
        image_url
      );

      if (selectedAmenities.length > 0 && newAcc) {
        await accommodationService.setAmenities(newAcc.id, selectedAmenities);
      }

      onCreated();
      onClose();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create accommodation listing"
    >
      <div
        className="w-full rounded-t-3xl overflow-y-auto"
        style={{
          background: "var(--color-surface)",
          maxHeight: "90dvh",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            New listing
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}
            aria-label="Close composer"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="accommodation-title">Title</label>
            <input id="accommodation-title" required className="input-field" placeholder="e.g. Cosy studio near UNZA" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="accommodation-location">Location</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
              <input id="accommodation-location" required className="input-field" style={{ paddingLeft: "2.5rem" }} placeholder="Neighbourhood / area" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="accommodation-rent">Monthly rent (ZMW)</label>
            <input id="accommodation-rent" required type="number" min="0" className="input-field" placeholder="0" value={monthly_rent} onChange={(e) => setRent(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="accommodation-description">Description (optional)</label>
            <textarea id="accommodation-description" rows={3} className="input-field resize-none" placeholder="Furnishing, utilities, rules…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Amenities selection */}
          <div>
            <label className="field-label">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    setSelectedAmenities((prev) =>
                      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
                    )
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    selectedAmenities.includes(a)
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-text-secondary border-border"
                  }`}
                  style={{
                    background: selectedAmenities.includes(a)
                      ? "var(--color-primary)"
                      : "var(--color-surface)",
                    color: selectedAmenities.includes(a)
                      ? "#fff"
                      : "var(--color-text-secondary)",
                    borderColor: selectedAmenities.includes(a)
                      ? "var(--color-primary)"
                      : "var(--color-border)",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Photo (optional)</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }} />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }} aria-label="Remove image">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-medium cursor-pointer" style={{ background: "var(--color-bg)", border: "1.5px dashed var(--color-border)", color: "var(--color-text-secondary)" }}>
                <Plus size={16} /> Add photo
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} aria-label="Select accommodation image" />
              </label>
            )}
          </div>
          <button type="submit" disabled={posting} className="btn-primary" aria-label="Publish listing">
            {posting ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Listing…</span> : "Add listing"}
          </button>
        </form>
      </div>
    </div>
  );
}