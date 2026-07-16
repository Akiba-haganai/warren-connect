export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  const { phone } = await req.json();

  // Replace with Africa's Talking / Twilio API call
  console.log(`OTP sent to ${phone}`);

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

// Supabase Edge Runtime will provide `Deno.serve` at deploy-time.
// If your local TS tooling complains, ignore it; deploy will work.
// @ts-ignore
Deno.serve(handler);



