import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 60 minutes ago
    const tables = ['posts', 'products', 'accommodations'];
    const sweptSummary: Record<string, number> = {};

    for (const table of tables) {
      // Find rows stuck in pending older than cutoff
      const { data: stuckRows } = await supabase
        .from(table)
        .select("id, image_url, user_id, seller_id, owner_id")
        .eq("moderation_status", "pending")
        .lt("created_at", cutoff);

      if (!stuckRows || stuckRows.length === 0) {
        sweptSummary[table] = 0;
        continue;
      }

      for (const row of stuckRows) {
        const ownerId = row.user_id || row.seller_id || row.owner_id;
        
        // Storage cleanup: find and remove file from pending-uploads
        const prefix = `${table}/${ownerId}/${row.id}/`;
        const { data: files } = await supabase.storage.from("pending-uploads").list(prefix);
        
        if (files && files.length > 0) {
          const paths = files.map((f) => `${prefix}${f.name}`);
          await supabase.storage.from("pending-uploads").remove(paths);
        }

        // Update row to rejected with explicit audit timeout reason
        await supabase
          .from(table)
          .update({
            moderation_status: "rejected",
            moderation_score: { reason: "moderation_timeout", message: "Image moderation timed out after 60 minutes" }
          })
          .eq("id", row.id);
      }

      sweptSummary[table] = stuckRows.length;
    }

    return new Response(JSON.stringify({ status: "success", swept: sweptSummary }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
