import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { shopService } from "@/services/shop/shopService";

interface Props {
  onClose: () => void;
  onCreated: (shopId: string) => void;
}

export default function CreateShopModal({ onClose, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const shop = await shopService.createShop(user.id, name.trim(), description.trim());
      onCreated(shop.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-5" style={{ background: "var(--color-surface)", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Create Shop</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="field-label">Shop Name</label>
            <input required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Shop" />
          </div>
          <div>
            <label className="field-label">Description (optional)</label>
            <textarea rows={3} className="input-field resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What do you sell?" />
          </div>
          <button type="submit" disabled={creating || !name.trim()} className="btn-primary">
            {creating ? <Loader2 size={16} className="animate-spin" /> : "Create Shop"}
          </button>
        </form>
      </div>
    </div>
  );
}