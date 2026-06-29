import { useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import { productService } from "@/services/products/productService";
import { tagService } from "@/services/tags/tagService";
import { Plus, Search, ShoppingBag, Loader2, Store } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { shopService } from "@/services/shop/shopService";
import ProductCard from "@/features/marketplace/components/ProductCard";
import ProductComposer from "@/features/marketplace/components/ProductComposer";
import BulkUpload from "@/features/marketplace/components/BulkUpload";
import MyProducts from "@/features/marketplace/components/MyProducts";
import CreateShopModal from "@/features/marketplace/components/CreateShopModal";
import ShopList from "@/features/marketplace/components/ShopList";   // <-- new

const PAGE_SIZE = 10;

export default function MarketplacePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedTag, setSelectedTag] = useState("");
  const [showMyProducts, setShowMyProducts] = useState(false);
  const [showCreateShop, setShowCreateShop] = useState(false);

  // ---- View mode: products | shops ----
  const [viewMode, setViewMode] = useState<"products" | "shops">("products");

  // Fetch all tags for filter chips
  const { data: allTags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => tagService.getAllTags(),
  });

  // Fetch products with pagination (only when viewMode === "products")
  const fetchProducts = async ({ pageParam = 0 }) => {
    const offset = pageParam * PAGE_SIZE;
    const data = await productService.getProductsPaginated(PAGE_SIZE, offset);
    return {
      products: data,
      nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["products", search],
    queryFn: fetchProducts,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: viewMode === "products",   // <-- only for products
  });

  const { ref: loadMoreRef, inView } = useInView();
  if (inView && hasNextPage && !isFetchingNextPage && viewMode === "products") {
    fetchNextPage();
  }

  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];

  // Client‑side filtering for MVP — search text + tag
  const filteredBySearch = allProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Tag filtering – fetch tags for each product
  const { data: productTagMap } = useQuery({
    queryKey: ["product-tags", allProducts.map((p) => p.id).join(",")],
    queryFn: async () => {
      const map: Record<string, string[]> = {};
      await Promise.all(
        allProducts.map(async (p) => {
          const tags = await tagService.getTagsForProduct(p.id);
          map[p.id] = tags;
        })
      );
      return map;
    },
    enabled: allProducts.length > 0 && viewMode === "products",
  });

  const filtered = selectedTag && productTagMap
    ? filteredBySearch.filter((p) => (productTagMap[p.id] || []).includes(selectedTag))
    : filteredBySearch;

  const handleProductCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["all-tags"] });
    queryClient.invalidateQueries({ queryKey: ["product-tags"] });
  };

  const handleShopClick = async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    const shop = await shopService.getMyShop(user.id);
    if (shop) {
      navigate(`/shop/${shop.id}`);
    } else {
      setShowCreateShop(true);
    }
  };

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h1 className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
          Marketplace
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBulkUpload(true)} className="btn-ghost text-xs">
            📦 Bulk
          </button>
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--color-primary)", color: "#fff" }}
          >
            <Plus size={15} /> Sell
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {/* ---- Product/Shop toggle ---- */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setViewMode("products")}
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              viewMode === "products"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
            style={
              viewMode === "products"
                ? { background: "var(--color-primary)", color: "#fff" }
                : { background: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
            }
          >
            Products
          </button>
          <button
            onClick={() => setViewMode("shops")}
            className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${
              viewMode === "shops"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
            style={
              viewMode === "shops"
                ? { background: "var(--color-primary)", color: "#fff" }
                : { background: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
            }
          >
            <Store size={12} /> Shops
          </button>

          {/* My Shop & My Products (only in products view) */}
          {viewMode === "products" && (
            <>
              <button onClick={() => setShowMyProducts(!showMyProducts)} className="btn-ghost text-xs">
                {showMyProducts ? "Hide" : "My Products"}
              </button>
              <button onClick={handleShopClick} className="btn-ghost text-xs flex items-center gap-1">
                <Store size={14} /> My Shop
              </button>
            </>
          )}
        </div>

        {showMyProducts && viewMode === "products" && <MyProducts />}

        {/* ---- Products view ---- */}
        {viewMode === "products" && (
          <>
            {/* Search bar */}
            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-text-muted)" }}
              />
              <input
                className="input-field"
                style={{ paddingLeft: "2.5rem" }}
                placeholder="Search listings…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search marketplace listings"
              />
            </div>

            {/* Tag filter chips */}
            {allTags && allTags.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-1 hide-scrollbar relative">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTag("")}
                    className="text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap active:scale-95 transition-transform"
                    style={{
                      background: !selectedTag ? "var(--color-primary)" : "var(--color-bg)",
                      color: !selectedTag ? "#fff" : "var(--color-text-secondary)",
                      border: !selectedTag ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                    }}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(tag.name)}
                      className="text-[10px] px-3 py-1 rounded-full font-medium whitespace-nowrap active:scale-95 transition-transform"
                      style={{
                        background: selectedTag === tag.name ? "var(--color-primary)" : "var(--color-bg)",
                        color: selectedTag === tag.name ? "#fff" : "var(--color-text-secondary)",
                        border: selectedTag === tag.name ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
                {/* Gradient fade to indicate more scroll */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8"
                  style={{ background: "linear-gradient(to left, var(--color-bg), transparent)" }} />
              </div>
            )}

            {/* Product grid / loading / empty states */}
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
            ) : allProducts.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
                <ShoppingBag size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
                <h3 className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
                  {search || selectedTag ? "No listings match your criteria" : "Nothing listed yet"}
                </h3>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
                  {search || selectedTag ? "Try a different search term or tag." : "Be the first to sell something!"}
                </p>
                {!search && !selectedTag && (
                  <button onClick={() => setShowComposer(true)} className="btn-primary w-auto px-6 mx-auto inline-flex items-center gap-2">
                    <Plus size={16} /> List your first item
                  </button>
                )}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No products match this tag.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {filtered.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <div ref={loadMoreRef} className="h-4" />
                {isFetchingNextPage && (
                  <Loader2 className="animate-spin mx-auto mt-4" style={{ color: "var(--color-text-muted)" }} />
                )}
              </>
            )}
          </>
        )}

        {/* ---- Shops view ---- */}
        {viewMode === "shops" && <ShopList />}
      </div>

      {showComposer && (
        <ProductComposer
          onClose={() => setShowComposer(false)}
          onCreated={handleProductCreated}
        />
      )}

      {showBulkUpload && (
        <BulkUpload
          onClose={() => setShowBulkUpload(false)}
          onCreated={handleProductCreated}
        />
      )}

      {showCreateShop && (
        <CreateShopModal
          onClose={() => setShowCreateShop(false)}
          onCreated={(shopId) => {
            setShowCreateShop(false);
            navigate(`/shop/${shopId}`);
          }}
        />
      )}
    </div>
  );
}