import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const NSFW_BLOCK_THRESHOLD = 0.7;
const NSFW_FLAG_THRESHOLD = 0.3;

serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record;

    if (!record || !record.name) {
      return new Response(JSON.stringify({ error: "Missing record info" }), { status: 400 });
    }

    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error("Unauthorized webhook call attempted");
      return new Response("Unauthorized", { status: 401 });
    }

    if (record.bucket_id !== 'pending-uploads') {
      return new Response("Ignored: not pending-uploads bucket", { status: 200 });
    }

    // Path format: pending-uploads/{table}/{ownerId}/{rowId}/{filename}
    // E.g., record.name = posts/uuid/uuid/filename.jpg
    const parts = record.name.split('/');
    if (parts.length < 4) {
       console.log("Ignoring non-standard path:", record.name);
       return new Response("Ignored", { status: 200 });
    }

    const table = parts[0];
    const ownerId = parts[1];
    const rowId = parts[2];
    const filename = parts.slice(3).join('/');

    if (table !== 'posts' && table !== 'products') {
        console.log("Ignoring unhandled table:", table);
        return new Response("Ignored", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Belt-and-suspenders Ownership Verification
    const { data: row, error: rowError } = await supabase
      .from(table)
      .select(table === 'posts' ? 'user_id' : 'seller_id')
      .eq("id", rowId)
      .single();

    if (rowError || !row) {
        return new Response(JSON.stringify({ error: "Row not found" }), { status: 404 });
    }

    const actualOwnerId = table === 'posts' ? row.user_id : row.seller_id;
    if (actualOwnerId !== ownerId) {
        return new Response("Ownership mismatch", { status: 403 });
    }

    // 2. Fetch signed URL
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from("pending-uploads")
      .createSignedUrl(record.name, 300);

    if (signError || !signedUrlData) {
        return new Response(JSON.stringify({ error: "Failed to sign URL" }), { status: 500 });
    }

    // 3. Sightengine Moderation
    const apiUser = Deno.env.get("SIGHTENGINE_USER");
    const apiSecret = Deno.env.get("SIGHTENGINE_SECRET");
    
    if (!apiUser || !apiSecret) {
        console.error("Missing Sightengine credentials");
        return new Response("Missing credentials", { status: 500 });
    }

    const sightengineRes = await fetch(
      `https://api.sightengine.com/1.0/check.json?url=${encodeURIComponent(
        signedUrlData.signedUrl
      )}&models=nudity-2.1,offensive&api_user=${apiUser}&api_secret=${apiSecret}`
    );
    const result = await sightengineRes.json();
    
    // Nudity and offensive scores
    const nsfwScore = Math.max(
        result.nudity?.sexual_activity ?? 0,
        result.nudity?.sexual_display ?? 0,
        result.nudity?.erotica ?? 0,
        result.offensive?.prob ?? 0
    );

    // 4. Handle Moderation Result
    if (nsfwScore >= NSFW_BLOCK_THRESHOLD) {
      await supabase.storage.from("pending-uploads").remove([record.name]);
      await supabase.from(table)
        .update({ moderation_status: "rejected", moderation_score: result })
        .eq("id", rowId);
      return new Response(JSON.stringify({ status: "rejected" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Passed (clean or borderline) — promote to public bucket
    const { data: fileData, error: downloadError } = await supabase.storage.from("pending-uploads").download(record.name);
    if (downloadError || !fileData) {
        return new Response(JSON.stringify({ error: "Failed to download for promotion" }), { status: 500 });
    }

    const publicPath = `${ownerId}/${rowId}/${filename}`;
    await supabase.storage.from("public-images").upload(publicPath, fileData, {
      contentType: record.metadata?.mimetype || 'image/jpeg',
      upsert: true
    });
    
    // Remove from pending
    await supabase.storage.from("pending-uploads").remove([record.name]);

    const publicUrl = supabase.storage.from("public-images").getPublicUrl(publicPath).data.publicUrl;
    
    await supabase.from(table)
      .update({ moderation_status: "approved", moderation_score: result, image_url: publicUrl })
      .eq("id", rowId);

    // 5. Borderline -> Auto-Flag
    if (nsfwScore >= NSFW_FLAG_THRESHOLD) {
      await supabase.from("reports").insert({
        reporter_id: ownerId, 
        content_type: table === "posts" ? "post" : "product",
        content_id: rowId, 
        content_owner_id: ownerId,
        reason: "nsfw_content", 
        reason_detail: "Auto-flagged by image moderation (borderline score)",
        is_system_generated: true,
      });
    }

    return new Response(JSON.stringify({ status: "approved" }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
