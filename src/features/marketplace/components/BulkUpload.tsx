import { useState, useRef } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { productService } from "@/services/products/productService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import { X, Upload, Loader2, CheckCircle, ImagePlus } from "lucide-react";
import Papa from "papaparse";
import { triggerHaptic } from "@/utils/haptic";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface CsvRow {
  title: string;
  description?: string;
  price: number;
}

export default function BulkUpload({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<CsvRow[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const valid = results.data.filter(
          (row) => row.title && !isNaN(Number(row.price))
        );
        if (valid.length === 0) {
          setErrors(["No valid rows found. CSV must have 'title' and 'price' columns."]);
        } else {
          setErrors([]);
          setProducts(valid);
        }
      },
      error: (err) => setErrors([err.message]),
    });
    e.target.value = "";
  };

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (!user) return;
    setUploading(true);
    triggerHaptic();
    try {
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        let image_url: string | undefined;
        if (imageFiles[i]) {
          const compressed = await compressImage(imageFiles[i]);
          const { publicUrl, thumbUrl } = await storageService.uploadFile(
            "product-images",
            compressed,
            user.id,
            true
          );
          image_url = publicUrl;
          // thumbnail is currently not persisted on product model for this upload flow
          // (stored for future model support)
          void thumbUrl;
        }
        await productService.createProduct(
          user.id,
          product.title.trim(),
          product.description?.trim() || "",
          product.price,
          image_url
        );
      }
      setDone(true);
      onCreated();
    } catch (err: any) {
      setErrors([err.message]);
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
        <div className="w-full rounded-t-3xl p-6" style={{ background: "var(--color-surface)", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-4">
            <CheckCircle size={48} style={{ color: "var(--color-success)" }} />
            <h2 className="text-lg font-bold">Upload complete!</h2>
            <p className="text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
              {products.length} product{products.length > 1 ? "s" : ""} created.
            </p>
            <button onClick={onClose} className="btn-primary">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl overflow-y-auto"
        style={{
          background: "var(--color-surface)",
          maxHeight: "90dvh",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Bulk Upload</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-10">
              <Upload size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
              <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Upload a CSV file with columns: <strong>title</strong>, <strong>description</strong>, <strong>price</strong>
              </p>
              <label className="btn-primary cursor-pointer inline-flex items-center gap-2 w-auto px-6">
                <Upload size={16} /> Select CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              </label>
              {errors.length > 0 && (
                <div className="mt-4 text-sm text-red-500">
                  {errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                {products.length} product{products.length > 1 ? "s" : ""} ready
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {products.slice(0, 10).map((p, i) => (
                  <div key={i} className="text-xs flex justify-between items-center" style={{ color: "var(--color-text-secondary)" }}>
                    <span className="truncate">{i + 1}. {p.title} – K{p.price}</span>
                    {imagePreviews[i] ? (
                      <div className="flex items-center gap-1">
                        <img alt="image" src={imagePreviews[i]} className="w-6 h-6 rounded object-cover" />
                        <button aria-label="image" onClick={() => removeImage(i)} className="text-red-500">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted">no image</span>
                    )}
                  </div>
                ))}
                {products.length > 10 && (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    … and {products.length - 10} more
                  </p>
                )}
              </div>

              {/* Add images button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="btn-ghost text-xs flex items-center gap-1"
                >
                  <ImagePlus size={14} /> Add images (one per product, in order)
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImagesSelect}
                />
              </div>

              <button onClick={handleUpload} disabled={uploading} className="btn-primary">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : "Upload all"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}