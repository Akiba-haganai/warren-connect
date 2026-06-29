import { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { productService } from "@/services/products/productService";
import { storageService } from "@/services/storage/storageService";
import { shopService } from "@/services/shop/shopService";
import { compressImage } from "@/utils/compressImage";
import TagInput from "@/components/ui/TagInput";
import { tagService } from "@/services/tags/tagService";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function ProductComposer({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    // Fetch ALL shops the user can manage (owned + collaborated)
    shopService.getShopsForUser(user.id).then(setShops).catch(() => {});
  }, [user]);

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !price) return;
    setPosting(true);
    try {
      // Upload all images
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        const uploads = await Promise.all(
          imageFiles.map(async (file) => {
            const compressed = await compressImage(file);
            const { publicUrl } = await storageService.uploadFile(
              "product-images",
              compressed,
              user.id,
              true
            );
            return publicUrl;
          })
        );
        imageUrls = uploads;
      }

      const newProduct = await productService.createProduct(
        user.id,
        title.trim(),
        description.trim(),
        Number(price),
        imageUrls[0]   // primary image
      );

      // Add extra images
      if (newProduct && imageUrls.length > 1) {
        await Promise.all(
          imageUrls.slice(1).map((url) =>
            productService.addProductImage(newProduct.id, url)
          )
        );
      }

      // Save tags
      if (tags.length > 0 && newProduct) {
        const tagRecords = await Promise.all(
          tags.map((name) => tagService.createTag(name))
        );
        await Promise.all(
          tagRecords.map((tag) => tagService.addTagToProduct(newProduct.id, tag!.id))
        );
      }

      if (selectedShopId && newProduct) {
        await shopService.addProductToShop(newProduct.id, selectedShopId);
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
      aria-label="Create product listing"
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
            <label className="field-label" htmlFor="product-title">Title</label>
            <input
              id="product-title"
              required
              className="input-field"
              placeholder="What are you selling?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="product-description">Description (optional)</label>
            <textarea
              id="product-description"
              rows={3}
              className="input-field resize-none"
              placeholder="Condition, details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="product-price">Price (ZMW)</label>
            <input
              id="product-price"
              required
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* Shop selection */}
          {shops.length > 0 && (
            <div>
              <label className="field-label" htmlFor="product-shop">Add to Shop (optional)</label>
              <select
                id="product-shop"
                className="input-field"
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
              >
                <option value="">No shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="field-label">Tags</label>
            <TagInput selectedTags={tags} onChange={setTags} />
          </div>

          {/* Multi‑image */}
          <div>
            <label className="field-label">Photos (optional)</label>
            {previews.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {previews.map((preview, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={preview} alt="" className="w-full h-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-medium cursor-pointer"
              style={{
                background: "var(--color-bg)",
                border: "1.5px dashed var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <Plus size={16} /> Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImages}
                aria-label="Select product images"
              />
            </label>
          </div>

          <button type="submit" disabled={posting} className="btn-primary" aria-label="Publish listing">
            {posting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin" /> Listing…
              </span>
            ) : (
              "List item"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}