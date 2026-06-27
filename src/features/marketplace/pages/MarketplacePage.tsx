import { useState } from "react";
import { productService } from "@/services/products/productService";
import { Plus, Search, ShoppingBag, Loader2 } from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import ProductComposer from "@/features/marketplace/components/ProductComposer";
import BulkUpload from "@/features/marketplace/components/BulkUpload";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

const PAGE_SIZE = 10;

export default function MarketplacePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

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
  });

  const { ref: loadMoreRef, inView } = useInView();
  if (inView && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }

  const allProducts = data?.pages.flatMap((p) => p.products) ?? [];
  const filtered = allProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleProductCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
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
          <button
            onClick={() => setShowBulkUpload(true)}
            className="btn-ghost text-xs"
          >
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
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
          <input
            className="input-field"
            style={{ paddingLeft: "2.5rem" }}
            placeholder="Search listings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search marketplace listings"
          />
        </div>

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
              {search ? "No listings match your search" : "Nothing listed yet"}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              {search ? "Try a different search term." : "Be the first to sell something!"}
            </p>
            {!search && (
              <button onClick={() => setShowComposer(true)} className="btn-primary w-auto px-6 mx-auto inline-flex items-center gap-2">
                <Plus size={16} /> List your first item
              </button>
            )}
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
    </div>
  );
}