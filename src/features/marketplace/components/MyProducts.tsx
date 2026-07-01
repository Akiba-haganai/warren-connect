import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/products/productService";
import { useAuthStore } from "@/store/auth/authStore";
import type { Tables } from "@/types/database/database.types";
import { Loader2, Package, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";

type Product = Tables<"products">;

export default function MyProducts() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();

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
    const ok = await confirm({ title: "Delete product?", message: "This cannot be undone." });
    if (!ok) return;
    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
      toast.success("Product deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete.");
    }
  };

  const handleToggleStock = async (product: Product) => {
    if (togglingId) return;
    const previousStatus = product.in_stock;
    const newStatus = previousStatus === false;
    setTogglingId(product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, in_stock: newStatus } : p))
    );
    try {
      await productService.toggleStock(product.id, newStatus);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, in_stock: previousStatus } : p))
      );
      toast.error("Could not update stock status.");
    } finally {
      setTogglingId(null);
    }
  };

  const isInStock = (p: Product) => p.in_stock !== false;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        <Package size={14} className="inline mr-1" /> My Products
      </h3>
      <div className="flex flex-col gap-2">
        {products.map((item) => (
          <div key={item.id} className="card p-3 flex justify-between items-center">
            <Link to={`/marketplace/${item.id}`} className="flex-1" style={{ textDecoration: "none", color: "inherit" }}>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                K{(item.price ?? 0).toLocaleString()} · {isInStock(item) ? "In stock" : "Out of stock"}
              </p>
            </Link>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => handleToggleStock(item)}
                disabled={togglingId === item.id}
                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 disabled:opacity-50"
              >
                {togglingId === item.id ? (
                  <Loader2 size={12} className="animate-spin inline" />
                ) : isInStock(item) ? (
                  "Mark out"
                ) : (
                  "Mark in"
                )}
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
      {ConfirmDialog}
    </div>
  );
}