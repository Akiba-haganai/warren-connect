import { Search } from "lucide-react";
const COMMON_AMENITIES = [
  "WiFi", "Water included", "Electricity included", "Furnished",
  "Parking", "Security", "Study desk", "Private bathroom",
];
interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  locationFilter: string;
  onLocationChange: (val: string) => void;
  locations: string[];
  roommateFilter: boolean;
  onRoommateChange: (val: boolean) => void;
  // ----- NEW -----
  genderFilter: string;
  onGenderChange: (val: string) => void;
  priceMin: string;
  onPriceMinChange: (val: string) => void;
  priceMax: string;
  onPriceMaxChange: (val: string) => void;
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
}

export default function AccommodationFilters({
  search,
  onSearchChange,
  locationFilter,
  onLocationChange,
  locations,
  roommateFilter,
  onRoommateChange,
  genderFilter,
  onGenderChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
  selectedAmenities,
  onAmenitiesChange,
}: Props) {
  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      onAmenitiesChange(selectedAmenities.filter((a) => a !== amenity));
    } else {
      onAmenitiesChange([...selectedAmenities, amenity]);
    }
  };
  return (
    <>
    
      {/* Row 1 – Search, Location, Roommate toggle, Gender */}
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
          className={`input-field w-auto text-sm cursor-pointer ${
            roommateFilter ? "text-white" : ""
          }`}
          style={{
            background: roommateFilter ? "var(--color-primary)" : "var(--color-surface)",
            color: roommateFilter ? "#fff" : "var(--color-text-secondary)",
            borderColor: roommateFilter ? "var(--color-primary)" : "var(--color-border)",
          }}
          aria-pressed={roommateFilter}
        >
          🧑‍🤝‍🧑 Roommate
        </button>

        {/* Gender filter */}
        <select
          aria-label="Filter by gender"
          className="input-field w-auto text-sm"
          style={{ width: 120 }}
          value={genderFilter}
          onChange={(e) => onGenderChange(e.target.value)}
        >
          <option value="">Any gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {/* Row 2 – Price range */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Min rent (ZMW)"
          value={priceMin}
          onChange={(e) => onPriceMinChange(e.target.value)}
          className="input-field flex-1 text-xs"
        />
        <input
          type="number"
          placeholder="Max rent (ZMW)"
          value={priceMax}
          onChange={(e) => onPriceMaxChange(e.target.value)}
          className="input-field flex-1 text-xs"
        />
      </div>

      {/* Row 3 – Amenities (scrollable chips) */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
          Amenities
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedAmenities.includes(amenity)
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-text-secondary border-border"
              }`}
              style={{
                background: selectedAmenities.includes(amenity)
                  ? "var(--color-primary)"
                  : "var(--color-surface)",
                color: selectedAmenities.includes(amenity)
                  ? "#fff"
                  : "var(--color-text-secondary)",
                borderColor: selectedAmenities.includes(amenity)
                  ? "var(--color-primary)"
                  : "var(--color-border)",
              }}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}