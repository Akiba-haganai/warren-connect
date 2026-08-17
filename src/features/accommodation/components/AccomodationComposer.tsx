import { useEffect, useState, useRef } from "react";
import { MapPin, Plus, X, Loader2, Building2, DoorClosed, BedDouble } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { locationService } from "@/services/locations/locationService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import { ZAMBIA_LOCATIONS } from "@/constants/locations";
import { ALL_AMENITIES } from "@/constants/amenities";
import toast from "react-hot-toast";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create accommodation listing"
    >
      <div
        className="bg-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isAddingRoom ? "Add Room" : "New Housing Listing"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAddingRoom ? "Add a room to your property" : "List your student accommodation"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            aria-label="Close composer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Listing type – hidden when adding a room */}
          {!isAddingRoom && (
            <div className="space-y-2">
              <label className="field-label">Select Housing Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "property", label: "Property", desc: "Whole House", icon: Building2 },
                  { id: "room", label: "Room", desc: "Private / Shared", icon: DoorClosed },
                  { id: "bedspace", label: "Bedspace", desc: "Hostel Bed", icon: BedDouble },
                ].map((item) => {
                  const IconComponent = item.icon;
                  const isSelected = listingType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setListingType(item.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-primary/10 dark:bg-primary/20 border-primary shadow-xs ring-1 ring-primary"
                          : "bg-surface border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <IconComponent size={20} className={isSelected ? "text-primary" : "text-slate-400"} />
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? "text-primary" : "text-slate-900 dark:text-white"}`}>{item.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
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
            <label className="field-label" htmlFor="accom-location">
              <span className="flex items-center gap-1.5"><MapPin size={13} className="text-primary" /> Primary Area / Student Hub</span>
            </label>
            <select
              id="accom-location"
              required
              className="glass-select w-full"
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
            <p className="text-[11px] text-slate-400 mt-1">Select the main campus area or town for easy search filtering.</p>
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
              {ALL_AMENITIES.map((a) => (
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
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1 w-full aspect-video rounded-xl text-xs font-medium cursor-pointer"
                    style={{
                      background: "var(--color-bg)",
                      border: "1.5px dashed var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <Plus size={16} />
                    <span>Add photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Select accommodation images"
                  />
                </>
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

