import { Search, Users, Filter, X } from "lucide-react";

const COMMON_AMENITIES = [
  "WiFi", "Water included", "Electricity included", "Furnished",
  "Parking", "Security", "Study desk", "Private bathroom",
];

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  locationFilter?: string;
  onLocationChange?: (val: string) => void;
  locations?: string[];
  roommateFilter: boolean;
  onRoommateChange: (val: boolean) => void;
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
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative w-full">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
        />
        <input
          className="input-field pl-10 pr-4 py-2.5 rounded-full text-xs shadow-xs"
          placeholder="Search housing listings by title or keywords..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search accommodation listings"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Horizontal Scroll Pill Bar (Side-scrollable filters) */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1 flex-nowrap">
        {/* Roommate Toggle Pill */}
        <button
          type="button"
          onClick={() => onRoommateChange(!roommateFilter)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border ${
            roommateFilter
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-surface text-slate-700 dark:text-slate-200 border-border hover:border-slate-300"
          }`}
        >
          <Users size={13} className={roommateFilter ? "text-white" : "text-emerald-500"} />
          <span>Roommate</span>
        </button>

        {/* Gender Filter Pill */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-surface text-xs font-medium text-slate-700 dark:text-slate-200 border-border hover:border-slate-300">
            <Filter size={13} className="text-purple-500" />
            <select
              value={genderFilter}
              onChange={(e) => onGenderChange(e.target.value)}
              className="bg-transparent text-xs font-medium outline-none cursor-pointer pr-1"
              aria-label="Filter by gender"
            >
              <option value="">Any Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        {/* Price Inputs */}
        <div className="flex items-center gap-1 shrink-0 bg-surface border border-border px-2 py-1 rounded-full text-xs">
          <span className="text-[10px] text-slate-400 font-semibold px-1">K</span>
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            className="w-14 bg-transparent outline-none text-xs text-center"
          />
          <span className="text-slate-300">-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            className="w-14 bg-transparent outline-none text-xs text-center"
          />
        </div>
      </div>

      {/* Amenities horizontal chip scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5 flex-nowrap">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 pr-1">Amenities:</span>
        {COMMON_AMENITIES.map((amenity) => {
          const selected = selectedAmenities.includes(amenity);
          return (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all shrink-0 border ${
                selected
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs"
                  : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {amenity}
            </button>
          );
        })}
      </div>
    </div>
  );
}