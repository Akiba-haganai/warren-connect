import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchService, type SearchResult } from "@/services/search/searchService";
import { Search, X, User, FileText, ShoppingBag, Home, Loader2 } from "lucide-react";

const typeIcons: Record<string, React.FC<{ size?: number }>> = {
  user: User,
  post: FileText,
  product: ShoppingBag,
  accommodation: Home,
};

interface Props {
  onClose: () => void;
}

export default function SearchOverlay({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when overlay opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchService.search(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (link: string) => {
    navigate(link);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Search bar */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      >
        <Search size={18} style={{ color: "var(--color-text-muted)" }} />
        <input
          ref={inputRef}
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: "var(--color-text)" }}
          placeholder="Search people, posts, products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={onClose} className="p-1" aria-label="Close search">
          <X size={20} style={{ color: "var(--color-text-secondary)" }} />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pt-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
          </div>
        ) : results.length === 0 && query.trim() ? (
          <p className="text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
            No results found for "{query}"
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {results.map((item) => {
              const Icon = typeIcons[item.type] ?? FileText;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item.link)}
                  className="card flex items-center gap-3 px-4 py-3 text-left w-full"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--color-bg)", color: "var(--color-text-muted)" }}
                    >
                      <Icon size={18} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                        {item.subtitle}
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {item.type}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}