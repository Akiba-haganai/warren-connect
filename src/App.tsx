import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "@/routes";
import AuthProvider from "@/app/providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import UpdatePrompt from "@/components/layout/UpdatePrompt";
import RebrandBanner from "@/components/layout/RebrandBanner";
import DiagnosticOverlay from "./components/ui/DiagnosticOverlay";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  useEffect(() => {
    try { localStorage.removeItem("plawza-needs-recovery"); } catch (_) {}
  }, []);

  return (
    <ErrorBoundary
      onError={(error) => {
        if (import.meta.env.PROD) {
          console.error("Unhandled error:", error);
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--color-surface)",
                color: "var(--color-text)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-float)",
              },
            }}
          />
          <UpdatePrompt />
          <RebrandBanner />
          <DiagnosticOverlay />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}