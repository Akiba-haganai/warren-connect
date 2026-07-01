import { Link } from "react-router-dom";
import type { Tables } from "@/types/database/database.types";
import SaveButton from "@/components/ui/SaveButton";
import { Share2, Star } from "lucide-react";

type Product = Tables<"products">;

interface Props {
  product: Product & { seller_avg_rating?: number; seller_review_count?: number };
  onView?: (id: string) => void;
}

export default function ProductCard({ product, onView }: Props) {
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: product.description ?? "",
        url: `${window.location.origin}/marketplace/${product.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/marketplace/${product.id}`);
      // toast.success("Link copied!");
    }
  };

  const showRating = product.seller_avg_rating && product.seller_review_count;

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

      {/* Share button top-left */}
      <button
        onClick={handleShare}
        className="absolute top-2 left-2 z-10 p-1 rounded-full bg-white/70 hover:bg-white shadow"
        aria-label="Share product"
      >
        <Share2 size={14} style={{ color: "var(--color-text-secondary)" }} />
      </button>

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

      {/* Condition badge */}
      {product.condition && product.condition !== "used" && (
        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {product.condition}
        </span>
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
        {/* Seller rating */}
        {showRating && (
          <div className="flex items-center gap-1 mt-1">
            <Star size={10} fill="var(--color-accent)" style={{ color: "var(--color-accent)" }} />
            <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {product.seller_avg_rating?.toFixed(1)} ({product.seller_review_count})
            </span>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-base font-bold" style={{ color: "var(--color-primary)" }}>
            K{product.price.toLocaleString()}
          </p>
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