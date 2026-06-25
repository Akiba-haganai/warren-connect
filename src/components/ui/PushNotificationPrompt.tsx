import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Bell } from "lucide-react";

export default function PushNotificationPrompt() {
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushSubscription();

  if (!isSupported || isLoading || isSubscribed) {
    return null;
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(var(--color-primary-rgb), 0.1)", borderBottom: "1px solid rgba(var(--color-primary-rgb), 0.2)" }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(var(--color-primary-rgb), 0.2)", color: "var(--color-primary)" }}>
          <Bell size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Enable Notifications</p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Get updates on messages and posts</p>
        </div>
      </div>
      <button 
        onClick={subscribe}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm"
        style={{ background: "var(--color-primary)", color: "var(--color-bg)" }}
      >
        Enable
      </button>
    </div>
  );
}
