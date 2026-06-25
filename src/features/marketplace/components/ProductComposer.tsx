import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { productService } from "@/services/products/productService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function ProductComposer({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !price) return;
    setPosting(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        image_url = await storageService.uploadFile("product-images", compressed, user.id);
      }
      await productService.createProduct(user.id, title.trim(), description.trim(), Number(price), image_url);
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

          <div>
            <label className="field-label">Photo (optional)</label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }} />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-sm font-medium cursor-pointer"
                style={{
                  background: "var(--color-bg)",
                  border: "1.5px dashed var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                <Plus size={16} /> Add photo
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} aria-label="Select product image" />
              </label>
            )}
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