import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accommodationService } from "@/services/accommodation/accommodationService";
import { shopService } from "@/services/shop/shopService";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";
import CreateShopModal from "@/features/marketplace/components/CreateShopModal"; // Adjust path if needed

type Accommodation = Tables<"accommodations">;

export default function MyListings() {
  const user = useAuthStore((s) => s.user);
  const [listings, setListings] = useState<Accommodation[]>([]);
  const [myShop, setMyShop] = useState<any>(null);
  const [showCreateShop, setShowCreateShop] = useState(false);

  useEffect(() => {
    if (!user) return;
    accommodationService
      .getMyAccommodations(user.id)
      .then(setListings)
      .catch(console.error);

    shopService.getMyShop(user.id).then((shop) => {
      setMyShop(shop);
    }).catch(() => {});
  }, [user]);

  if (!listings.length && !myShop) return null; // hide if nothing to show

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

      {/* Shop section */}
      <div className="mt-4">
        {myShop ? (
          <Link
            to={`/shop/${myShop.id}`}
            className="btn-primary flex items-center justify-center gap-2"
            style={{ textDecoration: "none" }}
          >
            📦 My Shop
          </Link>
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