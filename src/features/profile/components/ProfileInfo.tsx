import { BadgeCheck, GraduationCap, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";

export default function ProfileInfo() {
  const profile = useAuthStore((s) => s.profile);
  if (!profile) return null;

  return (
    <>
      {/* Name & username */}
      <div className="mt-3 px-4">
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
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          @{profile.username ?? "no-username"}
        </p>
      </div>

      {/* Academic info */}
      <div className="mt-3 px-4 flex flex-col gap-2">
        {profile.university && (
          <div
            className="flex items-center gap-2.5 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <GraduationCap size={15} />
            <span>{profile.university}</span>
          </div>
        )}
        {profile.course && (
          <div
            className="flex items-center gap-2.5 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <BookOpen size={15} />
            <span>
              {profile.course}
              {profile.year_of_study ? ` · Year ${profile.year_of_study}` : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}