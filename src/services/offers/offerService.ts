import { supabase } from "@/lib/supabase/client";

export const offerService = {
  async makeOffer(productId: string, buyerId: string, sellerId: string, amount: number) {
    const { data, error } = await supabase
      .from("offers")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify seller (best-effort)
    try {
      await supabase.from("notifications").insert({
        user_id: sellerId,
        type: "offer",
        title: "New Offer",
        body: `Someone offered K${amount} for your listing`,
        link: `/marketplace/${productId}?offer=${data.id}`,
      });
    } catch {
      // ignore notifications failures
    }

    return data;
  },

  async respond(
  offerId: string,
  userId: string,
  action: "accept" | "decline" | "counter",
  counterAmount?: number
) {
  const { data: offer, error: fetchErr } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!offer) throw new Error("Offer not found");

  // Verify that the user is the seller (or buyer, if responding to a counter)
  if (userId !== offer.seller_id && userId !== offer.buyer_id) {
    throw new Error("You are not authorized to respond to this offer.");
  }

  if (action === "counter") {
    if (!counterAmount) throw new Error("Counter amount is required");
    const { error: upErr } = await supabase
      .from("offers")
      .update({ status: "countered" })
      .eq("id", offerId);
    if (upErr) throw upErr;

    const { data: counterOffer, error: insErr } = await supabase
      .from("offers")
      .insert({
        product_id: offer.product_id,
        buyer_id: offer.buyer_id,
        seller_id: offer.seller_id,
        amount: counterAmount,
        parent_offer_id: offerId,
      })
      .select()
      .single();

    if (insErr) throw insErr;
    return counterOffer;
  }

  const nextStatus = action === "accept" ? "accepted" : "declined";
  const { error: upErr } = await supabase
    .from("offers")
    .update({ status: nextStatus })
    .eq("id", offerId);

  if (upErr) throw upErr;
  return { success: true };
},
};

