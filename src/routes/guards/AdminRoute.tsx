import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Loader2 } from "lucide-react";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--color-bg)" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={24} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (!profile?.is_admin) return <Navigate to="/" />;

  return <>{children}</>;
}