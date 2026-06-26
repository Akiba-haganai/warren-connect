import { Outlet, Link } from "react-router-dom";
import Navbar from "@/components/navigation/Navbar";
import BottomNav from "@/components/navigation/BottomNav";
import InstallBanner from "@/components/ui/InstallBanner";

export default function MainLayout() {
  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      <Navbar />

      {/* SCROLLABLE CONTENT AREA */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />

        {/* Footer – Terms & Privacy */}
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
      <BottomNav />
    </div>
  );
}