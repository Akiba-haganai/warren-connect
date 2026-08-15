import { Link } from "react-router-dom";
import { useRecentlyViewed } from "@/hooks/useRecentlyviewed";
import { Clock, X, ShoppingBag, Building2, Trash2 } from "lucide-react";
import { storageService } from "@/services/storage/storageService";

interface Props {
  filterType?: "product" | "accommodation";
  title?: string;
}

export default function RecentlyViewedSection({ filterType, title }: Props) {
  const { recentItems, removeRecent, clearRecent } = useRecentlyViewed();

  const filteredItems = filterType
    ? recentItems.filter((i) => i.type === filterType)
    : recentItems;

  if (filteredItems.length === 0) return null;

  return (
    <div className="mb-5 px-1 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-primary" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {title || "Recently Viewed"}
          </h3>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
            {filteredItems.length}
          </span>
        </div>

        <button
          onClick={clearRecent}
          className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
          title="Clear viewing history"
        >
          <Trash2 size={11} /> Clear All
        </button>
      </div>

      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar py-1 flex-nowrap" style={{ WebkitOverflowScrolling: "touch" }}>
        {filteredItems.map((item) => {
          const displayUrl = item.imageUrl
            ? storageService.getPublicUrl(
                item.type === "product" ? "product-images" : "accommodation-images",
                item.imageUrl
              )
            : null;

          const detailPath =
            item.type === "product"
              ? `/marketplace/${item.id}`
              : `/accommodation/${item.id}`;

          return (
            <div
              key={`${item.type}-${item.id}`}
              className="flex-shrink-0 w-36 group relative rounded-2xl border border-border bg-surface overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              {/* Individual remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeRecent(item.id, item.type);
                }}
                className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full bg-black/60 text-white/80 hover:bg-black hover:text-white transition-all opacity-80 group-hover:opacity-100"
                aria-label="Remove from recent"
                title="Remove"
              >
                <X size={11} />
              </button>

              <Link
                to={detailPath}
                className="block"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {/* Thumbnail Header */}
                <div className="relative h-24 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {displayUrl ? (
                    <img
                      src={displayUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20">
                      {item.type === "product" ? (
                        <ShoppingBag size={24} className="text-primary/40" />
                      ) : (
                        <Building2 size={24} className="text-primary/40" />
                      )}
                    </div>
                  )}

                  {/* Item Type Badge */}
                  <span className="absolute bottom-1.5 left-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs flex items-center gap-0.5">
                    {item.type === "product" ? "🛍️ Item" : "🏠 Housing"}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-2.5">
                  <h4 className="text-xs font-bold line-clamp-1 text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>

                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-primary">
                      {item.price ? `K${item.price.toLocaleString()}` : "View"}
                    </span>
                    {item.location && (
                      <span className="text-[9px] text-slate-400 font-medium truncate max-w-[50px]">
                        {item.location.replace("Lusaka - ", "").replace("Kitwe - ", "")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
