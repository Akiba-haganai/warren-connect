import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth/authStore";

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  if (!user) return <Navigate to="/login" />;

  if (!profile?.is_admin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}