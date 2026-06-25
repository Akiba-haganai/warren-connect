import { useState, useEffect } from "react";
import { Edit3, Check, X } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";

export default function ProfileBio() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBio(profile?.bio ?? "");
  }, [profile?.bio]);

  if (!user || !profile) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileService.updateProfile(user.id, { bio: bio.trim() });
      await refreshProfile(user.id);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          autoFocus
          rows={3}
          maxLength={200}
          className="input-field resize-none text-sm"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write something about yourself…"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(false);
              setBio(profile.bio ?? "");
            }}
            className="btn-ghost text-xs px-3 py-2 rounded-lg"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <X size={13} /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-1 text-xs px-4 py-2 rounded-lg"
            style={{ width: "auto" }}
          >
            <Check size={13} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left w-full group"
    >
      <p
        className="text-sm"
        style={{
          color: profile.bio ? "var(--color-text)" : "var(--color-text-muted)",
        }}
      >
        {profile.bio || "Add a bio…"}
      </p>
      <span
        className="inline-flex items-center gap-1 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <Edit3 size={11} /> Edit bio
      </span>
    </button>
  );
}