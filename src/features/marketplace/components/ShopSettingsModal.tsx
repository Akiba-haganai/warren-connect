// features/marketplace/components/ShopSettingsModal.tsx
import { useState } from "react";
import { X, Loader2, Camera } from "lucide-react";
import { shopService } from "@/services/shop/shopService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import { useAuthStore } from "@/store/auth/authStore";

interface Props {
  shop: { id: string; name: string; description?: string; logo_url?: string; owner_id: string };
  onClose: () => void;
  onSaved: () => void;   // to refresh shop data
  onDeleted?: () => void;
}

import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";

export default function ShopSettingsModal({ shop, onClose, onSaved, onDeleted }: Props) {
  const user = useAuthStore((s) => s.user);
  const { confirm, ConfirmDialog } = useConfirm();
  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(shop.logo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDelete = async () => {
    if (!user) return;
    const ok = await confirm({
      title: "Delete Shop?",
      message: "Are you sure you want to delete this shop? All products and reviews associated with it will be permanently deleted. This cannot be undone.",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await shopService.deleteShop(shop.id, user.id);
      toast.success("Shop deleted successfully");
      if (onDeleted) onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete shop");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      let logoUrl = shop.logo_url;
      if (logoFile) {
        const compressed = await compressImage(logoFile);
        const { publicUrl } = await storageService.uploadFile(
          "shop-logos",
          compressed,
          user.id,
          true
        );
        logoUrl = publicUrl;
      }
      await shopService.updateShop(shop.id, {
        name: name.trim(),
        description: description.trim(),
        logo_url: logoUrl,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save shop");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
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
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h2 className="text-base font-bold">Edit Shop</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">
          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <Camera size={24} style={{ color: "var(--color-text-muted)" }} />
                )}
              </div>
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Tap to change logo
            </span>
          </div>

          <div>
            <label className="field-label">Shop Name</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Save Changes"}
            </button>
            <button 
              type="button" 
              onClick={handleDelete} 
              disabled={deleting}
              className="w-full py-3 rounded-xl font-bold text-sm bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              {deleting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Delete Shop"}
            </button>
          </div>
        </form>
      </div>
      {ConfirmDialog}
    </div>
  );
}