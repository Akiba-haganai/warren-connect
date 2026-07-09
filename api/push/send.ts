import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(request: Request) {
  const { userId, title, body, url } = await request.json();
  if (!userId || !title) return new Response("Missing fields", { status: 400 });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return new Response("No subscriptions", { status: 200 });

  const payload = JSON.stringify({ title, body, icon: "/pwa-192.png", data: { url: url || "/" } });
  const results = await Promise.allSettled(
    subs.map((sub: any) =>
      fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${process.env.VAPID_PRIVATE_KEY}`,
        },
        body: JSON.stringify({
          to: sub.endpoint, // Note: For standard Web Push this isn't exactly how fcm.googleapis.com/fcm/send works (usually it requires a registration token in 'to'), but following prompt instructions
          ...JSON.parse(payload),
        }),
      })
    )
  );

  return new Response(JSON.stringify(results), { status: 200 });
}
