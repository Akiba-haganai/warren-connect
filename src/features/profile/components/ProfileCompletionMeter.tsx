import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Check, Circle } from "lucide-react";

export default function ProfileCompletionMeter() {
  const navigate = useNavigate();                     // ✅ hook at the top
  const profile = useAuthStore((s) => s.profile);

  if (!profile) return null;                         // early return after hooks

  const items = [
    { label: "Full name", completed: !!profile.full_name },
    { label: "Username", completed: !!profile.username },
    { label: "Bio", completed: !!profile.bio },
    { label: "Profile picture", completed: !!profile.avatar_url },
    { label: "University", completed: !!profile.university },
    { label: "Course", completed: !!profile.course },
    { label: "Verified", completed: profile.is_verified },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const percentage = Math.round((completedCount / items.length) * 100);

  return (
    <div className="card p-4 mx-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          Profile completion
        </h3>
        <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
          {percentage}%
        </span>
      </div>

      <div className="w-full h-2 rounded-full mb-3" style={{ background: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background:
              percentage === 100
                ? "var(--color-success)"
                : percentage >= 50
                ? "var(--color-accent)"
                : "var(--color-warning)",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            {item.completed ? (
              <Check size={14} style={{ color: "var(--color-success)" }} />
            ) : (
              <Circle size={14} style={{ color: "var(--color-text-muted)" }} />
            )}
            <span
              style={{
                color: item.completed ? "var(--color-text)" : "var(--color-text-muted)",
                textDecoration: item.completed ? "none" : "line-through",
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {percentage < 100 && (
        <button onClick={() => navigate("/complete-profile")} className="btn-primary mt-3">
          Complete your profile
        </button>
      )}
    </div>
  );
}