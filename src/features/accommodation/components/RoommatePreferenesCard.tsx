import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function RoommatePreferencesCard() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [looking, setLooking] = useState(profile?.looking_for_roommate ?? false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [prefs, setPrefs] = useState({
    smoking: profile?.smoking_preference ?? "no-preference",
    drinking: profile?.drinking_preference ?? "no-preference",
    study: profile?.study_habit ?? "no-preference",
    goingOut: profile?.going_out_pattern ?? "no-preference",
    budgetMin: profile?.roommate_budget_min ? String(profile.roommate_budget_min) : "",
    budgetMax: profile?.roommate_budget_max ? String(profile.roommate_budget_max) : "",
    genderPref: profile?.roommate_gender_preference ?? "no-preference",
    freeText: profile?.roommate_preferences ?? "",
    privacy: profile?.privacy_needed ?? false,
  });

  useEffect(() => {
    if (profile) {
      setLooking(profile.looking_for_roommate ?? false);
      setPrefs({
        smoking: profile.smoking_preference ?? "no-preference",
        drinking: profile.drinking_preference ?? "no-preference",
        study: profile.study_habit ?? "no-preference",
        goingOut: profile.going_out_pattern ?? "no-preference",
        budgetMin: profile.roommate_budget_min ? String(profile.roommate_budget_min) : "",
        budgetMax: profile.roommate_budget_max ? String(profile.roommate_budget_max) : "",
        genderPref: profile.roommate_gender_preference ?? "no-preference",
        freeText: profile.roommate_preferences ?? "",
        privacy: profile.privacy_needed ?? false,
      });
    }
  }, [profile]);

  if (!user) return null;

  const handleToggleLooking = async () => {
    if (isUpdating) return;
    const newValue = !looking;
    setLooking(newValue);
    setIsUpdating(true);
    try {
      await profileService.updateProfile(user.id, { looking_for_roommate: newValue });
      await refreshProfile(user.id);
    } catch (e: any) {
      setLooking(!newValue); // rollback on error
      toast.error(e.message || "Failed to update roommate status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSave = async (field: string, value: any) => {
    if (isUpdating) return;
    const previous = { ...prefs };
    setPrefs((p) => ({ ...p, [field]: value }));
    setIsUpdating(true);
    try {
      await profileService.updateProfile(user.id, { [field]: value });
      await refreshProfile(user.id);
    } catch (e: any) {
      setPrefs(previous); // rollback
      toast.error(e.message || "Failed to update preference");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="card p-4 mx-4 mt-4 relative">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Looking for roommate
        </span>
        <button
          onClick={handleToggleLooking}
          disabled={isUpdating}
          className={`w-12 h-6 rounded-full transition-colors flex items-center justify-center ${looking ? "bg-green-500" : "bg-gray-300"} ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{ position: "relative" }}
          aria-pressed={looking}
          aria-label="Toggle looking for roommate"
        >
          {isUpdating ? (
            <Loader2 size={12} className="animate-spin text-white z-10" />
          ) : (
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              style={{ transform: looking ? "translateX(24px)" : "translateX(0)" }}
            />
          )}
        </button>
      </div>

      {looking && (
        <div className="mt-4 space-y-4">
          {/* Smoking */}
          <div>
            <label className="field-label">Smoking</label>
            <select
              value={prefs.smoking}
              onChange={(e) => handleSave("smoking_preference", e.target.value)}
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
              onChange={(e) => handleSave("drinking_preference", e.target.value)}
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
              onChange={(e) => handleSave("study_habit", e.target.value)}
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
              onChange={(e) => handleSave("going_out_pattern", e.target.value)}
              className="input-field text-sm"
            >
              <option value="no-preference">No preference</option>
              <option value="rarely">Rarely</option>
              <option value="weekends">Weekends</option>
              <option value="often">Often</option>
            </select>
          </div>

          {/* Budget range */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="field-label">Budget min (ZMW)</label>
              <input
                type="number"
                min="0"
                value={prefs.budgetMin}
                onChange={(e) => setPrefs((p) => ({ ...p, budgetMin: e.target.value }))}
                onBlur={() => handleSave("roommate_budget_min", prefs.budgetMin ? Number(prefs.budgetMin) : null)}
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
                onBlur={() => handleSave("roommate_budget_max", prefs.budgetMax ? Number(prefs.budgetMax) : null)}
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
              onChange={(e) => handleSave("roommate_gender_preference", e.target.value)}
              className="input-field text-sm"
            >
              <option value="no-preference">No preference</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* Privacy needed toggle */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                  Occasional privacy needed
                </label>
                <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  You may sometimes need the room to yourself
                </p>
              </div>
              <button
                onClick={() => handleSave("privacy_needed", !prefs.privacy)}
                className={`w-12 h-6 rounded-full transition-colors ${prefs.privacy ? "bg-green-500" : "bg-gray-300"}`}
                style={{ position: "relative" }}
                aria-pressed={prefs.privacy}
                aria-label="Toggle privacy needed"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                  style={{ transform: prefs.privacy ? "translateX(24px)" : "translateX(0)" }}
                />
              </button>
            </div>
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