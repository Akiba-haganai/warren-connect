// features/marketplace/components/ShopList.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { shopService } from "@/services/shop/shopService";
import { Search, Store, Loader2 } from "lucide-react";
import ShopCard from "./ShopCard";

export default function ShopList() {
  const [shopSearch, setShopSearch] = useState("");

  const { data: shops, isLoading } = useQuery({
    queryKey: ["shops", shopSearch],
    queryFn: () => shopService.searchShops(shopSearch),
  });

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-3">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          className="input-field"
          style={{ paddingLeft: "2.5rem" }}
          placeholder="Search shops…"
          value={shopSearch}
          onChange={(e) => setShopSearch(e.target.value)}
          aria-label="Search shops"
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={20} />
        </div>
      ) : !shops?.length ? (
        <div className="text-center py-16">
          <Store size={32} style={{ color: "var(--color-text-muted)", margin: "0 auto 8px" }} />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {shopSearch ? "No shops match your search." : "No shops yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </div>
  );
}