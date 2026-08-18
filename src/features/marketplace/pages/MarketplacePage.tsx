import { useState, useMemo, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tagService } from "@/services/tags/tagService";
import { useProducts } from "@/hooks/useProducts";
import { useAuthStore } from "@/store/auth/authStore";
import { shopService } from "@/services/shop/shopService";
import {
  Plus, Search, ShoppingBag, Loader2, Store,
  RefreshCw
} from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import ProductComposer from "@/features/marketplace/components/ProductComposer";
import BulkUpload from "@/features/marketplace/components/BulkUpload";
import MyProducts from "@/features/marketplace/components/MyProducts";
import CreateShopModal from "@/features/marketplace/components/CreateShopModal";
import ShopList from "@/features/marketplace/components/ShopList";
import RecentlyViewedSection from "@/components/ui/RecentlyViewedSection";
import { useConfirm } from "@/hooks/useConfirm";

type SortMode = "newest" | "oldest" | "price_asc" | "price_desc";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [showMyProducts, setShowMyProducts] = useState(false);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [shopCount, setShopCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"products" | "shops">("products");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const { ConfirmDialog } = useConfirm();

  // ---- Shop pre-selection & composer state sync with URL ----
  const [composerShopId, setComposerShopId] = useState<string>("");

  // Restore composer state on mount (covers deep links and LMK reloads)
  useEffect(() => {
    const shopId = searchParams.get("shopId");
    const composerParam = searchParams.get("composer");
    if (shopId || composerParam === "product") {
      if (shopId) setComposerShopId(shopId);
      setShowComposer(true);
    }
  }, []);

  // Keep URL in sync with composer state so OS process kills reload cleanly
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (showComposer) {
      next.set("composer", "product");
      if (composerShopId) next.set("shopId", composerShopId);
      else next.delete("shopId");
    } else {
      next.delete("composer");
      next.delete("shopId");
    }
    setSearchParams(next, { replace: true });
  }, [showComposer, composerShopId]);

  // ---- Refresh ----
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    setRefreshing(false);
  };
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: allTags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAllTags(),
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useProducts({ enabled: viewMode === "products" });

  const { ref: loadMoreRef, inView } = useInView();
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && viewMode === "products") {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, viewMode]);

  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];

  const filtered = useMemo(() => {
    let result = allProducts.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCondition = conditionFilter === "all" || p.condition === conditionFilter;
      return matchSearch && matchCondition;
    });

    switch (sortMode) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
        break;
      case "price_asc":
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
    }
    return result;
  }, [allProducts, search, conditionFilter, sortMode]);

  const { data: productTagMap } = useQuery({
    queryKey: ["product-tags", allProducts.map((p) => p.id).join(",")],
    queryFn: async () => {
      const map: Record<string, string[]> = {};
      await Promise.all(allProducts.map(async (p) => {
        const tags = await tagService.getTagsForProduct(p.id);
        map[p.id] = tags;
      }));
      return map;
    },
    enabled: allProducts.length > 0 && viewMode === "products",
  });

  const finalFiltered = useMemo(() => {
    if (selectedTag && productTagMap) {
      return filtered.filter((p) => (productTagMap[p.id] || []).includes(selectedTag));
    }
    return filtered;
  }, [filtered, selectedTag, productTagMap]);

  const handleProductCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  useEffect(() => {
    if (!user) return;
    shopService.getShopsForUser(user.id)
      .then((shops) => setShopCount(shops.length))
      .catch(() => setShopCount(0));
  }, [user]);

  const handleShopClick = async () => {
    if (!user) return;
    const shops = await shopService.getShopsForUser(user.id);
    if (shops.length === 0) {
      setShowCreateShop(true);
    } else {
      // Always navigate to the first shop
      navigate(`/shop/${shops[0].id}`);
    }
  };

  return (
    <div ref={containerRef} style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {refreshing && (
        <div className="flex items-center justify-center py-2 text-xs text-primary">
          <RefreshCw size={14} className="animate-spin mr-2" /> Refreshing…
        </div>
      )}

      {/* Ultra-Compact 1-Line Glassmorphic Sticky Header */}
      <div className="sticky top-0 z-20 px-3 py-1.5 flex items-center justify-between gap-2 backdrop-blur-md bg-surface/85 border-b border-border/80 shadow-xs h-11">
        {/* Left: Brand + View Mode Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center text-[11px] font-black shadow-xs">
            P
          </div>
          <button
            onClick={() => setViewMode("products")}
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all ${
              viewMode === "products" ? "bg-primary text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setViewMode("shops")}
            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 transition-all ${
              viewMode === "shops" ? "bg-primary text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Store size={11} /> Shops
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {viewMode === "products" && (
            <>
              <button onClick={() => setShowMyProducts(!showMyProducts)} className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded hover:bg-primary/10">
                {showMyProducts ? "All Items" : "My Items"}
              </button>
              <button onClick={handleShopClick} className="text-[10px] font-bold text-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:inline-flex items-center gap-1">
                <Store size={11} /> {shopCount > 0 ? "My Shop" : "+ Shop"}
              </button>
            </>
          )}
          <button onClick={handleRefresh} disabled={refreshing} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" title="Refresh">
            <RefreshCw size={14} className={refreshing ? "animate-spin text-primary" : "text-slate-400"} />
          </button>
          <button
            onClick={() => setShowComposer(true)}
            className="btn-primary text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1"
          >
            <Plus size={13} /> Sell
          </button>
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 pt-4 pb-8">

        {showMyProducts && viewMode === "products" && <MyProducts />}

        {viewMode === "products" && <RecentlyViewedSection filterType="product" title="Recently Viewed Items" />}

        {viewMode === "products" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input className="input-field pl-9" placeholder="Search listings…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="glass-select text-xs py-2 px-3 shrink-0"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {["all", "new", "used", "refurbished"].map((cond) => (
                <button
                  key={cond}
                  onClick={() => setConditionFilter(cond)}
                  className={`text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap ${conditionFilter === cond ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
                  style={{ background: conditionFilter === cond ? "var(--color-primary)" : "var(--color-bg)", color: conditionFilter === cond ? "#fff" : "var(--color-text-secondary)", border: conditionFilter !== cond ? "1px solid var(--color-border)" : "none" }}
                >
                  {cond === "all" ? "All" : cond.charAt(0).toUpperCase() + cond.slice(1)}
                </button>
              ))}
            </div>

            {allTags && allTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-1 hide-scrollbar relative">
                <div className="flex gap-2">
                  <button onClick={() => setSelectedTag("")} className="text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap" style={{ background: !selectedTag ? "var(--color-primary)" : "var(--color-bg)", color: !selectedTag ? "#fff" : "var(--color-text-secondary)" }}>All</button>
                  {allTags.map((tag) => (
                    <button key={tag.id} onClick={() => setSelectedTag(tag.name)} className="text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap" style={{ background: selectedTag === tag.name ? "var(--color-primary)" : "var(--color-bg)", color: selectedTag === tag.name ? "#fff" : "var(--color-text-secondary)" }}>{tag.name}</button>
                  ))}
                </div>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8" style={{ background: "linear-gradient(to left, var(--color-bg), transparent)" }} />
              </div>
            )}

            {status === "pending" ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : finalFiltered.length === 0 ? (
              <EmptyState 
                icon={ShoppingBag}
                title={search || selectedTag || conditionFilter !== "all" ? "No listings match your criteria" : "Nothing listed yet"}
                description={search || selectedTag || conditionFilter !== "all" ? "Try adjusting your filters." : "Be the first to sell something!"}
                actionLabel={!search && !selectedTag && conditionFilter === "all" ? "List your first item" : undefined}
                onAction={!search && !selectedTag && conditionFilter === "all" ? () => setShowComposer(true) : undefined}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {finalFiltered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
            <div ref={loadMoreRef} className="h-4" />
            {isFetchingNextPage && <Loader2 className="animate-spin mx-auto mt-4" style={{ color: "var(--color-text-muted)" }} />}
          </>
        )}

        {viewMode === "shops" && <ShopList />}
      </div>
      </PullToRefresh>

      {showComposer && (
        <ProductComposer
          onClose={() => { setShowComposer(false); setComposerShopId(""); }}
          onCreated={handleProductCreated}
          initialShopId={composerShopId}
        />
      )}
      {showBulkUpload && <BulkUpload onClose={() => setShowBulkUpload(false)} onCreated={handleProductCreated} />}
      {showCreateShop && (
        <CreateShopModal
          onClose={() => setShowCreateShop(false)}
          onCreated={(shopId) => { setShowCreateShop(false); navigate(`/shop/${shopId}`); }}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}