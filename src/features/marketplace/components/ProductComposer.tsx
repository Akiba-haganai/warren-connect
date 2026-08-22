import { useState, useEffect } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { productService } from "@/services/products/productService";
import { storageService } from "@/services/storage/storageService";
import { shopService } from "@/services/shop/shopService";
import { compressImage } from "@/utils/compressImage";
import TagInput from "@/components/ui/TagInput";
import { tagService } from "@/services/tags/tagService";
import { priceEngine } from "@/services/pricing/priceEngine";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import CrossDeviceUploadPanel from "@/components/ui/CrossDeviceUploadPanel";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  initialShopId?: string;
}

interface UploadedImageItem {
  path: string;
  previewUrl: string;
  file?: File;
}

export default function ProductComposer({ onClose, onCreated, initialShopId }: Props) {
  const user = useAuthStore((s) => s.user);
  const MAX_PHOTOS = 5;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [condition, setCondition] = useState("");
  const [posting, setPosting] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId ?? "");
  const [category, setCategory] = useState("");

  const draftKey = user ? `draft:product-composer:${user.id}` : "draft:product-composer";

  // Persist form draft in sessionStorage (survives OS memory reclaims mid-flow)
  const { clearDraft } = useDraftPersistence(
    draftKey,
    { title, description, price, condition, category, tags, uploadedImages: uploadedImages.filter(img => img.previewUrl.startsWith('http')), selectedShopId },
    (draft: any) => {
      if (draft.title !== undefined) setTitle(draft.title);
      if (draft.description !== undefined) setDescription(draft.description);
      if (draft.price !== undefined) setPrice(draft.price);
      if (draft.condition !== undefined) setCondition(draft.condition);
      if (draft.category !== undefined) setCategory(draft.category);
      if (draft.tags !== undefined) setTags(draft.tags);
      if (draft.selectedShopId !== undefined) setSelectedShopId(draft.selectedShopId);
      if (draft.uploadedImages !== undefined) {
        setUploadedImages(draft.uploadedImages || []);
      }
    }
  );

  useEffect(() => {
    if (!user) return;
    shopService.getShopsForUser(user.id).then(setShops).catch(() => {});
  }, [user]);

  // Instant local preview generation: Zero network dependency, survives process reclaims
  const handleSelectedFiles = async (files: File[]) => {
    if (files.length === 0 || !user) return;

    // Enforce per-session cap — accumulate across multiple picks
    const slotsLeft = MAX_PHOTOS - uploadedImages.length;
    if (slotsLeft <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }
    const filesToProcess = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      toast(`Only ${slotsLeft} more photo${slotsLeft === 1 ? "" : "s"} can be added.`, { icon: "ℹ️" });
    }

    setUploadingImage(true);

    const newItems: { path: string; previewUrl: string; file?: File }[] = [];
    const failures: string[] = [];

    for (const file of filesToProcess) {
      try {
        const compressed = await compressImage(file, 800, 0.7);
        // SMALL SAFE FIX: Use ObjectURL instead of Base64
        const previewUrl = URL.createObjectURL(compressed);
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        newItems.push({ path: fileName, previewUrl, file: compressed });
      } catch (err: any) {
        import("@sentry/react").then((Sentry) => {
          Sentry.captureException(err);
        });
        console.warn(`Failed to process "${file.name}":`, err);
        failures.push(err?.message || `Couldn't process "${file.name}"`);
      }
    }

    if (newItems.length > 0) {
      setUploadedImages((prev) => [...prev, ...newItems]);
    }

    if (failures.length > 0) {
      const uniqueMessages = Array.from(new Set(failures)).slice(0, 3);
      uniqueMessages.forEach((msg) => toast.error(msg));
    }

    setUploadingImage(false);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Backward-safe: if products table doesn’t yet have category, we’ll just keep category empty.

  const [priceHint, setPriceHint] = useState<
    | null
    | {
        low: number;
        median: number;
        high: number;
        sampleSize: number;
      }
  >(null);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!category && !condition) {
        setPriceHint(null);
        return;
      }
      setSuggesting(true);
      try {
        const hint = await priceEngine.suggestPriceRange(category, condition);
        if (!cancelled && hint) {
          setPriceHint({
            low: hint.suggestedMin,
            median: hint.averagePrice,
            high: hint.suggestedMax,
            sampleSize: hint.sampleSize,
          });
        }
      } finally {
        if (!cancelled) setSuggesting(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [category, condition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !price) return;
    
    const parsedPrice = Number(String(price).replace(/,/g, "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid price in ZMW");
      return;
    }

    setPosting(true);
    try {
      // 1. Create Product (Synchronous text moderation)
      const newProduct = await productService.createProduct(
        user.id,
        title.trim(),
        description.trim(),
        parsedPrice,
        uploadedImages.length > 0, // has_image
        condition || undefined,
        category || undefined
      );

      const createdProductId =
        newProduct?.id ||
        newProduct?.product?.id ||
        newProduct?.data?.id ||
        (typeof newProduct === "string" ? newProduct : null);

      if (!createdProductId || createdProductId === "undefined") {
        throw new Error("Failed to retrieve product ID");
      }

      // 2. Upload primary image to Supabase if present
      if (uploadedImages.length > 0) {
        let primaryPublicUrl = uploadedImages[0].previewUrl;
        if (uploadedImages[0].file) {
          try {
            const uploadRes = await storageService.uploadFile("public-images", uploadedImages[0].file, user.id);
            primaryPublicUrl = uploadRes.publicUrl;
          } catch (uploadErr) {
            console.warn("Failed to upload primary image file:", uploadErr);
            primaryPublicUrl = ""; // Prevent base64 payload from polluting the database
          }
        }
        if (primaryPublicUrl && primaryPublicUrl.startsWith("http")) {
          await productService.updateProduct(createdProductId, {
            image_url: primaryPublicUrl,
          }).catch(() => {});
        }
      }

      if (tags.length > 0) {
        const tagRecords = await Promise.all(
          tags.map((name) => tagService.createTag(name))
        );
        await Promise.all(
          tagRecords.map((tag) => tagService.addTagToProduct(createdProductId, tag!.id))
        );
      }

      if (selectedShopId) {
        await shopService.addProductToShop(createdProductId, selectedShopId);
      }

      clearDraft();
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to list item");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">New Listing</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Add your item to the campus marketplace</p>
          </div>
          <button onClick={() => { clearDraft(); onClose(); }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors" aria-label="Close composer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="field-label" htmlFor="product-title">Title</label>
            <input id="product-title" required className="input-field" placeholder="What are you selling?" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="product-description">Description (optional)</label>
            <textarea id="product-description" rows={3} className="input-field resize-none" placeholder="Condition, details…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="product-price">Price (ZMW)</label>
            <input id="product-price" required type="number" min="0" step="0.01" className="input-field" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="product-category">Category</label>
            <select id="product-category" className="glass-select w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category (optional)</option>
              <option value="phones">Phones &amp; Tablets</option>
              <option value="laptops">Laptops &amp; Computers</option>
              <option value="electronics">Electronics &amp; Gadgets</option>
              <option value="clothing">Clothing &amp; Fashion</option>
              <option value="furniture">Furniture &amp; Home</option>
              <option value="books">Books &amp; Stationery</option>
              <option value="food">Food &amp; Groceries</option>
              <option value="vehicles">Vehicles &amp; Transport</option>
              <option value="services">Services</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="product-condition">Condition</label>
            <select id="product-condition" className="glass-select w-full" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="">Select condition (optional)</option>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>
          {shops.length > 0 && (
            <div>
              <label className="field-label" htmlFor="product-shop">Add to Shop (optional)</label>
              <select id="product-shop" className="glass-select w-full" value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)}>
                <option value="">No shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">Tags</label>
            <TagInput selectedTags={tags} onChange={setTags} />
          </div>
          <div>
            <label className="field-label">
              Photos ({uploadedImages.length}/{MAX_PHOTOS})
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {/* Existing Photo Slots */}
              {uploadedImages.map((imgItem, i) => (
                <div key={imgItem.path || i} className="relative rounded-xl overflow-hidden aspect-video border border-border bg-slate-100 dark:bg-slate-800">
                  <img src={imgItem.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center bg-black/60 text-white"
                    aria-label="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Direct 1-Tap Camera & Gallery Slots (visible while under limit) */}
              {uploadedImages.length < MAX_PHOTOS && (
                <>
                  <div
                    className="relative flex flex-col items-center justify-center gap-1 w-full aspect-video rounded-xl text-xs font-semibold cursor-pointer transition-all border border-dashed border-teal-500/50 bg-teal-500/10 hover:bg-teal-500/15 text-teal-700 dark:text-teal-300"
                    title="Take photo with camera"
                  >
                    <Camera size={18} className="text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px]">Camera</span>
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                      capture="environment"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) handleSelectedFiles(files);
                        e.target.value = "";
                      }}
                      disabled={uploadingImage}
                    />
                  </div>

                  <div
                    className="relative flex flex-col items-center justify-center gap-1 w-full aspect-video rounded-xl text-xs font-semibold cursor-pointer transition-all border border-dashed border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    title="Select from Gallery or Files"
                  >
                    <ImagePlus size={18} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-[11px]">Gallery</span>
                    <input
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) handleSelectedFiles(files);
                        e.target.value = "";
                      }}
                      disabled={uploadingImage}
                    />
                  </div>
                </>
              )}
            </div>
            {uploadingImage && (
              <p className="text-xs text-center flex items-center justify-center gap-1.5 py-1 text-primary font-medium">
                <Loader2 size={13} className="animate-spin" /> Processing photos…
              </p>
            )}
            <CrossDeviceUploadPanel onFilesReceived={handleSelectedFiles} />
          </div>
          {priceHint && (
            <div className="px-1">
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                <span style={{ color: "var(--color-text)" }}>
                  Similar items sold for
                </span>{" "}
                K{priceHint.low.toLocaleString()} – K{priceHint.high.toLocaleString()} recently
                <span style={{ opacity: 0.8 }}>
                  {" "}(n={priceHint.sampleSize}, median K{priceHint.median.toLocaleString()})
                </span>
              </div>
            </div>
          )}
          {suggesting && !priceHint && (
            <div className="px-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Suggesting price…
            </div>
          )}

          <button type="submit" disabled={posting || uploadingImage} className="btn-primary cursor-pointer disabled:opacity-50" aria-label="Publish listing">
            {posting ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Listing…</span> : uploadingImage ? <span className="flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Uploading photos…</span> : "List item"}
          </button>

        </form>
      </div>
    </div>
  );
}