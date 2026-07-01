import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { useSavedItems } from "@/hooks/useSavedItems";
import { usePriceDropListener } from "@/hooks/usePriceDrop";
import { savedService } from "@/services/saved/savedService";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Building2, Loader2, Trash2, ArrowUpDown, Filter } from "lucide-react";

type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";
type FilterOptions = { available?: boolean; minPrice?: number; maxPrice?: number };

// Type guard helpers
const isProductItem = (item: any): item is { data: { price?: number; in_stock?: boolean; condition?: string; image_url?: string | null } } =>
  item.item_type === "product";
const isAccommodationItem = (item: any): item is { data: { monthly_rent?: number; status?: string; image_url?: string | null } } =>
  item.item_type === "accommodation";

export default function SavedItemsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: items, isLoading } = useSavedItems(user?.id);
  usePriceDropListener();

  const [activeTab, setActiveTab] = useState<"all" | "product" | "accommodation">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    if (!items) return [];
    let result = [...items];

    if (activeTab !== "all") result = result.filter((i) => i.item_type === activeTab);

    if (filters.available !== undefined) {
      result = result.filter((i) => {
        if (isProductItem(i)) return (i.data.in_stock ?? false) === filters.available;
        if (isAccommodationItem(i)) return (i.data.status === "available") === filters.available;
        return true;
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      result = result.filter((i) => {
        const price = isProductItem(i) ? i.data.price : isAccommodationItem(i) ? i.data.monthly_rent : undefined;
        if (price === undefined) return true;
        if (filters.minPrice !== undefined && price < filters.minPrice) return false;
        if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
        return true;
      });
    }

    switch (sort) {
      case "oldest":
        result.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
        break;
      case "price_asc":
        result.sort((a, b) => {
          const aPrice = isProductItem(a) ? a.data.price : isAccommodationItem(a) ? a.data.monthly_rent : 0;
          const bPrice = isProductItem(b) ? b.data.price : isAccommodationItem(b) ? b.data.monthly_rent : 0;
          return (aPrice ?? 0) - (bPrice ?? 0);
        });
        break;
      case "price_desc":
        result.sort((a, b) => {
          const aPrice = isProductItem(a) ? a.data.price : isAccommodationItem(a) ? a.data.monthly_rent : 0;
          const bPrice = isProductItem(b) ? b.data.price : isAccommodationItem(b) ? b.data.monthly_rent : 0;
          return (bPrice ?? 0) - (aPrice ?? 0);
        });
        break;
      default:
        result.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    }

    return result;
  }, [items, activeTab, sort, filters]);

  const handleUnsave = async (itemType: string, itemId: string) => {
    if (!user) return;
    await savedService.unsaveItem(user.id, itemType, itemId);
  };

  if (!user) return null;

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Saved Items</h1>
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {(["all", "product", "accommodation"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${activeTab === tab ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
              style={{
                background: activeTab === tab ? "var(--color-primary)" : "var(--color-bg)",
                color: activeTab === tab ? "#fff" : "var(--color-text-secondary)",
                border: activeTab !== tab ? "1px solid var(--color-border)" : "none",
              }}>
              {tab === "all" ? "All" : tab === "product" ? "Products" : "Accommodations"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => setSort(sort === "newest" ? "oldest" : sort === "oldest" ? "price_asc" : sort === "price_asc" ? "price_desc" : "newest")}
            className="btn-ghost text-xs flex items-center gap-1">
            <ArrowUpDown size={12} />
            {sort === "newest" ? "Newest" : sort === "oldest" ? "Oldest" : sort === "price_asc" ? "Price ↑" : "Price ↓"}
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-ghost text-xs flex items-center gap-1 ${showFilters ? "text-primary" : ""}`}>
            <Filter size={12} /> Filter
          </button>
        </div>
        {showFilters && (
          <div className="mt-2 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 space-y-2">
            <div className="flex items-center gap-4">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={filters.available === true} onChange={(e) => setFilters((f) => ({ ...f, available: e.target.checked ? true : undefined }))} className="rounded" />
                Available
              </label>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={filters.available === false} onChange={(e) => setFilters((f) => ({ ...f, available: e.target.checked ? false : undefined }))} className="rounded" />
                Sold / Rented
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" placeholder="Min price" className="input-field text-xs flex-1" value={filters.minPrice ?? ""} onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))} />
              <input type="number" placeholder="Max price" className="input-field text-xs flex-1" value={filters.maxPrice ?? ""} onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <Heart size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px", opacity: 0.5 }} />
            <h3 className="text-base font-bold mb-1" style={{ color: "var(--color-text)" }}>
              {items?.length === 0 ? "No saved items yet" : "No items match your filters"}
            </h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {items?.length === 0 ? "Tap the heart icon on any listing to save it." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => {
              const data = item.data;
              if (!data) {
                return (
                  <div key={`${item.item_type}-${item.item_id}`} className="card p-4 flex flex-col items-center text-center opacity-60">
                    <Building2 size={24} style={{ color: "var(--color-text-muted)" }} />
                    <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>Listing unavailable</p>
                    <button onClick={() => handleUnsave(item.item_type, item.item_id)} className="text-xs text-red-500 mt-2">Remove</button>
                  </div>
                );
              }

              const isProduct = item.item_type === "product";
              const price = isProduct ? (data as any).price : (data as any).monthly_rent;
              const savedPrice = (item as any).savedPrice;
              const priceDropped = isProduct && savedPrice && price < savedPrice;

              return (
                <Link
                  key={`${item.item_type}-${item.item_id}`}
                  to={`/${isProduct ? "marketplace" : "accommodation"}/${data.id}`}
                  className="card overflow-hidden block relative" style={{ textDecoration: "none", color: "inherit" }}>
                  {data.image_url ? (
                    <img src={data.image_url} alt={data.title} className="w-full object-cover h-32" loading="lazy" />
                  ) : (
                    <div className="h-32 flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                      {isProduct ? <ShoppingBag size={24} /> : <Building2 size={24} />}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-semibold line-clamp-2" style={{ color: "var(--color-text)" }}>{data.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                        K{price?.toLocaleString()}{isProduct ? "" : "/mo"}
                      </span>
                      {priceDropped && <span className="badge bg-green-100 text-green-700 text-[10px]">Price dropped!</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); handleUnsave(item.item_type, item.item_id); }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-red-100" aria-label="Remove saved item">
                    <Trash2 size={12} style={{ color: "var(--color-error)" }} />
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}