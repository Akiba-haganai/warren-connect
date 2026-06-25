import { useState } from "react";
import { useAuthStore } from "@/store/auth/authStore";

export default function ReferralCodeCard() {
  const profile = useAuthStore((s) => s.profile);
  const [copied, setCopied] = useState(false);

  if (!profile?.referral_code) return null;

  return (
    <div className="mx-4 mt-3 card p-3 flex items-center justify-between">
      <div>
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Your referral code
        </p>
        <p
          className="text-lg font-mono font-bold tracking-wider"
          style={{ color: "var(--color-primary)" }}
        >
          {profile.referral_code}
        </p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(profile.referral_code!);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="btn-ghost text-xs px-3 py-1"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}