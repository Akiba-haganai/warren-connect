import { ShieldCheck } from "lucide-react";

const TIER_CONFIG = {
  none: null,
  phone: { label: "Phone Verified", color: "var(--color-text-muted)" },
  id: { label: "ID Verified", color: "var(--color-primary)" },
  business: { label: "Verified Business", color: "var(--color-accent)" },
} as const;

export function VerificationBadge({
  tier,
  size = 16,
}: {
  tier: string | null | undefined;
  size?: number;
}) {
  const cfg = (tier ? TIER_CONFIG[tier as keyof typeof TIER_CONFIG] : null) ?? null;
  if (!cfg) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}20`, color: cfg.color }}
    >
      <ShieldCheck size={size} style={{ color: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// Backward compatibility with existing imports expecting `isVerified`
export default function BackCompatVerificationBadge({ isVerified, size = 16 }: { isVerified: boolean; size?: number }) {
  if (!isVerified) return null;
  return <VerificationBadge tier="id" size={size} />;
}

