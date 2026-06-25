import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";

export default function GuestRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthStore();

  if (loading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}