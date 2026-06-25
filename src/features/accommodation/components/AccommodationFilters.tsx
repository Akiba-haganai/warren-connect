import { Search } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  locationFilter: string;
  onLocationChange: (val: string) => void;
  locations: string[];
}

export default function AccommodationFilters({
  search,
  onSearchChange,
  locationFilter,
  onLocationChange,
  locations,
}: Props) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-muted)" }}
        />
        <input
          className="input-field"
          style={{ paddingLeft: "2.5rem" }}
          placeholder="Search listings..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <select
      aria-label="filter"
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
    </div>
  );
}