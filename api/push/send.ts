import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(request: Request) {
  // --- Auth: verify caller's JWT before doing anything ---
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Use anon key to verify the user's JWT — never expose service role to callers
  const supabaseVerify = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabaseVerify.auth.getUser(token);
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ---

  const { userId, title, body, url } = (await request.json()) as {
    userId?: string;
    title?: string;
    body?: string;
    url?: string;
  };
  if (!userId || !title) return new Response("Missing fields", { status: 400 });

  // Service role only used server-side, env var has no VITE_ prefix
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
          to: sub.endpoint,
          ...JSON.parse(payload),
        }),
      })
    )
  );

  return new Response(JSON.stringify(results), { status: 200 });
}
