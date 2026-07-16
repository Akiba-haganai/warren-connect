// @ts-ignore
Deno.serve(async (req) => {
  const { phone, code } = await req.json();


  // Replace with real OTP verification
  const valid = code === "123456"; // stub

  return new Response(JSON.stringify({ valid }), {
    headers: { "Content-Type": "application/json" },
  });
});

