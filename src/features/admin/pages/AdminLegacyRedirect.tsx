// AdminLegacyRedirect.tsx
import { Navigate, useLocation } from "react-router-dom";

const LEGACY_TAB_MAP: Record<string, string> = {
  "/admin/overview": "overview",
  "/admin/users": "users",
  "/admin/content": "content",
  "/admin/verifications": "verifications",
  "/admin/reports": "reports",
  "/admin/tags": "tags",
  "/admin/password-resets": "resets",
};

export default function AdminLegacyRedirect() {
  const location = useLocation();
  const tab = LEGACY_TAB_MAP[location.pathname] || "overview";
  return <Navigate to={`/admin?tab=${tab}`} replace />;
}