import { Search } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  universityFilter: string;
  onUniversityChange: (val: string) => void;
  universities: string[];
  smokingFilter: string;
  onSmokingChange: (val: string) => void;
  drinkingFilter: string;
  onDrinkingChange: (val: string) => void;
  studyFilter: string;
  onStudyChange: (val: string) => void;
  goingOutFilter: string;
  onGoingOutChange: (val: string) => void;
  genderFilter: string;
  onGenderChange: (val: string) => void;
  budgetMin: string;
  onBudgetMinChange: (val: string) => void;
  budgetMax: string;
  onBudgetMaxChange: (val: string) => void;
}

export default function RoommateFilters({
  search, onSearchChange,
  universityFilter, onUniversityChange, universities,
  smokingFilter, onSmokingChange,
  drinkingFilter, onDrinkingChange,
  studyFilter, onStudyChange,
  goingOutFilter, onGoingOutChange,
  genderFilter, onGenderChange,
  budgetMin, onBudgetMinChange,
  budgetMax, onBudgetMaxChange,
}: Props) {
  return (
    <>
      {/* Search & University */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
          <input
            className="input-field pl-9"
            placeholder="Search by name, course…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto text-sm"
          style={{ width: 140 }}
          value={universityFilter}
          onChange={(e) => onUniversityChange(e.target.value)}
        >
          <option value="">All universities</option>
          {universities.map((uni) => (
            <option key={uni} value={uni}>{uni}</option>
          ))}
        </select>
      </div>

      {/* Quick lifestyle filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <select value={smokingFilter} onChange={(e) => onSmokingChange(e.target.value)} className="input-field w-auto text-xs">
          <option value="no-preference">🚬 Any</option>
          <option value="non-smoker">Non‑smoker</option>
          <option value="smoker">Smoker</option>
          <option value="outside-only">Outside only</option>
        </select>
        <select value={drinkingFilter} onChange={(e) => onDrinkingChange(e.target.value)} className="input-field w-auto text-xs">
          <option value="no-preference">🍺 Any</option>
          <option value="non-drinker">Non‑drinker</option>
          <option value="drinker">Drinker</option>
          <option value="socially">Socially</option>
        </select>
        <select value={studyFilter} onChange={(e) => onStudyChange(e.target.value)} className="input-field w-auto text-xs">
          <option value="no-preference">📚 Any</option>
          <option value="quiet">Quiet</option>
          <option value="moderate">Moderate</option>
          <option value="loud">Loud</option>
        </select>
        <select value={goingOutFilter} onChange={(e) => onGoingOutChange(e.target.value)} className="input-field w-auto text-xs">
          <option value="no-preference">🌙 Any</option>
          <option value="rarely">Rarely</option>
          <option value="weekends">Weekends</option>
          <option value="often">Often</option>
        </select>
        <select value={genderFilter} onChange={(e) => onGenderChange(e.target.value)} className="input-field w-auto text-xs">
          <option value="no-preference">⚤ Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {/* Budget range */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Min budget"
          value={budgetMin}
          onChange={(e) => onBudgetMinChange(e.target.value)}
          className="input-field flex-1 text-xs"
        />
        <input
          type="number"
          placeholder="Max budget"
          value={budgetMax}
          onChange={(e) => onBudgetMaxChange(e.target.value)}
          className="input-field flex-1 text-xs"
        />
      </div>
    </>
  );
}