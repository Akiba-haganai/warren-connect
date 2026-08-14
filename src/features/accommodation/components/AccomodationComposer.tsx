import { useEffect, useState } from "react";
import { MapPin, Plus, X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { locationService } from "@/services/locations/locationService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import { ZAMBIA_LOCATIONS } from "@/constants/locations";
import toast from "react-hot-toast";

const COMMON_AMENITIES = [
  "WiFi",
  "Water included",
  "Electricity included",
  "Furnished",
  "Parking",
  "Security",
  "Study desk",
  "Private bathroom",
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
  initialListingType?: "property" | "room" | "bedspace";
  initialParentId?: string;
}

export default function AccommodationComposer({
  onClose,
  onCreated,
  initialListingType,
  initialParentId,
}: Props) {
  const user = useAuthStore((s) => s.user);

  // Basic fields
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [dbLocations, setDbLocations] = useState<string[]>(Array.from(ZAMBIA_LOCATIONS));

  useEffect(() => {
    locationService.getLocations().then((locs: string[]) => setDbLocations(locs));
  }, []);

  const lusakaLocations = dbLocations.filter((l) => l.startsWith("Lusaka"));
  const kitweLocations = dbLocations.filter((l) => l.startsWith("Kitwe"));
  const ndolaLocations = dbLocations.filter((l) => l.startsWith("Ndola"));
  const otherLocations = dbLocations.filter(
    (l) => !l.startsWith("Lusaka") && !l.startsWith("Kitwe") && !l.startsWith("Ndola")
  );
  const [monthly_rent, setRent] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  // Listing type fields
  const [listingType, setListingType] = useState<"property" | "room" | "bedspace">(
    initialListingType ?? "property"
  );
  const [parentPropertyId, setParentPropertyId] = useState<string>(initialParentId ?? "");
  const [capacity, setCapacity] = useState<string>("");

  // My properties (for parent selector)
  const [myProperties, setMyProperties] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    accommodationService
      .getMyAccommodations(user.id)
      .then((accs) => {
        setMyProperties(accs.filter((a) => a.listing_type === "property"));
      })
      .catch(() => {});
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (imageFiles.length + files.length > 5) {
      toast.error("You can upload up to 5 photos.");
    }
    const newFiles = [...imageFiles, ...files].slice(0, 5);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !location.trim() || !monthly_rent) return;

    setPosting(true);
    try {
      let primaryImageUrl: string | undefined;
      const uploadedUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const compressed = await compressImage(imageFiles[i]);
        const { publicUrl } = await storageService.uploadFile(
          "accommodation-images",
          compressed,
          user.id,
          i === 0
        );
        uploadedUrls.push(publicUrl);
      }
      primaryImageUrl = uploadedUrls[0];

      const newAcc = await accommodationService.createAccommodation(
        user.id,
        title.trim(),
        description.trim() || "",
        location.trim(),
        Number(monthly_rent),
        primaryImageUrl,
        listingType,
        listingType !== "property" ? parentPropertyId || undefined : undefined,
        listingType === "room" || listingType === "bedspace"
          ? Number(capacity) || undefined
          : undefined
      );

      for (let i = 1; i < uploadedUrls.length; i++) {
        await accommodationService.addImage(newAcc.id, uploadedUrls[i]);
      }

      if (selectedAmenities.length > 0) {
        await accommodationService.setAmenities(newAcc.id, selectedAmenities);
      }

      toast.success("Listing created!");
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not create listing.");
    } finally {
      setPosting(false);
    }
  };

  const isAddingRoom = !!initialParentId;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create accommodation listing"
    >
      <div
        className="w-full rounded-t-3xl overflow-y-auto page-fade-in"
        style={{
          background: "var(--color-surface)",
          maxHeight: "90dvh",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            {isAddingRoom ? "Add Room" : "New listing"}
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
          {/* Listing type – hidden when adding a room */}
          {!isAddingRoom && (
            <div>
              <label className="field-label">Listing type</label>
              <label className="sr-only">Listing type</label>
              <select
                aria-label="Listing type"
                value={listingType}
                onChange={(e) => setListingType(e.target.value as any)}
                className="glass-select w-full"
              >
                <option value="property">Property (house/plot)</option>
                <option value="room">Room (inside a property)</option>
                <option value="bedspace">Bedspace (squatting)</option>
              </select>
            </div>
          )}

          {/* Parent property selector */}
          {(listingType === "room" || listingType === "bedspace") &&
            myProperties.length > 0 &&
            !isAddingRoom && (
              <div>
                <label className="field-label">Parent property</label>
                <select
                  value={parentPropertyId}
                  onChange={(e) => setParentPropertyId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select a property</option>
                  {myProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

          {/* Capacity */}
          {(listingType === "room" || listingType === "bedspace") && (
            <div>
              <label className="field-label">Capacity (number of tenants)</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g., 4"
              />
            </div>
          )}

          <div>
            <label className="field-label">Title</label>
            <input
              required
              className="input-field"
              placeholder="e.g. Cosy studio near UNZA"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label">Primary Area / Student Hub</label>
            <div className="relative mb-2">
              <MapPin
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500"
              />
              <select
                required
                className="glass-select w-full pl-10 cursor-pointer text-xs max-h-48 overflow-y-auto"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">Select Primary Location / Campus Hub...</option>
                {lusakaLocations.length > 0 && (
                  <optgroup label="📍 Lusaka Province">
                    {lusakaLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </optgroup>
                )}
                {kitweLocations.length > 0 && (
                  <optgroup label="📍 Copperbelt - Kitwe (CBU)">
                    {kitweLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </optgroup>
                )}
                {ndolaLocations.length > 0 && (
                  <optgroup label="📍 Copperbelt - Ndola (Medicine)">
                    {ndolaLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </optgroup>
                )}
                {otherLocations.length > 0 && (
                  <optgroup label="📍 Other Locations">
                    {otherLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <p className="text-[11px] text-slate-400">Select the main campus area or town for easy search filtering.</p>
          </div>

          <div>
            <label className="field-label">Monthly rent (ZMW)</label>
            <input
              required
              type="number"
              min="0"
              className="input-field"
              placeholder="0"
              value={monthly_rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label">Description (optional)</label>
            <textarea
              rows={3}
              className="input-field resize-none"
              placeholder="Furnishing, utilities, rules…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Amenities */}
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
                    color: selectedAmenities.includes(a) ? "#fff" : "var(--color-text-secondary)",
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
            <label className="field-label">Photos (up to 5)</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden aspect-video border bg-slate-100 dark:bg-slate-800">
                  <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white"
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {imageFiles.length < 5 && (
                <label
                  className="flex flex-col items-center justify-center gap-1 w-full aspect-video rounded-xl text-xs font-medium cursor-pointer"
                  style={{
                    background: "var(--color-bg)",
                    border: "1.5px dashed var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <Plus size={16} />
                  <span>Add photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                    aria-label="Select accommodation images"
                  />
                </label>
              )}
            </div>
          </div>

          <button type="submit" disabled={posting} className="btn-primary" aria-label="Publish listing">
            {posting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Listing…
              </span>
            ) : isAddingRoom ? (
              "Add Room"
            ) : (
              "Add listing"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

