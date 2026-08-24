import { useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import Navbar from "@/components/navigation/Navbar";
import BottomNav from "@/components/navigation/BottomNav";
import InstallBanner from "@/components/ui/InstallBanner";
import OfflineBanner from "@/components/ui/OfflineBanner";
import OnboardingCarousel from "@/components/ui/OnBoardingCarousel";
import { useMarketplaceNotifications } from "@/hooks/useMarketplaceNotifications";

export default function MainLayout() {
  useMarketplaceNotifications();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <OfflineBanner />
      <Navbar />


      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />

        {/* Footer */}
        <div
          className="text-center text-xs py-6 px-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Link to="/terms" style={{ color: "inherit", textDecoration: "underline" }}>
            Terms of Service
          </Link>
          {" · "}
          <Link to="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>
            Privacy Policy
          </Link>
        </div>
      </div>

      <InstallBanner />
      <OnboardingCarousel />
      <BottomNav />
    </div>
  );
}

