import { useAuthStore } from "@/store/auth/authStore";

export function useProfileCompletion() {
  const profile = useAuthStore((s) => s.profile);
  if (!profile) return 0;

  const fields: { key: keyof typeof profile; weight: number }[] = [
    { key: "full_name", weight: 10 },
    { key: "avatar_url", weight: 15 },
    { key: "bio", weight: 10 },
    { key: "university", weight: 10 },
    { key: "course", weight: 10 },
    { key: "year_of_study", weight: 5 },
    { key: "username", weight: 10 },
    // additional fields can be added
  ];

  let completed = 0;
  let total = 0;
  fields.forEach(({ key, weight }) => {
    total += weight;
    if (profile[key] !== null && profile[key] !== "" && profile[key] !== undefined) {
      completed += weight;
    }
  });

  return total === 0 ? 0 : Math.round((completed / total) * 100);
}