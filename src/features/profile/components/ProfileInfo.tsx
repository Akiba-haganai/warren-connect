import { BadgeCheck, GraduationCap, BookOpen, MapPin, Pencil } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";

interface Props {
  onEdit?: () => void;
}

export default function ProfileInfo({ onEdit }: Props) {
  const profile = useAuthStore((s) => s.profile);
  if (!profile) return null;

  return (
    <>
      {/* Name & username + Edit action */}
      <div className="mt-3 px-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {profile.full_name ?? "No name set"}
            </h1>
            {profile.is_verified && (
              <BadgeCheck
                size={18}
                style={{
                  color: "var(--color-accent)",
                  fill: "var(--color-accent)",
                }}
              />
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            @{profile.username ?? "no-username"}
          </p>
        </div>

        {onEdit && (
          <button
            onClick={onEdit}
            className="btn-primary text-xs px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <Pencil size={13} /> Edit Profile
          </button>
        )}
      </div>

      {/* Academic & Location info */}
      <div className="mt-3 px-4 flex flex-col gap-2">
        {profile.university && (
          <div
            className="flex items-center gap-2 text-xs font-semibold"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <GraduationCap size={15} className="text-primary shrink-0" />
            <span className="truncate">{profile.university}</span>
          </div>
        )}
        {profile.course && (
          <div
            className="flex items-center gap-2 text-xs font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <BookOpen size={15} className="text-primary shrink-0" />
            <span className="truncate">
              {profile.course}
              {profile.year_of_study ? ` · Year ${profile.year_of_study}` : ""}
            </span>
          </div>
        )}
        {(profile as any).location && (
          <div
            className="flex items-center gap-2 text-xs font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <MapPin size={15} className="text-emerald-500 shrink-0" />
            <span className="truncate">{(profile as any).location}</span>
          </div>
        )}
      </div>
    </>
  );
}