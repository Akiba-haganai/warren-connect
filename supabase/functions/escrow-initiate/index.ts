// @ts-ignore
Deno.serve(async (req) => {
  const { escrowId, provider, amount } = await req.json();


  // Replace with Airtel/MTN Collections API
  console.log(`Initiating ${provider} payment for escrow ${escrowId}: K${amount}`);

  return new Response(
    JSON.stringify({
      success: true,
      transactionId: "TXN-STUB-" + Date.now(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

