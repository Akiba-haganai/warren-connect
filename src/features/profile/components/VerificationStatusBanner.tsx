import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { verificationService } from "@/services/verification/verificationService";
import { useAuthStore } from "@/store/auth/authStore";
import { Clock, CheckCircle, XCircle, Shield } from "lucide-react";

type Status = "pending" | "approved" | "rejected";

const statusConfig: Record<Status, {
  icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
  iconColor: string;
  bg: string;
  text: string;
  textColor: string;
}> = {
  pending: {
    icon: Clock,
    iconColor: "var(--color-primary)",
    bg: "var(--color-accent-light)",      // soft blue
    text: "Verification in progress…",
    textColor: "var(--color-primary)",
  },
  approved: {
    icon: CheckCircle,
    iconColor: "var(--color-success)",
    bg: "#D1FAE5",
    text: "Verification approved!",
    textColor: "#065F46",
  },
  rejected: {
    icon: XCircle,
    iconColor: "var(--color-danger)",
    bg: "#FEE2E2",
    text: "Verification rejected",
    textColor: "#991B1B",
  },
};

export default function VerificationStatusBanner() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [latestRequest, setLatestRequest] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    verificationService.getMyRequests(user.id).then((reqs) => {
      if (reqs.length > 0) {
        setLatestRequest(reqs[0]);
      }
      setLoading(false);
    });
  }, [user]);

  if (!user || loading) return null;
  if (profile?.is_verified) return null;

  if (!latestRequest) {
    return (
      <div className="mx-4 mt-4 card p-4 flex items-center gap-3"
           style={{ borderColor: "var(--color-accent-light)", borderWidth: 1 }}>
        <Shield size={20} style={{ color: "var(--color-primary)" }} />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Get Verified
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Build trust with students and landlords.
          </p>
        </div>
        <button
          onClick={() => navigate("/verification")}
          className="btn-primary w-auto px-4 py-2 text-xs"
        >
          Verify now
        </button>
      </div>
    );
  }

  const status = (latestRequest.status as Status) || "pending";
  const config = statusConfig[status] ?? statusConfig.pending;
  const Icon = config.icon;

  return (
    <div
      className="mx-4 mt-4 card p-4 flex items-center gap-3"
      style={{
        background: config.bg,
        border: "1px solid var(--color-border)",
      }}
    >
      <Icon size={20} style={{ color: config.iconColor }} />
      <p className="text-sm font-semibold" style={{ color: config.textColor }}>
        {config.text}
      </p>
    </div>
  );
}