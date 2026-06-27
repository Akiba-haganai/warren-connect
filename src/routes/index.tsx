// src/routes/index.tsx

import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";

import AuthLayout from "@/layouts/auth/AuthLayout";
import MainLayout from "@/layouts/main/MainLayout";
import AdminLayout from "@/layouts/admin/AdminLayout";

import ProtectedRoute from "@/routes/guards/ProtectedRoute";
import GuestRoute from "@/routes/guards/GuestRoute";
import AdminRoute from "@/routes/guards/AdminRoute";

import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Loader2 } from "lucide-react";

// ---------- LAZY PAGES ----------
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));

const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const CompleteProfilePage = lazy(() => import("@/features/profile/pages/CompleteProfilePage"));
const PublicProfilePage = lazy(() => import("@/features/profile/pages/PublicProfilePage"));

const HomeFeedPage = lazy(() => import("@/features/feed/pages/HomeFeedPage"));
const MarketplacePage = lazy(() => import("@/features/marketplace/pages/MarketplacePage"));
const ProductDetailPage = lazy(() => import("@/features/marketplace/pages/ProductDetailPage"));
const AccommodationPage = lazy(() => import("@/features/accommodation/pages/AccommodationPage"));
const AccommodationDetailPage = lazy(() => import("@/features/accommodation/pages/AccomodationDetailPage"));
const RoommateFinderPage = lazy(() => import("@/features/accommodation/pages/RoommateFinderPage"));
const MessagesPage = lazy(() => import("@/features/messages/pages/MessagesPage"));
const NotificationsPage = lazy(() => import("@/features/notifications/pages/NotificationsPage"));
const PostDetailPage = lazy(() => import("@/features/feed/pages/PostDetailPage"));

const VerificationRequestPage = lazy(() => import("@/features/verification/pages/VerificationRequestPage"));

const SavedItemsPage = lazy(() => import("@/features/saved/SavedItemsPage"));

const ShopPage = lazy(() => import("@/features/marketplace/pages/ShopPage"));

const AdminDashboardPage = lazy(() => import("@/features/admin/pages/AdminDashboardPage"));

// Legal pages (unprotected)
const TermsPage = lazy(() => import("@/features/legal/TermsPage"));
const PrivacyPage = lazy(() => import("@/features/legal/PrivacyPage"));

// Landing page (public)
const LandingPage = lazy(() => import("@/features/landing/LandingPage"));

// Tag page
const TagPage = lazy(() => import("@/features/tags/TagPage"));

// ---------- FALLBACK ----------
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="animate-spin" style={{ color: "var(--color-text-muted)" }} size={24} />
  </div>
);

// ---------- WRAPPER ----------
const withBoundary = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

// ---------- ROUTER ----------
export const router = createBrowserRouter([
  // =========================
  // PUBLIC LANDING PAGE
  // =========================
  {
    path: "/",
    element: (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },

  // =========================
  // AUTH ROUTES
  // =========================
  {
    element: (
      <GuestRoute>
        <AuthLayout />
      </GuestRoute>
    ),
    children: [
      { path: "/login", element: withBoundary(LoginPage) },
      { path: "/register", element: withBoundary(RegisterPage) },
      { path: "/forgot-password", element: withBoundary(ForgotPasswordPage) },
    ],
  },

  // =========================
  // MAIN APP ROUTES (protected)
  // =========================
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/feed", element: withBoundary(HomeFeedPage) },
      { path: "/user/:id", element: withBoundary(PublicProfilePage) },
      { path: "/profile", element: withBoundary(ProfilePage) },
      { path: "/complete-profile", element: withBoundary(CompleteProfilePage) },
      { path: "/marketplace/:id", element: withBoundary(ProductDetailPage) },
      { path: "/marketplace", element: withBoundary(MarketplacePage) },
      { path: "/accommodation/:id", element: withBoundary(AccommodationDetailPage) },
      { path: "/accommodation", element: withBoundary(AccommodationPage) },
      { path: "/roommates", element: withBoundary(RoommateFinderPage) },
      { path: "/messages", element: withBoundary(MessagesPage) },
      { path: "/notifications", element: withBoundary(NotificationsPage) },
      { path: "/verification", element: withBoundary(VerificationRequestPage) },
      { path: "/saved", element: withBoundary(SavedItemsPage) },
      { path: "/shop/:id", element: withBoundary(ShopPage) },
      { path: "/post/:id", element: withBoundary(PostDetailPage) },
      { path: "/tag/:tagName", element: withBoundary(TagPage) },
    ],
  },

  // =========================
  // PUBLIC LEGAL ROUTES
  // =========================
  {
    path: "/terms",
    element: (
      <Suspense fallback={<PageLoader />}>
        <TermsPage />
      </Suspense>
    ),
  },
  {
    path: "/privacy",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PrivacyPage />
      </Suspense>
    ),
  },

  // =========================
  // ADMIN ROUTES
  // =========================
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: withBoundary(AdminDashboardPage) },
    ],
  },
]);