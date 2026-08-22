import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  // Only unmount tree with fullscreen loader on INITIAL load when there is NO user yet
  if (loading && !user) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--color-bg)" }}>
        <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={24} />
      </div>
    );
  }

  if (!user && !loading) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}