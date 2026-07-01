import { useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { tagService } from "@/services/tags/tagService";

interface Props {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ selectedTags, onChange }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch existing tags that match the input
  useEffect(() => {
    if (input.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const all = await tagService.getAllTags();
        const filtered = all
          .map((t) => t.name)
          .filter(
            (name) =>
              name.toLowerCase().includes(input.toLowerCase()) &&
              !selectedTags.includes(name)
          );
        setSuggestions(filtered.slice(0, 8));
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [input, selectedTags]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (!clean || selectedTags.includes(clean)) return;
    onChange([...selectedTags, clean]);
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        addTag(input.trim());
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Existing tags as chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: "var(--color-primary)",
                color: "#fff",
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
                aria-label={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => {
          if (input.trim()) setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Add tags…"
        className="input-field text-sm"
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button" // 👈 prevents form submission
              onMouseDown={(e) => e.preventDefault()} // extra safety
              onClick={() => addTag(tag)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors"
              style={{ color: "var(--color-text)" }}
            >
              <Plus size={14} style={{ color: "var(--color-text-muted)" }} />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}