import { useState, useEffect, useRef } from "react";
import { X, Loader2, Pencil, Building2, DoorClosed, BedDouble, MapPin, ImagePlus, Camera, Star } from "lucide-react";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";
import { ZAMBIA_LOCATIONS } from "@/constants/locations";
import toast from "react-hot-toast";

type Accommodation = Tables<"accommodations">;

interface ExistingImage {
  id: string;
  image_url: string;
}

interface Props {
  accommodation: Accommodation;
  onClose: () => void;
  onUpdated: (updated: Accommodation) => void;
}

export default function EditAccommodationModal({ accommodation, onClose, onUpdated }: Props) {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(accommodation.title || "");
  const [location, setLocation] = useState(accommodation.location || "");
  const [monthlyRent, setMonthlyRent] = useState(accommodation.monthly_rent ? String(accommodation.monthly_rent) : "");
  const [description, setDescription] = useState(accommodation.description || "");
  const [capacity, setCapacity] = useState(accommodation.capacity ? String(accommodation.capacity) : "");
  const [listingType, setListingType] = useState<"property" | "room" | "bedspace">(accommodation.listing_type as any || "property");
  const [status, setStatus] = useState<"available" | "rented" | "hidden">(accommodation.status as any || "available");
  const [roommate, setRoommate] = useState(!!accommodation.looking_for_roommate);

  // Multi-image states
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<{ file: File; preview: string }[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    accommodationService
      .getImages(accommodation.id)
      .then((imgs) => {
        const list: ExistingImage[] = [];
        if (accommodation.image_url) {
          list.push({ id: "main-cover", image_url: accommodation.image_url });
        }
        imgs.forEach((img) => {
          if (img.image_url !== accommodation.image_url) {
            list.push({ id: img.id, image_url: img.image_url });
          }
        });
        setExistingImages(list);
      })
      .catch(() => {
        if (accommodation.image_url) {
          setExistingImages([{ id: "main-cover", image_url: accommodation.image_url }]);
        }
      })
      .finally(() => setLoadingImages(false));
  }, [accommodation.id, accommodation.image_url]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const added: { file: File; preview: string }[] = [];
    Array.from(files).forEach((file) => {
      added.push({ file, preview: URL.createObjectURL(file) });
    });
    setNewImageFiles((prev) => [...prev, ...added]);
  };

  const handleRemoveExisting = (img: ExistingImage) => {
    if (img.id !== "main-cover") {
      setDeletedImageIds((prev) => [...prev, img.id]);
    }
    setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
  };

  const handleRemoveNew = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location || !monthlyRent) {
      toast.error("Title, location, and rent are required.");
      return;
    }

    setSaving(true);
    try {
      // 1. Delete marked gallery images
      if (deletedImageIds.length > 0) {
        await Promise.all(deletedImageIds.map((id) => accommodationService.deleteImage(id)));
      }

      // 2. Upload new photo files
      const uploadedUrls: string[] = [];
      if (newImageFiles.length > 0 && user) {
        for (const item of newImageFiles) {
          const compressed = await compressImage(item.file);
          const fileName = `${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const path = `accommodations/${user.id}/${accommodation.id}/${fileName}`;
          const uploadRes = await storageService.uploadFile(
            "pending-uploads",
            compressed,
            user.id,
            true,
            path
          );
          const url = uploadRes.publicUrl || path;
          uploadedUrls.push(url);
          // Add to accommodation gallery table
          await accommodationService.addImage(accommodation.id, url);
        }
      }

      // 3. Determine cover photo (first remaining or newly uploaded)
      let primaryCoverUrl: string | undefined = undefined;
      if (existingImages.length > 0) {
        primaryCoverUrl = existingImages[0].image_url;
      } else if (uploadedUrls.length > 0) {
        primaryCoverUrl = uploadedUrls[0];
      }

      // 4. Update accommodation details
      const updated = await accommodationService.updateAccommodation(accommodation.id, {
        title: title.trim(),
        location,
        monthly_rent: Number(monthlyRent),
        description: description.trim() || undefined,
        capacity: capacity ? Number(capacity) : null,
        listing_type: listingType,
        status,
        looking_for_roommate: roommate,
        image_url: primaryCoverUrl,
      });

      toast.success("Housing listing and gallery photos updated!");
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update accommodation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pencil size={16} className="text-primary" /> Edit Housing &amp; Multi-Photos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage property photos, rent, location &amp; availability</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Housing type selector */}
          <div className="space-y-1.5">
            <label className="field-label">Select Housing Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "property", label: "Property", desc: "Whole House", icon: Building2 },
                { id: "room", label: "Room", desc: "Private/Shared", icon: DoorClosed },
                { id: "bedspace", label: "Bedspace", desc: "Hostel Bed", icon: BedDouble },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = listingType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setListingType(item.id as any)}
                    className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 ${
                      isSelected
                        ? "bg-primary/10 dark:bg-primary/20 border-primary shadow-xs ring-1 ring-primary"
                        : "bg-surface border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <IconComponent size={18} className={isSelected ? "text-primary" : "text-slate-400"} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-Photo Gallery Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label flex items-center gap-1.5 mb-0">
                <Camera size={14} className="text-primary" /> Property Photos ({existingImages.length + newImageFiles.length})
              </label>
              <span className="text-[10px] text-slate-400">First photo is cover</span>
            </div>

            {loadingImages ? (
              <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={18} /></div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {/* Existing photos */}
                {existingImages.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-border group shadow-xs">
                    <img
                      src={storageService.getPublicUrl("accommodation-images", img.image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-xs">
                        <Star size={9} fill="white" /> Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExisting(img)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                      title="Delete photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* New pending upload photos */}
                {newImageFiles.map((item, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary/50 group shadow-xs">
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      New
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNew(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                      title="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-border hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-center bg-surface hover:bg-primary/5 p-1"
                >
                  <ImagePlus size={20} className="text-primary" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">+ Add Photos</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddFiles(e.target.files)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="edit-accom-title">Title</label>
            <input
              id="edit-accom-title"
              required
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cosy studio near UNZA"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="edit-accom-location">
              <span className="flex items-center gap-1"><MapPin size={13} className="text-primary" /> Primary Area / Student Hub</span>
            </label>
            <select
              id="edit-accom-location"
              required
              className="glass-select w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Select Primary Location...</option>
              {Array.from(ZAMBIA_LOCATIONS).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="edit-accom-rent">Monthly Rent (ZMW)</label>
              <input
                id="edit-accom-rent"
                required
                type="number"
                min="0"
                className="input-field"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="edit-accom-capacity">Max Capacity</label>
              <input
                id="edit-accom-capacity"
                type="number"
                min="1"
                className="input-field"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Tenants count"
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="edit-accom-desc">Description</label>
            <textarea
              id="edit-accom-desc"
              rows={3}
              className="input-field resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Furnishing, utilities, distance to campus, rules..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="field-label" htmlFor="edit-accom-status">Availability Status</label>
              <select
                id="edit-accom-status"
                className="glass-select w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="available">🟢 Available</option>
                <option value="rented">🟡 Rented / Occupied</option>
                <option value="hidden">⚪ Hidden</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={roommate}
                  onChange={(e) => setRoommate(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary"
                />
                <span>🧑‍🤝‍🧑 Looking for Roommate</span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs px-4 py-2">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs px-6 py-2">
              {saving ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Saving…</span> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
