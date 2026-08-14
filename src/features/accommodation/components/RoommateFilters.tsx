import { Cigarette, Wine, BookOpen, Moon, Users, GraduationCap, DollarSign } from "lucide-react";
import { ZAMBIA_UNIVERSITIES_COLLEGES } from "@/constants/locations";

interface Props {
  search?: string;
  onSearchChange?: (val: string) => void;
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
  universityFilter, onUniversityChange, universities,
  smokingFilter, onSmokingChange,
  drinkingFilter, onDrinkingChange,
  studyFilter, onStudyChange,
  goingOutFilter, onGoingOutChange,
  genderFilter, onGenderChange,
  budgetMin, onBudgetMinChange,
  budgetMax, onBudgetMaxChange,
}: Props) {
  const allUnisList = Array.from(new Set([...ZAMBIA_UNIVERSITIES_COLLEGES, ...universities]));

  return (
    <div className="space-y-4">
      {/* University Selector */}
      <div>
        <label className="field-label flex items-center gap-1.5 mb-1.5">
          <GraduationCap size={14} className="text-primary" /> University
        </label>
        <select
          className="glass-select text-xs w-full cursor-pointer"
          value={universityFilter}
          onChange={(e) => onUniversityChange(e.target.value)}
        >
          <option value="">All universities</option>
          {allUnisList.map((uni) => (
            <option key={uni} value={uni}>{uni}</option>
          ))}
        </select>
      </div>

      {/* Lifestyle Filter Tracks */}
      <div className="space-y-3">
        {/* Smoking */}
        <div>
          <label className="field-label flex items-center gap-1.5 mb-1.5">
            <Cigarette size={14} className="text-amber-500" /> Smoking Preference
          </label>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { id: "no-preference", label: "Any" },
              { id: "non-smoker", label: "Non-smoker" },
              { id: "smoker", label: "Smoker" },
              { id: "outside-only", label: "Outside only" },
            ].map((opt) => {
              const active = smokingFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSmokingChange(opt.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 border ${
                    active
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Drinking */}
        <div>
          <label className="field-label flex items-center gap-1.5 mb-1.5">
            <Wine size={14} className="text-purple-500" /> Drinking Preference
          </label>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { id: "no-preference", label: "Any" },
              { id: "non-drinker", label: "Non-drinker" },
              { id: "drinker", label: "Drinker" },
              { id: "socially", label: "Socially" },
            ].map((opt) => {
              const active = drinkingFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onDrinkingChange(opt.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 border ${
                    active
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Study Habits */}
        <div>
          <label className="field-label flex items-center gap-1.5 mb-1.5">
            <BookOpen size={14} className="text-blue-500" /> Study Atmosphere
          </label>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { id: "no-preference", label: "Any" },
              { id: "quiet", label: "Quiet study" },
              { id: "moderate", label: "Moderate" },
              { id: "loud", label: "Group study" },
            ].map((opt) => {
              const active = studyFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onStudyChange(opt.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 border ${
                    active
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Going Out */}
        <div>
          <label className="field-label flex items-center gap-1.5 mb-1.5">
            <Moon size={14} className="text-indigo-500" /> Going Out Habit
          </label>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { id: "no-preference", label: "Any" },
              { id: "rarely", label: "Homebody / Rarely" },
              { id: "weekends", label: "Weekends" },
              { id: "often", label: "Social butterfly" },
            ].map((opt) => {
              const active = goingOutFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onGoingOutChange(opt.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 border ${
                    active
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Gender Preference */}
        <div>
          <label className="field-label flex items-center gap-1.5 mb-1.5">
            <Users size={14} className="text-emerald-500" /> Gender Preference
          </label>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { id: "no-preference", label: "Any gender" },
              { id: "male", label: "Male" },
              { id: "female", label: "Female" },
              { id: "mixed", label: "Mixed" },
            ].map((opt) => {
              const active = genderFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onGenderChange(opt.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 border ${
                    active
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-surface text-slate-600 dark:text-slate-300 border-border hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Budget range */}
      <div>
        <label className="field-label flex items-center gap-1.5 mb-1.5">
          <DollarSign size={14} className="text-emerald-600" /> Monthly Budget (ZMW)
        </label>
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
      </div>
    </div>
  );
}