import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { shopService } from "@/services/shop/shopService";
import { Loader2, Plus, UserPlus} from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import type { Tables } from "@/types/database/database.types";

type Shop = Tables<"shops">;
type Product = Tables<"products">;

interface ShopWithProducts extends Shop {
  products: Product[];
  collaborators?: { user_id: string; role: string; user?: { full_name: string; avatar_url: string } }[];
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [shop, setShop] = useState<ShopWithProducts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await shopService.getShop(id);
        setShop(data as any);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddCollaborator = async () => {
    const userId = prompt("Enter user ID to add as collaborator:");
    if (userId && shop) {
      await shopService.addCollaborator(shop.id, userId);
      // refresh
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (!shop) return <div className="text-center py-10">Shop not found.</div>;

  const isOwner = user?.id === shop.owner_id;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={() => navigate(-1)} className="p-1">←</button>
        <h1 className="text-base font-bold">{shop.name}</h1>
        {isOwner && (
          <button onClick={() => navigate(`/shop/${shop.id}/add-product`)} className="btn-primary w-auto px-3 py-1 text-xs"><Plus size={14} /> Add Product</button>
        )}
      </div>
      <div className="px-4 pt-4">
        {shop.description && <p className="text-sm mb-4">{shop.description}</p>}
        {isOwner && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Collaborators</h3>
            <button onClick={handleAddCollaborator} className="btn-ghost text-xs"><UserPlus size={14} /> Add Collaborator</button>
          </div>
        )}
        <h3 className="section-title">Products ({shop.products?.length || 0})</h3>
        <div className="grid grid-cols-2 gap-3">
          {shop.products?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}