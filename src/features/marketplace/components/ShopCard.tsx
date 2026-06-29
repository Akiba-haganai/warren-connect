// features/marketplace/components/ShopCard.tsx
import { Link } from "react-router-dom";
import { Store } from "lucide-react";

interface ShopCardProps {
  shop: {
    id: string;
    name: string;
    logo_url?: string;
    description?: string;
    product_count: number;
  };
}

export default function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link
      to={`/shop/${shop.id}`}
      className="card flex items-center gap-3 p-3"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {/* Logo */}
      <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
           style={{ background: "var(--color-bg)" }}>
        {shop.logo_url ? (
          <img src={shop.logo_url} className="w-full h-full object-cover" alt={shop.name} />
        ) : (
          <Store size={22} style={{ color: "var(--color-text-muted)" }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
          {shop.name}
        </h4>
        {shop.description && (
          <p className="text-xs line-clamp-1" style={{ color: "var(--color-text-secondary)" }}>
            {shop.description}
          </p>
        )}
        <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
          {shop.product_count} product{shop.product_count !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Arrow indicator */}
      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>›</span>
    </Link>
  );
}