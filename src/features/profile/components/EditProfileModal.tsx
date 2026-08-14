import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import { locationService } from "@/services/locations/locationService";
import { ZAMBIA_UNIVERSITIES_COLLEGES, ZAMBIA_LOCATIONS } from "@/constants/locations";
import { X, Loader2, User, GraduationCap, MapPin, BookOpen, Phone, FileText, ChevronDown, Check, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [phone, setPhone] = useState((profile as any)?.phone || "");
  const [university, setUniversity] = useState(profile?.university || "");
  const [location, setLocation] = useState((profile as any)?.location || "");
  const [availableLocations, setAvailableLocations] = useState<string[]>(Array.from(ZAMBIA_LOCATIONS));
  const [course, setCourse] = useState(profile?.course || "");
  const [yearOfStudy, setYearOfStudy] = useState<number | "">(profile?.year_of_study || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [saving, setSaving] = useState(false);

  // Mobile-first PWA Touch Scroll Picker States
  const [showUniPicker, setShowUniPicker] = useState(false);
  const [uniSearch, setUniSearch] = useState("");
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [locSearch, setLocSearch] = useState("");

  useEffect(() => {
    locationService.getLocations().then((locs) => setAvailableLocations(locs));
  }, []);

  const filteredUniversities = ZAMBIA_UNIVERSITIES_COLLEGES.filter((u) =>
    u.toLowerCase().includes(uniSearch.toLowerCase())
  );

  const filteredLocations = availableLocations.filter((l) =>
    l.toLowerCase().includes(locSearch.toLowerCase())
  );

  if (!isOpen || !user || !profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileService.updateProfile(user.id, {
        full_name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim() || null,
        university: university || null,
        location: location || null,
        course: course.trim() || null,
        year_of_study: yearOfStudy ? Number(yearOfStudy) : null,
        bio: bio.trim() || null,
      } as any);

      await refreshProfile(user.id);
      toast.success("Profile updated successfully! ✨");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Profile Details</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Keep your academic & personal details up to date</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User size={13} className="text-primary" /> Full Name
              </label>
              <input
                type="text"
                required
                className="input-field text-xs"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Chileshe Mwamba"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User size={13} className="text-primary" /> Username
              </label>
              <input
                type="text"
                required
                className="input-field text-xs"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                placeholder="e.g. chileshe_m"
              />
            </div>
          </div>

          {/* Mobile-First PWA Institution Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><GraduationCap size={14} className="text-primary" /> Institution / University</span>
              {university && (
                <button type="button" onClick={() => setUniversity("")} className="text-[10px] text-red-500 hover:underline">Clear</button>
              )}
            </label>
            
            <button
              type="button"
              onClick={() => setShowUniPicker(!showUniPicker)}
              className="input-field text-xs cursor-pointer flex items-center justify-between text-left w-full bg-surface"
            >
              <span className={university ? "font-bold text-slate-900 dark:text-white" : "text-slate-400"}>
                {university || "Select University or College..."}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUniPicker ? "rotate-180" : ""}`} />
            </button>

            {showUniPicker && (
              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl space-y-2 shadow-inner">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    className="input-field text-xs pl-9 py-1.5 bg-surface"
                    placeholder="Search institution name..."
                    value={uniSearch}
                    onChange={(e) => setUniSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-surface" style={{ WebkitOverflowScrolling: "touch" }}>
                  {filteredUniversities.length === 0 ? (
                    <p className="text-xs p-3 text-center text-slate-400">No matching institutions found</p>
                  ) : (
                    filteredUniversities.map((uni) => {
                      const isSelected = university === uni;
                      return (
                        <button
                          key={uni}
                          type="button"
                          onClick={() => { setUniversity(uni); setShowUniPicker(false); }}
                          className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-primary text-white font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <span className="truncate">{uni}</span>
                          {isSelected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile-First PWA Location Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" /> Preferred Residential Area / Campus Hub</span>
              {location && (
                <button type="button" onClick={() => setLocation("")} className="text-[10px] text-red-500 hover:underline">Clear</button>
              )}
            </label>

            <button
              type="button"
              onClick={() => setShowLocPicker(!showLocPicker)}
              className="input-field text-xs cursor-pointer flex items-center justify-between text-left w-full bg-surface"
            >
              <span className={location ? "font-bold text-slate-900 dark:text-white" : "text-slate-400"}>
                {location || "Select Location / Campus Area..."}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showLocPicker ? "rotate-180" : ""}`} />
            </button>

            {showLocPicker && (
              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 border border-border rounded-2xl space-y-2 shadow-inner">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    className="input-field text-xs pl-9 py-1.5 bg-surface"
                    placeholder="Search residential location..."
                    value={locSearch}
                    onChange={(e) => setLocSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-surface" style={{ WebkitOverflowScrolling: "touch" }}>
                  {filteredLocations.length === 0 ? (
                    <p className="text-xs p-3 text-center text-slate-400">No matching locations found</p>
                  ) : (
                    filteredLocations.map((loc) => {
                      const isSelected = location === loc;
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => { setLocation(loc); setShowLocPicker(false); }}
                          className={`w-full text-left text-xs px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-primary text-white font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          <span className="truncate">{loc}</span>
                          {isSelected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Course of Study & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <BookOpen size={13} className="text-primary" /> Program / Course of Study
              </label>
              <input
                type="text"
                className="input-field text-xs"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. BSc Computer Science"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Year of Study
              </label>
              <select
                className="input-field text-xs cursor-pointer"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Year...</option>
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
                <option value={5}>Year 5+</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Phone size={13} className="text-primary" /> Phone Number (Optional)
            </label>
            <input
              type="tel"
              className="input-field text-xs"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +260 971 234 567"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-primary" /> Personal Bio
            </label>
            <textarea
              rows={3}
              className="input-field text-xs resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell potential roommates and campus friends a bit about yourself..."
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs px-5 py-2 rounded-full font-bold shadow-sm flex items-center gap-1.5"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
