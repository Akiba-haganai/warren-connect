import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { searchService, type SearchResult } from "@/services/search/searchService";
import {
  Search, X, User, FileText, ShoppingBag, Home, Loader2,
  Clock, ArrowRight
} from "lucide-react";

const typeIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
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
      <mark key={i} className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded px-0.5">
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
    <div className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <Search size={18} className="text-slate-400 dark:text-slate-500" />
        <input
          ref={inputRef}
          className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white"
          placeholder="Search people, posts, products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={onClose} className="p-1" aria-label="Close search">
          <X size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!query.trim() && recent.length > 0 && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-400">
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
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {term}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(term);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
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
            <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" />
          </div>
        )}

        {!loading && query.trim() && !hasResults && (
          <div className="text-center py-16">
            <Search size={40} className="text-slate-400 dark:text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No results for "{query}"
            </p>
          </div>
        )}

        {!loading && hasResults && (
          <>
            <div className="px-4 pt-3 flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab("all")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                  activeTab === "all" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                All
              </button>
              {Object.keys(typeLabels).map((type) =>
                grouped[type] ? (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                      activeTab === type ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    }`}
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
                    className="card flex items-center gap-3 px-4 py-3 text-left w-full hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                        <Icon size={18} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                        {highlightMatch(item.title, query)}
                      </p>
                      {item.subtitle && (
                        <p className="text-xs truncate text-slate-400 dark:text-slate-500">
                          {highlightMatch(item.subtitle, query)}
                        </p>
                      )}
                      <p className="text-[10px] mt-0.5 capitalize text-slate-400 dark:text-slate-500">
                        {item.type}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
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
