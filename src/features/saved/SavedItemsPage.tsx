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
type Product = Tables<"products">;
type Accommodation = Tables<"accommodations">;

export default function SavedItemsPage() {
  const user = useAuthStore((s) => s.user);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const items = await savedService.getSavedItems(user.id);
        setSaved(items);

        const productIds = items
          .filter((i) => i.item_type === "product")
          .map((i) => i.item_id);
        const accIds = items
          .filter((i) => i.item_type === "accommodation")
          .map((i) => i.item_id);

        const [prods, accs] = await Promise.all([
          productIds.length ? productService.getProductsByIds(productIds) : [],
          accIds.length ? accommodationService.getAccommodationsByIds(accIds) : [],
        ]);
        setProducts(prods);
        setAccommodations(accs);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  const productMap = new Map(products.map((p) => [p.id, p]));
  const accMap = new Map(accommodations.map((a) => [a.id, a]));

  // Detect price drops for saved products
  const savedWithPriceDrops = saved.filter((item) => {
    if (item.item_type !== "product") return false;
    const currentProduct = productMap.get(item.item_id);
    if (!currentProduct) return false;
    const savedPrice = (item.metadata as any)?.price;
    if (typeof savedPrice !== "number") return false;
    return currentProduct.price < savedPrice;
  });

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
          Saved Items
        </h1>
      </div>
      <div className="px-4 pt-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" />
          </div>
        ) : saved.length === 0 ? (
          <div
            className="rounded-2xl py-16 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <HeartOff
              size={32}
              style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }}
            />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nothing saved yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {saved.map((item) => {
              if (item.item_type === "product") {
                const product = productMap.get(item.item_id);
                if (!product) return null;
                const hasPriceDrop = savedWithPriceDrops.some((s) => s.id === item.id);
                return (
                  <div key={item.id} className="relative">
                    {hasPriceDrop && (
                      <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                        Price Dropped!
                      </span>
                    )}
                    <ProductCard product={product} />
                  </div>
                );
              } else {
                const acc = accMap.get(item.item_id);
                if (!acc) return null;
                return <AccommodationCard key={item.id} listing={acc} />;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}