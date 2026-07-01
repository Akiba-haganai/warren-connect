import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { searchService, type SearchResult } from "@/services/search/searchService";
import {
  Search, X, User, FileText, ShoppingBag, Home, Loader2,
  Clock, ArrowRight
} from "lucide-react";

const typeIcons: Record<string, React.FC<{ size?: number }>> = {
  user: User,
  post: FileText,
  product: ShoppingBag,
  accommodation: Home,
};

const typeLabels: Record<string, string> = {
  user: "People",
  post: "Posts",
  product: "Products",
  accommodation: "Housing",
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ background: "var(--color-accent-light)", color: "var(--color-primary)", borderRadius: 2, padding: "0 2px" }}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

interface Props {
  onClose: () => void;
}

export default function SearchOverlay({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [recent, setRecent] = useState<string[]>(searchService.getRecentSearches());

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (link: string, title: string) => {
    searchService.addRecentSearch(title);
    navigate(link);
    onClose();
  };

  const handleRecentClick = (searchTerm: string) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  };

  const removeRecent = (term: string) => {
    searchService.removeRecentSearch(term);
    setRecent(searchService.getRecentSearches());
  };

  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!map[r.type]) map[r.type] = [];
      map[r.type].push(r);
    });
    return map;
  }, [results]);

  const filteredResults =
    activeTab === "all" ? results : results.filter((r) => r.type === activeTab);

  const hasResults = results.length > 0;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "var(--color-bg)" }}>
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

      <div className="flex-1 overflow-y-auto">
        {!query.trim() && recent.length > 0 && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                <Clock size={14} /> Recent Searches
              </h3>
              <button
                onClick={() => {
                  searchService.clearRecentSearches();
                  setRecent([]);
                }}
                className="text-xs text-red-500"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((term) => (
                <button
                  key={term}
                  onClick={() => handleRecentClick(term)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200"
                >
                  {term}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(term);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-red-100"
                  >
                    <X size={10} />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
          </div>
        )}

        {!loading && query.trim() && !hasResults && (
          <div className="text-center py-16">
            <Search size={40} style={{ color: "var(--color-text-muted)", margin: "0 auto 12px" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              No results for "{query}"
            </p>
          </div>
        )}

        {!loading && hasResults && (
          <>
            <div className="px-4 pt-3 flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab("all")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
                  activeTab === "all" ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                }`}
                style={{
                  background: activeTab === "all" ? "var(--color-primary)" : "var(--color-bg)",
                  color: activeTab === "all" ? "#fff" : "var(--color-text-secondary)",
                  border: activeTab !== "all" ? "1px solid var(--color-border)" : "none",
                }}
              >
                All
              </button>
              {Object.keys(typeLabels).map((type) =>
                grouped[type] ? (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
                      activeTab === type ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                    }`}
                    style={{
                      background: activeTab === type ? "var(--color-primary)" : "var(--color-bg)",
                      color: activeTab === type ? "#fff" : "var(--color-text-secondary)",
                      border: activeTab !== type ? "1px solid var(--color-border)" : "none",
                    }}
                  >
                    {typeLabels[type]} ({grouped[type]?.length})
                  </button>
                ) : null
              )}
            </div>

            <div className="px-4 pt-3 pb-8 flex flex-col gap-2">
              {filteredResults.map((item) => {
                const Icon = typeIcons[item.type] ?? FileText;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item.link, item.title)}
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
                        {highlightMatch(item.title, query)}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                          {highlightMatch(item.subtitle, query)}
                        </p>
                      )}
                      <p className="text-[10px] mt-0.5 capitalize" style={{ color: "var(--color-text-muted)" }}>
                        {item.type}
                      </p>
                    </div>
                    <ArrowRight size={14} style={{ color: "var(--color-text-muted)" }} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}