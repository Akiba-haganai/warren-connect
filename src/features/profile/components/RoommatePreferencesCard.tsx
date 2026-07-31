import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import toast from "react-hot-toast";

export default function RoommatePreferencesCard() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [looking, setLooking] = useState(profile?.looking_for_roommate ?? false);
  const [prefs, setPrefs] = useState({
    smoking:      profile?.smoking_preference          ?? "no-preference",
    drinking:     profile?.drinking_preference         ?? "no-preference",
    study:        profile?.study_habit                 ?? "no-preference",
    goingOut:     profile?.going_out_pattern           ?? "no-preference",
    budgetMin:    profile?.roommate_budget_min  ? String(profile.roommate_budget_min)  : "",
    budgetMax:    profile?.roommate_budget_max  ? String(profile.roommate_budget_max)  : "",
    genderPref:   profile?.roommate_gender_preference  ?? "no-preference",
    freeText:     profile?.roommate_preferences        ?? "",
    privacyNeeded: profile?.privacy_needed             ?? false,
  });

  // Sync state when profile updates (e.g. after refreshProfile resolves)
  useEffect(() => {
    if (profile) {
      setLooking(profile.looking_for_roommate ?? false);
      setPrefs({
        smoking:      profile.smoking_preference          ?? "no-preference",
        drinking:     profile.drinking_preference         ?? "no-preference",
        study:        profile.study_habit                 ?? "no-preference",
        goingOut:     profile.going_out_pattern           ?? "no-preference",
        budgetMin:    profile.roommate_budget_min  ? String(profile.roommate_budget_min)  : "",
        budgetMax:    profile.roommate_budget_max  ? String(profile.roommate_budget_max)  : "",
        genderPref:   profile.roommate_gender_preference  ?? "no-preference",
        freeText:     profile.roommate_preferences        ?? "",
        privacyNeeded: profile.privacy_needed             ?? false,
      });
    }
  }, [profile]);

  if (!user) return null;

  // ---- Toggle "looking" with optimistic update + rollback ----
  const handleToggleLooking = async () => {
    const newValue = !looking;
    setLooking(newValue);
    try {
      await profileService.updateProfile(user.id, { looking_for_roommate: newValue });
      refreshProfile(user.id);
      toast.success(
        newValue
          ? "You're now visible in the roommate finder 🎉"
          : "You're no longer looking for a roommate"
      );
    } catch {
      setLooking(!newValue); // rollback on failure
      toast.error("Couldn't update — please try again.");
    }
  };

  // ---- Save any single preference field ----
  const handleSave = async (field: string, value: any) => {
    try {
      await profileService.updateProfile(user.id, { [field]: value });
      refreshProfile(user.id);
    } catch {
      toast.error("Couldn't save — please try again.");
    }
  };

  // ---- Budget blur handler with min/max validation ----
  const handleBudgetBlur = (which: "min" | "max") => {
    const min = prefs.budgetMin ? Number(prefs.budgetMin) : null;
    const max = prefs.budgetMax ? Number(prefs.budgetMax) : null;
    if (min !== null && max !== null && min > max) {
      toast.error("Minimum budget can't be more than maximum.");
      return;
    }
    if (which === "min") handleSave("roommate_budget_min", min);
    else                 handleSave("roommate_budget_max", max);
  };

  return (
    <div className="card p-4">
      {/* ---- Section header ---- */}
      <h3
        className="text-sm font-semibold mb-3 flex items-center gap-1.5"
        style={{ color: "var(--color-text)" }}
      >
        🧑‍🤝‍🧑 Roommate preferences
      </h3>

      {/* ---- Looking for roommate toggle ---- */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold block" style={{ color: "var(--color-text)" }}>
            Looking for roommate
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {looking ? "You're visible to other students" : "Turn on to be discovered"}
          </span>
        </div>
        <button
          onClick={handleToggleLooking}
          className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${looking ? "bg-green-500" : "bg-gray-300"}`}
          style={{ position: "relative" }}
          aria-pressed={looking}
          aria-label="Toggle looking for roommate"
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
            style={{ transform: looking ? "translateX(24px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {/* ---- Preferences (only shown when looking = true) ---- */}
      {looking && (
        <div className="space-y-4">
          {/* Smoking */}
          <div>
            <label className="field-label">Smoking</label>
            <select
              value={prefs.smoking}
              onChange={(e) => {
                setPrefs((p) => ({ ...p, smoking: e.target.value }));
                handleSave("smoking_preference", e.target.value);
              }}
              className="input-field text-sm"
            >
              <option value="no-preference">No preference</option>
              <option value="non-smoker">Non‑smoker</option>
              <option value="smoker">Smoker</option>
              <option value="outside-only">Outside only</option>
            </select>
          </div>

          {/* Drinking */}
          <div>
            <label className="field-label">Drinking</label>
            <select
              value={prefs.drinking}
              onChange={(e) => {
                setPrefs((p) => ({ ...p, drinking: e.target.value }));
                handleSave("drinking_preference", e.target.value);
              }}
              className="input-field text-sm"
            >
              <option value="no-preference">No preference</option>
              <option value="non-drinker">Non‑drinker</option>
              <option value="drinker">Drinker</option>
              <option value="socially">Socially</option>
            </select>
          </div>

          {/* Study habits */}
          <div>
            <label className="field-label">Study habits</label>
            <select
              value={prefs.study}
              onChange={(e) => {
                setPrefs((p) => ({ ...p, study: e.target.value }));
                handleSave("study_habit", e.target.value);
              }}
              className="input-field text-sm"
            >
              <option value="no-preference">No preference</option>
              <option value="quiet">Quiet</option>
              <option value="moderate">Moderate</option>
              <option value="loud">Loud</option>
            </select>
          </div>

          {/* Going out */}
          <div>
            <label className="field-label">Going out</label>
            <select
              value={prefs.goingOut}
              onChange={(e) => {
                setPrefs((p) => ({ ...p, goingOut: e.target.value }));
                handleSave("going_out_pattern", e.target.value);
              }}
              className="input-field text-sm"
            >
              <option value="no-preference">No preference</option>
              <option value="rarely">Rarely</option>
              <option value="weekends">Weekends</option>
              <option value="often">Often</option>
            </select>
          </div>

          {/* Budget range with min > max validation on blur */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="field-label">Budget min (ZMW)</label>
              <input
                type="number"
                min="0"
                value={prefs.budgetMin}
                onChange={(e) => setPrefs((p) => ({ ...p, budgetMin: e.target.value }))}
                onBlur={() => handleBudgetBlur("min")}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <label className="field-label">Budget max (ZMW)</label>
              <input
                type="number"
                min="0"
                value={prefs.budgetMax}
                onChange={(e) => setPrefs((p) => ({ ...p, budgetMax: e.target.value }))}
                onBlur={() => handleBudgetBlur("max")}
                className="input-field"
                placeholder="0"
              />
            </div>
          </div>

          {/* Gender preference */}
          <div>
            <label className="field-label">Gender preference</label>
            <select
              value={prefs.genderPref}
              onChange={(e) => {
                setPrefs((p) => ({ ...p, genderPref: e.target.value }));
                handleSave("roommate_gender_preference", e.target.value);
              }}
              className="input-field text-sm"
            >
              <option value="no-preference">No preference</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* Privacy needed toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold block" style={{ color: "var(--color-text)" }}>
                Need occasional privacy
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                You may sometimes need the room to yourself
              </span>
            </div>
            <button
              onClick={() => {
                const next = !prefs.privacyNeeded;
                setPrefs((p) => ({ ...p, privacyNeeded: next }));
                handleSave("privacy_needed", next);
              }}
              className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${prefs.privacyNeeded ? "bg-green-500" : "bg-gray-300"}`}
              style={{ position: "relative" }}
              aria-pressed={prefs.privacyNeeded}
              aria-label="Toggle privacy needed"
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                style={{ transform: prefs.privacyNeeded ? "translateX(24px)" : "translateX(0)" }}
              />
            </button>
          </div>

          {/* Free text */}
          <div>
            <label className="field-label">Additional preferences</label>
            <textarea
              rows={2}
              className="input-field resize-none text-sm"
              placeholder="e.g., quiet after 10pm, no overnight guests"
              value={prefs.freeText}
              onChange={(e) => setPrefs((p) => ({ ...p, freeText: e.target.value }))}
              onBlur={() => handleSave("roommate_preferences", prefs.freeText.trim())}
            />
          </div>
        </div>
      )}
    </div>
  );
}