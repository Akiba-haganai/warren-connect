import { Outlet } from "react-router-dom";
import Navbar from "@/components/navigation/Navbar";
import BottomNav from "@/components/navigation/BottomNav";
import InstallBanner from "@/components/ui/InstallBanner";
import PushNotificationPrompt from "@/components/ui/PushNotificationPrompt";

export default function MainLayout() {
  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      {/* ===== TOP NAVBAR ===== */}
      <Navbar />

      {/* ===== SCROLLABLE CONTENT AREA ===== */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />
      </div>

      {/* ===== PROMPTS ===== */}
      <PushNotificationPrompt />
      <InstallBanner />

      {/* ===== BOTTOM NAVIGATION ===== */}
      <BottomNav />
    </div>
  );
}