import { Link } from "react-router-dom";
import type { Tables } from "@/types/database/database.types";
import SaveButton from "@/components/ui/SaveButton";

type Product = Tables<"products">;

interface Props {
  product: Product;
  onView?: (id: string) => void; // for recently viewed
}

export default function ProductCard({ product, onView }: Props) {
  return (
    <Link
      to={`/marketplace/${product.id}`}
      className="card overflow-hidden block relative"
      style={{ textDecoration: "none", color: "inherit" }}
      onClick={() => onView?.(product.id)}
      aria-label={`View product: ${product.title}`}
    >
      {/* Save button top-right */}
      <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
        <SaveButton itemType="product" itemId={product.id} />
      </div>

      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full object-cover"
          style={{ height: 160 }}
          loading="lazy"
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            height: 160,
            background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
          }}
        >
          <span className="text-3xl opacity-30" style={{ color: "white" }}>K</span>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2" style={{ color: "var(--color-text)" }}>
          {product.title}
        </h3>
        {product.description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
            {product.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
            K{product.price.toLocaleString()}
          </p>
          {/* Stock badge */}
          {product.in_stock === false ? (
            <span className="badge bg-red-100 text-red-700">Out of stock</span>
          ) : (
            <span className="badge badge-green">In stock</span>
          )}
        </div>
      </div>
    </Link>
  );
}