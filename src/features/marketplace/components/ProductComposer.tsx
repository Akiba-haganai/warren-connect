import { useState, useEffect, useRef } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { productService } from "@/services/products/productService";
import { storageService } from "@/services/storage/storageService";
import { shopService } from "@/services/shop/shopService";
import { compressImage } from "@/utils/compressImage";
import TagInput from "@/components/ui/TagInput";
import { tagService } from "@/services/tags/tagService";
import { priceEngine } from "@/services/pricing/priceEngine";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import toast from "react-hot-toast";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  initialShopId?: string;
}

interface UploadedImageItem {
  path: string;
  previewUrl: string;
}

export default function ProductComposer({ onClose, onCreated, initialShopId }: Props) {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    { title, description, price, condition, category, tags, uploadedImages },
    (draft: any) => {
      if (draft.title !== undefined) setTitle(draft.title);
      if (draft.description !== undefined) setDescription(draft.description);
      if (draft.price !== undefined) setPrice(draft.price);
      if (draft.condition !== undefined) setCondition(draft.condition);
      if (draft.category !== undefined) setCategory(draft.category);
      if (draft.tags !== undefined) setTags(draft.tags);
      if (draft.uploadedImages !== undefined) {
        const restored = (draft.uploadedImages || []).map((item: any) => ({
          path: item.path,
          previewUrl: item.path
            ? storageService.getPublicUrl("pending-uploads", item.path)
            : item.previewUrl,
        }));
        setUploadedImages(restored);
      }
    }
  );

  useEffect(() => {
    if (!user) return;
    shopService.getShopsForUser(user.id).then(setShops).catch(() => {});
  }, [user]);

  // Instant Upload: upload images immediately when selected so they survive any page reload
  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;
    setUploadingImage(true);

    try {
      const newItems = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file);
          const fileName = `${Date.now()}_${compressed.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const path = `products/${user.id}/drafts/${fileName}`;

          const { publicUrl } = await storageService.uploadFile(
            "pending-uploads",
            compressed,
            user.id,
            true,
            path
          );
          return { path, previewUrl: publicUrl };
        })
      );

      setUploadedImages((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image preview");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
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

      // 2. Set primary image URL from already-uploaded image if present
      if (uploadedImages.length > 0) {
        const primaryPublicUrl = uploadedImages[0].previewUrl;
        await productService.updateProduct(createdProductId, {
          image_url: primaryPublicUrl,
        }).catch(() => {});
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
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors" aria-label="Close composer">
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
            <label className="field-label">Photos (optional)</label>
            {uploadedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-2 py-2">
                {uploadedImages.map((imgItem, i) => (
                  <div key={imgItem.path || i} className="relative flex-shrink-0 w-20 h-20">
                    <img src={imgItem.previewUrl} alt="" className="w-full h-full rounded-lg object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ background: "var(--color-bg)", border: "1.5px dashed var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              {uploadingImage ? (
                <>
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span>Uploading photos…</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Add photos</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImages}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select product images"
            />
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