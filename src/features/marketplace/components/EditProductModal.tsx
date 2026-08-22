import { useState, useEffect, useRef } from "react";
import { X, Loader2, Pencil, ImagePlus, Camera, Star } from "lucide-react";
import { productService } from "@/services/products/productService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";
import toast from "react-hot-toast";

type Product = Tables<"products">;

interface ExistingImage {
  id: string;
  image_url: string;
}

interface Props {
  product: Product;
  onClose: () => void;
  onUpdated: (updated: Product) => void;
}

export default function EditProductModal({ product, onClose, onUpdated }: Props) {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(product.title || "");
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price ? String(product.price) : "");
  const [condition, setCondition] = useState(product.condition || "");
  const [category, setCategory] = useState(product.category || "");

  // Multi-image states
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<{ file: File; preview: string }[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    productService
      .getProductImages(product.id)
      .then((imgs) => {
        const list: ExistingImage[] = [];
        if (product.image_url) {
          list.push({ id: "main-cover", image_url: product.image_url });
        }
        imgs.forEach((img) => {
          if (img.image_url !== product.image_url) {
            list.push({ id: img.id, image_url: img.image_url });
          }
        });
        setExistingImages(list);
      })
      .catch(() => {
        if (product.image_url) {
          setExistingImages([{ id: "main-cover", image_url: product.image_url }]);
        }
      })
      .finally(() => setLoadingImages(false));
  }, [product.id, product.image_url]);

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
    if (!title.trim() || !price) return;

    const parsedPrice = Number(String(price).replace(/,/g, "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid price in ZMW");
      return;
    }

    setSaving(true);
    try {
      // 1. Delete removed extra images
      if (deletedImageIds.length > 0) {
        await Promise.all(
          deletedImageIds.map((imgId) => {
            if (imgId !== "main-cover") {
              return productService.deleteProductImage(imgId);
            }
            return Promise.resolve();
          })
        );
      }

      // 2. Upload new image files
      const uploadedUrls: string[] = [];
      if (newImageFiles.length > 0 && user) {
        for (let i = 0; i < newImageFiles.length; i++) {
          const compressed = await compressImage(newImageFiles[i].file);
          const { publicUrl } = await storageService.uploadFile(
            "product-images",
            compressed,
            user.id,
            false
          );
          uploadedUrls.push(publicUrl);
          await productService.addProductImage(product.id, publicUrl);
        }
      }

      // 3. Determine primary cover URL
      let primaryCoverUrl = product.image_url;
      if (existingImages.length > 0) {
        primaryCoverUrl = existingImages[0].image_url;
      } else if (uploadedUrls.length > 0) {
        primaryCoverUrl = uploadedUrls[0];
      }

      // 4. Update product details
      const updated = await productService.updateProduct(product.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        price: parsedPrice,
        condition: condition || undefined,
        category: category || undefined,
        image_url: primaryCoverUrl || undefined,
      });

      toast.success("Listing details and gallery photos updated!");
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update listing");
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
              <Pencil size={16} className="text-primary" /> Edit Product &amp; Multi-Photos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage listing gallery, price, category &amp; details</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Multi-Photo Manager Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label flex items-center gap-1.5 mb-0">
                <Camera size={14} className="text-primary" /> Product Photos ({existingImages.length + newImageFiles.length})
              </label>
              <span className="text-[10px] text-slate-400">First photo is cover</span>
            </div>

            {loadingImages ? (
              <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={18} /></div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {/* Existing images */}
                {existingImages.map((img, idx) => (
                  <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-border group shadow-xs">
                    <img
                      src={storageService.getPublicUrl("product-images", img.image_url)}
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

                {/* New pending upload images */}
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
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddFiles(e.target.files)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              required
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Product title"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="edit-price">Price (ZMW)</label>
            <input
              id="edit-price"
              required
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price in Kwacha"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              rows={3}
              className="input-field resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item, condition, pickup location..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="edit-category">Category</label>
              <select
                id="edit-category"
                className="glass-select w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category...</option>
                <option value="phones">Phones &amp; Tablets</option>
                <option value="laptops">Laptops &amp; Computers</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing &amp; Fashion</option>
                <option value="furniture">Furniture</option>
                <option value="books">Books &amp; Stationery</option>
                <option value="food">Food &amp; Groceries</option>
                <option value="vehicles">Vehicles</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="edit-condition">Condition</label>
              <select
                id="edit-condition"
                className="glass-select w-full"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="">Select condition...</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
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
