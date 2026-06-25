import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { savedService } from "@/services/saved/savedService";
import { productService } from "@/services/products/productService";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { Loader2, HeartOff } from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import AccommodationCard from "@/features/accommodation/components/AccommodationCard";
import type { Tables } from "@/types/database/database.types";

type SavedItem = Tables<"saved_items">;

export default function SavedItemsPage() {
  const user = useAuthStore((s) => s.user);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    savedService.getSavedItems(user.id).then((data) => {
      setSaved(data);
      setLoading(false);
    });
  }, [user]);

  if (!user) return null;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Saved Items</h1>
      </div>
      <div className="px-4 pt-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
        ) : saved.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <HeartOff size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nothing saved yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {saved.map((item) => {
              if (item.item_type === "product") {
                return <SavedProductCard key={item.id} productId={item.item_id} />;
              } else {
                return <SavedAccommodationCard key={item.id} accommodationId={item.item_id} />;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedProductCard({ productId }: { productId: string }) {
  const [product, setProduct] = useState<any>(null);
  useEffect(() => {
    productService.getProductById(productId).then(setProduct);
  }, [productId]);
  if (!product) return null;
  return <ProductCard product={product} />;
}

function SavedAccommodationCard({ accommodationId }: { accommodationId: string }) {
  const [accommodation, setAccommodation] = useState<any>(null);
  useEffect(() => {
    accommodationService.getAccommodationById(accommodationId).then(setAccommodation);
  }, [accommodationId]);
  if (!accommodation) return null;
  return <AccommodationCard listing={accommodation} />;
}