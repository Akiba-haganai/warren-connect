import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Auth Header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id, action } = await req.json();
    if (!request_id || !["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid parameters. Required: request_id, action ('approve'|'reject')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://warren-connect.vercel.app";

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 1. Check Caller Identity & Admin Rights
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAuth
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin privileges required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Service Role Client for Privileged Auth Reset Link Generation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch recovery request row
    const { data: reqRow, error: fetchErr } = await supabaseAdmin
      .from("password_recovery_requests")
      .select("id, email, status")
      .eq("id", request_id)
      .single();

    if (fetchErr || !reqRow) {
      return new Response(JSON.stringify({ error: "Recovery request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      await supabaseAdmin
        .from("password_recovery_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", request_id);

      return new Response(
        JSON.stringify({ success: true, message: "Password recovery request rejected." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Approve -> Trigger EXACTLY 1 reset email via Supabase Auth
    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(
      reqRow.email,
      { redirectTo: `${siteUrl}/reset-password` }
    );

    if (resetErr) {
      return new Response(
        JSON.stringify({ error: `Failed to dispatch reset email: ${resetErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to approved
    await supabaseAdmin
      .from("password_recovery_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", request_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password reset email approved & dispatched to ${reqRow.email}.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
