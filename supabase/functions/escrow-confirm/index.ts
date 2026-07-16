// @ts-ignore
Deno.serve(async (req) => {
  const { escrowId, buyerId } = await req.json();


  // Replace with Airtel/MTN Disbursements API
  console.log(`Confirming receipt for escrow ${escrowId}, releasing funds`);

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

