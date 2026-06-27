import { useState, useEffect } from "react";
import { tagService } from "@/services/tags/tagService";
import { X } from "lucide-react";

interface Props {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ selectedTags, onChange, placeholder = "Add tags…" }: Props) {
  const [input, setInput] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    tagService.getAllTags().then((tags) => setAllTags(tags.map((t) => t.name)));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (value.trim()) {
      const filtered = allTags.filter(
        (t) => t.includes(value.toLowerCase()) && !selectedTags.includes(t)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const addTag = async (tagName: string) => {
    const normalized = tagName.trim().toLowerCase();
    if (!normalized || selectedTags.includes(normalized)) return;
    // Ensure tag exists in DB
    await tagService.createTag(normalized);
    onChange([...selectedTags, normalized]);
    setInput("");
    setSuggestions([]);
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: "var(--color-accent-light)", color: "var(--color-primary)" }}
          >
            {tag}
            <button onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          className="input-field text-xs"
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
        />
        {suggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 rounded-xl shadow-lg z-20"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            {suggestions.map((s) => (
              <button
                key={s}
                className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
                onClick={() => addTag(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}