import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { useSavedItems } from "@/hooks/useSavedItems";
import { usePriceDropListener } from "@/hooks/usePriceDrop";
import { savedService } from "@/services/saved/savedService";
import { Link } from "react-router-dom";
import {
  Heart,
  ShoppingBag,
  Building2,
  Loader2,
  Trash2,
  ArrowUpDown,
  Filter,
  Sparkles,
  MapPin,
  Tag,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

type SortOption = "newest" | "oldest" | "price_asc" | "price_desc";
type FilterOptions = { available?: boolean; minPrice?: number; maxPrice?: number };

// Type guard helpers
const isProductItem = (
  item: any
): item is { data: { price?: number; in_stock?: boolean; condition?: string; image_url?: string | null; title: string; id: string } } =>
  item.item_type === "product";

const isAccommodationItem = (
  item: any
): item is { data: { monthly_rent?: number; status?: string; image_url?: string | null; title: string; id: string; location?: string } } =>
  item.item_type === "accommodation";

export default function SavedItemsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useSavedItems(user?.id);
  usePriceDropListener();

  const [activeTab, setActiveTab] = useState<"all" | "product" | "accommodation">("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);

  const productCount = useMemo(() => items?.filter((i) => i.item_type === "product").length ?? 0, [items]);
  const accommodationCount = useMemo(() => items?.filter((i) => i.item_type === "accommodation").length ?? 0, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    let result = [...items];

    if (activeTab !== "all") result = result.filter((i) => i.item_type === activeTab);

    if (filters.available !== undefined) {
      result = result.filter((i) => {
        if (isProductItem(i)) return (i.data?.in_stock ?? true) === filters.available;
        if (isAccommodationItem(i)) return (i.data?.status === "available") === filters.available;
        return true;
      });
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      result = result.filter((i) => {
        const price = isProductItem(i) ? i.data?.price : isAccommodationItem(i) ? i.data?.monthly_rent : undefined;
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
          const aPrice = isProductItem(a) ? a.data?.price : isAccommodationItem(a) ? a.data?.monthly_rent : 0;
          const bPrice = isProductItem(b) ? b.data?.price : isAccommodationItem(b) ? b.data?.monthly_rent : 0;
          return (aPrice ?? 0) - (bPrice ?? 0);
        });
        break;
      case "price_desc":
        result.sort((a, b) => {
          const aPrice = isProductItem(a) ? a.data?.price : isAccommodationItem(a) ? a.data?.monthly_rent : 0;
          const bPrice = isProductItem(b) ? b.data?.price : isAccommodationItem(b) ? b.data?.monthly_rent : 0;
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
    try {
      await savedService.unsaveItem(user.id, itemType, itemId);
      queryClient.invalidateQueries({ queryKey: ["saved_items", user.id] });
      toast.success("Removed from saved items");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 1-Line Sticky Glassmorphic Header */}
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Heart size={18} className="fill-emerald-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-none">Saved Items</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {items?.length ?? 0} saved listing{(items?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSort((s) =>
                  s === "newest" ? "price_asc" : s === "price_asc" ? "price_desc" : s === "price_desc" ? "oldest" : "newest"
                )
              }
              className="px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowUpDown size={13} className="text-primary" />
              <span className="hidden sm:inline">Sort:</span>
              {sort === "newest" ? "Newest" : sort === "price_asc" ? "Price ↑" : sort === "price_desc" ? "Price ↓" : "Oldest"}
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-full border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showFilters || filters.available !== undefined || filters.minPrice || filters.maxPrice
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Filter size={13} />
              Filter
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {[
            { id: "all", label: "All Items", count: items?.length ?? 0, icon: Sparkles },
            { id: "product", label: "Products", count: productCount, icon: ShoppingBag },
            { id: "accommodation", label: "Accommodations", count: accommodationCount, icon: Building2 },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface border border-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <IconComponent size={14} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="border-t border-border bg-slate-100/80 dark:bg-slate-900/80 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.available === true}
                    onChange={(e) => setFilters((f) => ({ ...f, available: e.target.checked ? true : undefined }))}
                    className="rounded text-primary focus:ring-primary"
                  />
                  Available Only
                </label>
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="number"
                  placeholder="Min ZMW"
                  className="input-field text-xs py-1.5 px-3 flex-1 bg-surface"
                  value={filters.minPrice ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                />
                <span className="text-xs text-slate-400">–</span>
                <input
                  type="number"
                  placeholder="Max ZMW"
                  className="input-field text-xs py-1.5 px-3 flex-1 bg-surface"
                  value={filters.maxPrice ?? ""}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                />
                {(filters.available !== undefined || filters.minPrice || filters.maxPrice) && (
                  <button
                    type="button"
                    onClick={() => setFilters({})}
                    className="text-xs font-bold text-red-500 hover:underline px-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary mb-3" size={32} />
            <p className="text-sm font-medium text-slate-500">Loading saved items…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl p-12 text-center bg-surface border border-dashed border-border shadow-xs my-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Heart size={32} className="fill-emerald-500/30" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {items?.length === 0 ? "No saved items yet" : "No items match your active filters"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              {items?.length === 0
                ? "Tap the heart icon on any product or accommodation listing to save it for quick access anytime."
                : "Try adjusting your price range or clearing availability filters."}
            </p>

            {items?.length === 0 && (
              <div className="flex justify-center gap-3">
                <Link
                  to="/marketplace"
                  className="btn-primary py-2.5 px-5 text-xs inline-flex items-center gap-2 rounded-xl"
                >
                  <ShoppingBag size={15} /> Browse Marketplace
                </Link>
                <Link
                  to="/accommodation"
                  className="py-2.5 px-5 text-xs inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Building2 size={15} /> Browse Housing
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const data = item.data;
              if (!data) {
                return (
                  <div
                    key={`${item.item_type}-${item.item_id}`}
                    className="bg-surface border border-border rounded-2xl p-4 flex flex-col items-center text-center opacity-60"
                  >
                    <Building2 size={24} className="text-slate-400 mb-2" />
                    <p className="text-xs text-slate-500">Listing no longer available</p>
                    <button
                      type="button"
                      onClick={() => handleUnsave(item.item_type, item.item_id)}
                      className="text-xs text-red-500 font-bold hover:underline mt-2 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                );
              }

              const isProduct = item.item_type === "product";
              const price = isProduct ? (data as any).price : (data as any).monthly_rent;
              const savedPrice = (item as any).savedPrice;
              const priceDropped = isProduct && savedPrice && price < savedPrice;
              const isAvailable = isProduct
                ? (data as any).in_stock ?? true
                : (data as any).status === "available" || !(data as any).status;

              return (
                <div
                  key={`${item.item_type}-${item.item_id}`}
                  className="group bg-surface border border-border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col relative"
                >
                  {/* Card Image Header */}
                  <Link
                    to={`/${isProduct ? "marketplace" : "accommodation"}/${data.id}`}
                    className="relative aspect-video block overflow-hidden bg-slate-100 dark:bg-slate-800"
                  >
                    {data.image_url ? (
                      <img
                        src={data.image_url}
                        alt={data.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                        {isProduct ? <ShoppingBag size={28} /> : <Building2 size={28} />}
                        <span className="text-[10px] uppercase font-bold tracking-wider">No Photo</span>
                      </div>
                    )}

                    {/* Category Type Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-xs backdrop-blur-xs flex items-center gap-1 ${
                          isProduct ? "bg-teal-600/90" : "bg-blue-600/90"
                        }`}
                      >
                        {isProduct ? <ShoppingBag size={10} /> : <Building2 size={10} />}
                        {isProduct ? "Product" : "Housing"}
                      </span>

                      {priceDropped && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500 text-white shadow-xs animate-bounce flex items-center gap-1">
                          <Tag size={10} /> Price Drop!
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Unsave Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleUnsave(item.item_type, item.item_id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                    aria-label="Remove saved item"
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Card Content Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        to={`/${isProduct ? "marketplace" : "accommodation"}/${data.id}`}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-primary transition-colors line-clamp-2"
                      >
                        {data.title}
                      </Link>

                      {!isProduct && (data as any).location && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin size={12} className="text-primary shrink-0" />
                          <span className="truncate">{(data as any).location}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between">
                      <div>
                        <span className="text-base font-extrabold text-primary">
                          K{price?.toLocaleString()}
                        </span>
                        {!isProduct && <span className="text-[11px] font-normal text-slate-500"> /mo</span>}
                      </div>

                      <div className="flex items-center gap-1">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <XCircle size={12} /> {isProduct ? "Sold" : "Rented"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}