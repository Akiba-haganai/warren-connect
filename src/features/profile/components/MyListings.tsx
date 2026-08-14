import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";
import CreateShopModal from "@/features/marketplace/components/CreateShopModal";
import { shopService } from "@/services/shop/shopService";
import { productService, type Product } from "@/services/products/productService";

type Accommodation = Tables<"accommodations">;

export default function MyListings() {
  const user = useAuthStore((s) => s.user);
  const [listings, setListings] = useState<Accommodation[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myShop, setMyShop] = useState<any>(null);
  const [shopCount, setShopCount] = useState<number>(0);
  // const [loadingShopCount, setLoadingShopCount] = useState(false);
  const [showCreateShop, setShowCreateShop] = useState(false);

  useEffect(() => {
    if (!user) return;
    accommodationService
      .getMyAccommodations(user.id)
      .then(setListings)
      .catch(console.error);

    productService
      .getUserProducts(user.id)
      .then(setMyProducts)
      .catch(console.error);

    shopService
      .getShopsForUser(user.id)
      .then((shops) => {
        setShopCount(shops.length);
        setMyShop(shops[0] ?? null);
      })
      .catch(() => {});
  
  
  }, [user]);

  if (!listings.length && !myProducts.length && !myShop) return null; // hide if nothing to show

  return (
    <div className="mt-4 px-4">
      {/* Accommodation listings */}
      {listings.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
            My Listings
          </h3>
          <div className="flex flex-col gap-2">
            {listings.map((item) => (
              <Link
                key={item.id}
                to={`/accommodation/${item.id}`}
                className="card p-3 flex justify-between items-center"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {item.location} · K{item.monthly_rent}/mo
                  </p>
                </div>
                <span className={`badge ${item.status === "available" ? "badge-amber" : "badge-green"}`}>
                  {item.status}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Marketplace Products */}
      {myProducts.length > 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
            My Marketplace Products ({myProducts.length})
          </h3>
          <div className="flex flex-col gap-2">
            {myProducts.map((p) => (
              <Link
                key={p.id}
                to={`/marketplace/${p.id}`}
                className="card p-3 flex justify-between items-center"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    K{p.price} {p.condition ? `· ${p.condition}` : ""}
                  </p>
                </div>
                {p.is_hidden && (
                  <span className="badge badge-amber text-[10px]">Hidden</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4">
        {myShop ? (
          <div className="flex gap-2">
            <Link
              to={`/shop/${myShop.id}`}
              className="btn-primary flex-1 items-center justify-center gap-2"
              style={{ textDecoration: "none" }}
            >
              📦 My Shops
            </Link>
            {shopCount < 2 && (
              <button
                onClick={() => setShowCreateShop(true)}
                className="btn-ghost flex items-center justify-center gap-2"
              >
                🛍️ Create another
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowCreateShop(true)}
            className="btn-primary flex items-center justify-center gap-2"
          >
            🛍️ Create Shop
          </button>
        )}
      </div>

      {showCreateShop && (
        <CreateShopModal
          onClose={() => setShowCreateShop(false)}
          onCreated={() => {
  setShowCreateShop(false);
  shopService.getMyShop(user!.id).then(setMyShop);
}}
        />
      )}
    </div>
  );
}