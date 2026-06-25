import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth/authStore";

export default function VerificationBanner() {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  if (!profile || profile.is_verified) return null;

  return (
    <div className="mx-4 mt-3">
      <button
        onClick={() => navigate("/verification")}
        className="w-full card p-4 flex items-center gap-3 text-left"
        style={{
          border: "1px solid var(--color-accent-light)",
          background: "linear-gradient(135deg, var(--color-accent-light), rgba(255,255,255,0))",
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-accent)" }}
        >
          <Shield size={16} style={{ color: "white" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Get Verified
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Build trust and unlock more features
          </p>
        </div>
        <ArrowRight size={16} style={{ color: "var(--color-text-muted)" }} />
      </button>
    </div>
  );
}