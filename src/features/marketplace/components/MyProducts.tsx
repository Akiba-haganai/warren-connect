import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productService } from "@/services/products/productService";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";
import { Loader2, Package, Trash2 } from "lucide-react";


type Product = Tables<"products">;

export default function MyProducts() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    productService.getProducts().then((data) => {
      const mine = data.filter((p) => p.seller_id === user.id);
      setProducts(mine);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={20} />
      </div>
    );
  }

  if (products.length === 0) return null;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await productService.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleStock = async (product: Product) => {
    const newStatus = product.in_stock === false;
    await productService.toggleStock(product.id, newStatus);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, in_stock: newStatus } : p))
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        <Package size={14} className="inline mr-1" />
        My Products
      </h3>
      <div className="flex flex-col gap-2">
        {products.map((item) => (
          <div key={item.id} className="card p-3 flex justify-between items-center">
            <Link
              to={`/marketplace/${item.id}`}
              className="flex-1"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                K{item.price.toLocaleString()} ·{" "}
                {item.in_stock !== false ? "In stock" : "Out of stock"}
              </p>
            </Link>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => handleToggleStock(item)}
                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800"
              >
                {item.in_stock !== false ? "Mark out" : "Mark in"}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}