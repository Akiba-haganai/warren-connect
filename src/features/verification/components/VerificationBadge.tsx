import { ShieldCheck } from "lucide-react";

interface Props {
  isVerified: boolean;
  size?: number;
}

export default function VerificationBadge({ isVerified, size = 16 }: Props) {
  if (!isVerified) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-accent-light)", color: "#92400E" }}>
      <ShieldCheck size={size} style={{ color: "var(--color-accent)" }} />
      Verified
    </span>
  );
}