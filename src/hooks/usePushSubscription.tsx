import { Bell, X } from "lucide-react";
import { useState, useEffect } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function PushNotificationPrompt() {
  const { subscribed, subscribe } = usePushSubscription();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!subscribed) {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [subscribed]);

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 card p-4 flex items-center gap-3">
      <Bell size={20} style={{ color: "var(--color-accent)" }} />
      <p className="text-sm flex-1" style={{ color: "var(--color-text)" }}>
        Get notified even when the app is closed!
      </p>
      <button onClick={subscribe} className="btn-primary w-auto px-4 py-2 text-xs">
        Enable
      </button>
      <button onClick={() => setShow(false)} className="p-1">
        <X size={16} style={{ color: "var(--color-text-muted)" }} />
      </button>
    </div>
  );
}