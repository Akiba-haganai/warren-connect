import { Navigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Loader2 } from "lucide-react";

export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const [searchParams] = useSearchParams();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--color-bg)" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={24} />
      </div>
    );
  }

  if (user) {
    const redirect = searchParams.get("redirect") || "/feed";
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}