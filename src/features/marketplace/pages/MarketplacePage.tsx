import { useState, useMemo, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
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
import ProductComposer from "@/features/marketplace/components/ProductComposer";
import BulkUpload from "@/features/marketplace/components/BulkUpload";
import MyProducts from "@/features/marketplace/components/MyProducts";
import CreateShopModal from "@/features/marketplace/components/CreateShopModal";
import ShopList from "@/features/marketplace/components/ShopList";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";
import { useConfirm } from "@/hooks/useConfirm";
import { Link } from "react-router-dom";

type SortMode = "newest" | "oldest" | "price_asc" | "price_desc";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [showMyProducts, setShowMyProducts] = useState(false);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [viewMode, setViewMode] = useState<"products" | "shops">("products");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const { recentItems } = useRecentlyViewed();
  const { ConfirmDialog } = useConfirm();

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

  const handleShopClick = async () => {
    if (!user) return;
    const shop = await shopService.getMyShop(user.id);
    if (shop) navigate(`/shop/${shop.id}`);
    else setShowCreateShop(true);
  };

  return (
    <div ref={containerRef} style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {refreshing && (
        <div className="flex items-center justify-center py-2 text-xs text-primary">
          <RefreshCw size={14} className="animate-spin mr-2" /> Refreshing…
        </div>
      )}

      <div className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>Marketplace</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing} className="p-1">
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} style={{ color: "var(--color-text-muted)" }} />
          </button>
          <button onClick={() => setShowBulkUpload(true)} className="btn-ghost text-xs">📦 Bulk</button>
          <button onClick={() => setShowComposer(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff" }}>
            <Plus size={15} /> Sell
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setViewMode("products")} className={`text-xs px-3 py-1 rounded-full font-medium ${viewMode === "products" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            style={viewMode === "products" ? { background: "var(--color-primary)", color: "#fff" } : { background: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
            Products
          </button>
          <button onClick={() => setViewMode("shops")} className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${viewMode === "shops" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
            style={viewMode === "shops" ? { background: "var(--color-primary)", color: "#fff" } : { background: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
            <Store size={12} /> Shops
          </button>
          {viewMode === "products" && (
            <>
              <button onClick={() => setShowMyProducts(!showMyProducts)} className="btn-ghost text-xs">{showMyProducts ? "Hide" : "My Products"}</button>
              <button onClick={handleShopClick} className="btn-ghost text-xs flex items-center gap-1"><Store size={14} /> My Shop</button>
            </>
          )}
        </div>

        {showMyProducts && viewMode === "products" && <MyProducts />}

        {recentItems.length > 0 && viewMode === "products" && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>Recently Viewed</h3>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {recentItems.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={`/${item.type === "product" ? "marketplace" : "accommodation"}/${item.id}`}
                  className="flex-shrink-0 w-20 text-center"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover mx-auto" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg mx-auto bg-gray-200 flex items-center justify-center">
                      <ShoppingBag size={16} style={{ color: "var(--color-text-muted)" }} />
                    </div>
                  )}
                  <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--color-text)" }}>{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {viewMode === "products" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input className="input-field pl-9" placeholder="Search listings…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="input-field w-auto text-xs" style={{ width: 100 }}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {["all", "new", "used", "refurbished"].map((cond) => (
                <button key={cond} onClick={() => setConditionFilter(cond)}
                  className={`text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap ${conditionFilter === cond ? "bg-primary text-white" : "bg-gray-100 text-gray-600"}`}
                  style={{
                    background: conditionFilter === cond ? "var(--color-primary)" : "var(--color-bg)",
                    color: conditionFilter === cond ? "#fff" : "var(--color-text-secondary)",
                    border: conditionFilter !== cond ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  {cond === "all" ? "All" : cond.charAt(0).toUpperCase() + cond.slice(1)}
                </button>
              ))}
            </div>

            {allTags && allTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-1 hide-scrollbar relative">
                <div className="flex gap-2">
                  <button onClick={() => setSelectedTag("")} className="text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap"
                    style={{ background: !selectedTag ? "var(--color-primary)" : "var(--color-bg)", color: !selectedTag ? "#fff" : "var(--color-text-secondary)" }}>
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button key={tag.id} onClick={() => setSelectedTag(tag.name)} className="text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap"
                      style={{ background: selectedTag === tag.name ? "var(--color-primary)" : "var(--color-bg)", color: selectedTag === tag.name ? "#fff" : "var(--color-text-secondary)" }}>
                      {tag.name}
                    </button>
                  ))}
                </div>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8" style={{ background: "linear-gradient(to left, var(--color-bg), transparent)" }} />
              </div>
            )}

            {status === "pending" ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card overflow-hidden">
                    <div className="skeleton" style={{ height: 160 }} />
                    <div className="p-3 flex flex-col gap-2">
                      <div className="skeleton rounded" style={{ height: 12, width: "80%" }} />
                      <div className="skeleton rounded" style={{ height: 12, width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : finalFiltered.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
                <ShoppingBag size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {search || selectedTag || conditionFilter !== "all" ? "No listings match your criteria" : "Nothing listed yet"}
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                  {search || selectedTag || conditionFilter !== "all" ? "Try adjusting your filters." : "Be the first to sell something!"}
                </p>
                {!search && !selectedTag && conditionFilter === "all" && (
                  <button onClick={() => setShowComposer(true)} className="btn-primary w-auto px-6 mx-auto inline-flex items-center gap-2">
                    <Plus size={16} /> List your first item
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {finalFiltered.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <div ref={loadMoreRef} className="h-4" />
                {isFetchingNextPage && <Loader2 className="animate-spin mx-auto mt-4" style={{ color: "var(--color-text-muted)" }} />}
              </>
            )}
          </>
        )}

        {viewMode === "shops" && <ShopList />}
      </div>

      {showComposer && <ProductComposer onClose={() => setShowComposer(false)} onCreated={handleProductCreated} />}
      {showBulkUpload && <BulkUpload onClose={() => setShowBulkUpload(false)} onCreated={handleProductCreated} />}
      {showCreateShop && <CreateShopModal onClose={() => setShowCreateShop(false)} onCreated={(shopId) => { setShowCreateShop(false); navigate(`/shop/${shopId}`); }} />}

      {ConfirmDialog}
    </div>
  );
}