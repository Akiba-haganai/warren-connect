import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function GET() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  const { error } = await supabase.rpc("recalculate_trending_scores");
  if (error) return new Response(error.message, { status: 500 });
  return new Response("OK", { status: 200 });
}
