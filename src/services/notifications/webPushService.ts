import { supabase } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const webPushService = {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  },

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch {
      return null;
    }
  },

  async subscribe(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: "Web Push is not supported in this browser." };
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.warn("[WebPush] VITE_VAPID_PUBLIC_KEY is not set in environment. Available VITE env keys:", 
        Object.keys(import.meta.env).filter(k => k.startsWith("VITE_"))
      );
      return { 
        success: false, 
        error: "VAPID Public Key not configured. Ensure VITE_VAPID_PUBLIC_KEY is set in Vercel and a new deployment is triggered." 
      };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { success: false, error: "Notification permission was denied." };
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!subscription.endpoint || !p256dh || !auth) {
        return { success: false, error: "Failed to generate device push keys." };
      }

      // Upsert subscription into Supabase push_subscriptions table
      const { error: dbErr } = await (supabase.from as any)("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

      if (dbErr) {
        console.warn("Could not save push subscription to database:", dbErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error("Failed to subscribe to Web Push:", err);
      return { success: false, error: err.message || "Failed to subscribe to push notifications." };
    }
  },

  async unsubscribe(userId?: string): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        if (userId) {
          await (supabase.from as any)("push_subscriptions")
            .delete()
            .eq("endpoint", endpoint)
            .eq("user_id", userId);
        }
      }
      return true;
    } catch {
      return false;
    }
  },
};
