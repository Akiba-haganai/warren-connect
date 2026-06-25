import { useRef } from "react";
import { Camera } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";
import { profileService } from "@/services/profiles/profileService";
import { compressImage } from "@/utils/compressImage";

interface Props {
  uploading: "avatar" | "cover" | null;
  setUploading: (val: "avatar" | "cover" | null) => void;
}

export default function ProfileHeader({ uploading, setUploading }: Props) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  if (!user || !profile) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("avatar");
    try {
      const compressed = await compressImage(file);
      await profileService.uploadAvatar(user.id, compressed);
      await refreshProfile(user.id);
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("cover");
    try {
      const compressed = await compressImage(file);
      await profileService.uploadCover(user.id, compressed);
      await refreshProfile(user.id);
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  return (
    <div className="relative" style={{ height: 180 }}>
      {profile.cover_photo_url ? (
        <img src={profile.cover_photo_url} alt="Cover" className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full"
          style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)" }}
        />
      )}

      <button
        onClick={() => coverRef.current?.click()}
        disabled={uploading !== null}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(6px)" }}
        aria-label="Change cover photo"
      >
        {uploading === "cover" ? "Uploading…" : <><Camera size={12} /> Edit cover</>}
      </button>
      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} aria-label="Upload cover photo" />

      <div className="flex items-end justify-between px-4" style={{ marginTop: -44 }}>
        <div className="relative">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name ?? "Avatar"} className="avatar" style={{ width: 88, height: 88 }} />
          ) : (
            <div
              className="rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ width: 88, height: 88, background: "var(--color-primary)" }}
            >
              {(profile.full_name?.[0] ?? profile.email?.[0] ?? "?").toUpperCase()}
            </div>
          )}

          <button
            onClick={() => avatarRef.current?.click()}
            disabled={uploading !== null}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-accent)", border: "2px solid var(--color-surface)", color: "var(--color-primary)" }}
            aria-label="Change profile photo"
          >
            {uploading === "avatar" ? <span className="text-[9px] font-bold">…</span> : <Camera size={12} strokeWidth={2.5} />}
          </button>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} aria-label="Upload profile photo" />
        </div>
      </div>
    </div>
  );
}