// features/marketplace/components/ShopSettingsModal.tsx
import { useState } from "react";
import { X, Loader2, Camera } from "lucide-react";
import { shopService } from "@/services/shop/shopService";
import { storageService } from "@/services/storage/storageService";
import { compressImage } from "@/utils/compressImage";
import { useAuthStore } from "@/store/auth/authStore";

interface Props {
  shop: { id: string; name: string; description?: string; logo_url?: string };
  onClose: () => void;
  onSaved: () => void;   // to refresh shop data
}

export default function ShopSettingsModal({ shop, onClose, onSaved }: Props) {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(shop.logo_url ?? null);
  const [saving, setSaving] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
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
                accept="image/*"
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

          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}