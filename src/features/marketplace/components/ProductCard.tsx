import { useState } from "react";
import { Link } from "react-router-dom";
import type { Tables } from "@/types/database/database.types";
import SaveButton from "@/components/ui/SaveButton";
import { Share2, Star, Loader2, Package } from "lucide-react";
import { VerificationBadge } from "@/features/verification/components/VerificationBadge";
import { storageService } from "@/services/storage/storageService";
import ShareModal from "@/components/share/ShareModal";

type Product = Tables<"products">;

interface Props {
  product: Product & { seller_avg_rating?: number; seller_review_count?: number };
  onView?: (id: string) => void;
}

export default function ProductCard({ product, onView }: Props) {
  const [imgError, setImgError] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareModalOpen(true);
  };

  const showRating = product.seller_avg_rating && product.seller_review_count;

  const isEdited = (product as any).updated_at && product.created_at && (
    new Date((product as any).updated_at).getTime() - new Date(product.created_at).getTime() > 60000
  );

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

      {(() => {
        const displayUrl = product.image_url
          ? product.image_url.startsWith("http")
            ? product.image_url
            : storageService.getPublicUrl("product-images", product.image_url)
          : null;

        if (displayUrl && !imgError) {
          return (
            <img
              src={displayUrl}
              alt={product.title}
              className="w-full object-cover"
              style={{ height: 160 }}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          );
        }

        if ((product as any).moderation_status === "pending") {
          return (
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{
                height: 160,
                background: "var(--color-bg)",
                borderBottom: "1px dashed var(--color-border)",
              }}
            >
              <Loader2 className="animate-spin mb-2" size={24} style={{ color: "var(--color-text-muted)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Scanning image...</span>
            </div>
          );
        }

        return (
          <div
            className="flex flex-col items-center justify-center gap-1"
            style={{
              height: 160,
              background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
            }}
          >
            <Package size={32} color="rgba(255,255,255,0.4)" />
            <span className="text-sm font-bold text-white/80">K{(product.price ?? 0).toLocaleString()}</span>
          </div>
        );
      })()}

      {/* Condition badge */}
      {product.condition && product.condition !== "used" && (
        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {product.condition}
        </span>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-sm line-clamp-2" style={{ color: "var(--color-text)" }}>
            {product.title}
          </h3>
          {isEdited && (
            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 shrink-0 italic">
              Edited
            </span>
          )}
        </div>
        {product.description && (
          <p
            className="text-xs mt-1 line-clamp-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {product.description}
          </p>
        )}


      {/* Seller verification tier (if available) */}
      {("seller" in (product as any)) && (product as any).seller?.verification_tier && (
        <div className="mt-2">
          <VerificationBadge tier={(product as any).seller.verification_tier} />
        </div>
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

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={product.title}
        price={product.price}
        url={`${window.location.origin}/marketplace/${product.id}`}
        imageUrl={product.image_url ? storageService.getPublicUrl("product-images", product.image_url) : undefined}
        category="product"
      />
    </Link>
  );
}