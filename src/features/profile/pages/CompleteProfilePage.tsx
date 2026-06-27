import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import { generateReferralCode } from "@/utils/referral";
import { User, AtSign, GraduationCap, BookOpen, Hash } from "lucide-react";

const STEPS = ["Personal", "Academic"];

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [full_name, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [year_of_study, setYear] = useState("1");   // string to avoid leading zeros

  // ---------- validations ----------
  const validateStep0 = (): boolean => {
    if (!full_name.trim() || full_name.trim().split(/\s+/).length < 2) {
      setError("Please enter your full name (first and last name).");
      return false;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3‑20 characters, lowercase letters, numbers, or underscores.");
      return false;
    }
    return true;
  };

  const validateStep1 = (): boolean => {
    if (!university.trim()) {
      setError("University is required.");
      return false;
    }
    if (!course.trim()) {
      setError("Course is required.");
      return false;
    }
    const yearNum = Number(year_of_study);
    if (!year_of_study || isNaN(yearNum) || yearNum < 1 || yearNum > 8) {
      setError("Year of study must be between 1 and 8.");
      return false;
    }
    return true;
  };

  // ---------- handlers ----------
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateStep0()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    if (!validateStep1()) return;

    setLoading(true);
    try {
      await profileService.updateProfile(user.id, {
        full_name: full_name.trim(),
        username: username.trim().toLowerCase().replace(/\s+/g, "_"),
        university: university.trim(),
        course: course.trim(),
        year_of_study: Number(year_of_study),
      });

      if (!profile?.referral_code) {
        await profileService.updateProfile(user.id, { referral_code: generateReferralCode() });
      }

      await refreshProfile(user.id);
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg.includes("unique") || msg.includes("duplicate") ? "That username is already taken. Try another." : msg);
      setStep(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col px-5 py-10" style={{ background: "var(--color-bg)" }}>
      {/* ... header and progress bar unchanged ... */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "var(--color-primary)" }}>
          <span className="text-xl font-bold text-white">W</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Set up your profile</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
      </div>
      <div className="w-full rounded-full mb-8 overflow-hidden" style={{ height: 4, background: "var(--color-border)" }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: "var(--color-accent)" }} />
      </div>

      <div className="card p-5 w-full max-w-sm mx-auto">
        {step === 0 && (
          <form onSubmit={handleNext} className="flex flex-col gap-4">
            <div>
              <label className="field-label">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  required
                  autoFocus
                  className="input-field"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="e.g., John Doe"
                  value={full_name}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Username</label>
              <div className="relative">
                <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  required
                  className="input-field"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="yourhandle"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  pattern="[a-z0-9_]{3,20}"
                  minLength={3}
                  maxLength={20}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>3‑20 characters, lowercase letters, numbers, underscores</p>
            </div>

            <button type="submit" className="btn-primary mt-2">Continue</button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="field-label">University</label>
              <div className="relative">
                <GraduationCap size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  required
                  className="input-field"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="e.g., Copperbelt University"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Course / Programme</label>
              <div className="relative">
                <BookOpen size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  required
                  className="input-field"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="e.g., Computer Science"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="field-label">Year of study</label>
              <div className="relative">
                <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  pattern="[1-8]"
                  className="input-field"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="1"
                  value={year_of_study}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 1); // only digits 1-8
                    setYear(val);
                  }}
                  aria-label="Year of study"
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>Between 1 and 8</p>
            </div>

            {error && (
              <p className="text-sm px-4 py-3 rounded-xl" style={{ background: "#FEF2F2", color: "var(--color-danger)", border: "1px solid #FECACA" }}>{error}</p>
            )}

            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setStep(0)} className="btn-ghost flex-1 border" style={{ borderColor: "var(--color-border)" }}>Back</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving…" : "Finish"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}