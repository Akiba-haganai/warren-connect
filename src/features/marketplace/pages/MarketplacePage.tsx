import { useEffect, useState } from "react";
import { productService } from "@/services/products/productService";
import type { Tables } from "@/types/database/database.types";
import { Plus, Search } from "lucide-react";
import ProductCard from "@/features/marketplace/components/ProductCard";
import ProductComposer from "@/features/marketplace/components/ProductComposer";

type Product = Tables<"products">;

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100%" }}>
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
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff" }}
        >
          <Plus size={15} /> Sell
        </button>
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

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton" style={{ height: 160 }} />
                <div className="p-3 flex flex-col gap-2">
                  <div className="skeleton rounded" style={{ height: 12, width: "80%" }} />
                  <div className="skeleton rounded" style={{ height: 12, width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {search ? "No listings match your search" : "No listings yet — be the first to sell!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {showComposer && (
        <ProductComposer
          onClose={() => setShowComposer(false)}
          onCreated={() => loadProducts()}
        />
      )}
    </div>
  );
}