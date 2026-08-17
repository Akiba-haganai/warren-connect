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

    const siteUrl = Deno.env.get("SITE_URL") || "https://plawza.com";

    // Action: Approve -> Generate Auth Link & Dispatch via Resend API
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: reqRow.email,
      options: {
        redirectTo: `${siteUrl}/reset-password`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return new Response(
        JSON.stringify({ error: `Failed to generate recovery link: ${linkErr?.message || "Unknown error"}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resetLink = linkData.properties.action_link;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("RESEND_SENDER_EMAIL") || "onboarding@resend.dev";

    if (resendApiKey) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `PLAWZA Security <${senderEmail}>`,
          to: [reqRow.email],
          subject: "Reset your PLAWZA password",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="display: inline-block; background-color: #00897B; color: #ffffff; width: 40px; height: 40px; line-height: 40px; border-radius: 10px; font-weight: 900; font-size: 20px;">P</div>
                <h2 style="color: #0f172a; margin-top: 12px; margin-bottom: 4px;">PLAWZA Password Recovery</h2>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Campus Marketplace &amp; Student Hub</p>
              </div>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your identity verification challenge for password recovery was <strong>approved</strong> by an administrator.</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">Click the button below to complete your password reset:</p>
              <div style="margin: 28px 0; text-align: center;">
                <a href="${resetLink}" style="background-color: #00897B; color: #ffffff; padding: 12px 28px; font-weight: 700; font-size: 14px; border-radius: 9999px; text-decoration: none; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  Reset My Password
                </a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; border-t: 1px solid #f1f5f9; pt-16; margin-top: 24px;">If the button does not work, copy and paste this link into your browser:<br/><a href="${resetLink}" style="color: #00897B; word-break: break-all;">${resetLink}</a></p>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 12px;">If you did not request password recovery, please secure your account immediately.</p>
            </div>
          `,
        }),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        console.error("Resend API failed, falling back to Supabase auth mailer:", errText);
        await supabaseAdmin.auth.resetPasswordForEmail(reqRow.email, { redirectTo: `${siteUrl}/reset-password` });
      }
    } else {
      await supabaseAdmin.auth.resetPasswordForEmail(reqRow.email, { redirectTo: `${siteUrl}/reset-password` });
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
