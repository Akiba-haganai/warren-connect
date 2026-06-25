import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

function base64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendWebPush(subscription: any, payload: object) {
  const { endpoint, p256dh, auth } = subscription;
  const pushPayload = JSON.stringify(payload);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      // VAPID headers
      "Authorization": `vapid t=${vapidPublicKey}, k=${vapidPrivateKey}`,
    },
    body: pushPayload,
  });
  return response;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { userId, title, message, url } = await req.json();
  if (!userId || !title) return new Response("Missing fields", { status: 400 });

  // Get all push subscriptions for this user
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error || !subs?.length) return new Response("No subscriptions found", { status: 404 });

  // Send push to each subscription (usually one per device)
  const payload = {
    title,
    body: message || "",
    url: url || "/",
  };

  for (const sub of subs) {
    try {
      await sendWebPush({
        endpoint: sub.endpoint,
        p256dh: base64ToUint8Array(sub.p256dh),
        auth: base64ToUint8Array(sub.auth),
      }, payload);
    } catch (err) {
      // If subscription is invalid, delete it
      if (err.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});