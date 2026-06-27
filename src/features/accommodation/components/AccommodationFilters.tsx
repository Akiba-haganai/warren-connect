import { Search } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  locationFilter: string;
  onLocationChange: (val: string) => void;
  locations: string[];
  roommateFilter: boolean;
  onRoommateChange: (val: boolean) => void;
}

export default function AccommodationFilters({
  search,
  onSearchChange,
  locationFilter,
  onLocationChange,
  locations,
  roommateFilter,
  onRoommateChange,
}: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[140px]">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          className="input-field pl-9"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search accommodation listings"
        />
      </div>
      <select
        aria-label="Filter by location"
        className="input-field w-auto text-sm"
        style={{ width: 140 }}
        value={locationFilter}
        onChange={(e) => onLocationChange(e.target.value)}
      >
        <option value="">All locations</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
      <button
        onClick={() => onRoommateChange(!roommateFilter)}
        className={`input-field w-auto text-sm cursor-pointer ${roommateFilter ? "text-white" : ""}`}
        style={{
          background: roommateFilter ? "var(--color-primary)" : "var(--color-surface)",
          color: roommateFilter ? "#fff" : "var(--color-text-secondary)",
          borderColor: roommateFilter ? "var(--color-primary)" : "var(--color-border)",
        }}
        aria-pressed={roommateFilter}
      >
        🧑‍🤝‍🧑 Roommate
      </button>
    </div>
  );
}