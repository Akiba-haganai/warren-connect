import { supabase } from "@/lib/supabase/client";

export const escrowService = {
  async initiate(
    productId: string,
    buyerId: string,
    sellerId: string,
    amount: number,
    provider: "airtel" | "mtn"
  ) {
    const { data, error } = await supabase
      .from("escrow_transactions")
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount,
        provider,
      })
      .select()
      .single();

    if (error) throw error;

    // Call mobile money STK push (Edge Function)
    const { error: payError } = await supabase.functions.invoke("escrow-initiate", {
      body: { escrowId: data.id, provider, amount },
    });

    if (payError) throw payError;

    return data;
  },

  async confirmReceipt(escrowId: string, buyerId: string) {
    const { error } = await supabase.functions.invoke("escrow-confirm", {
      body: { escrowId, buyerId },
    });

    if (error) throw error;

    // Best-effort: edge function should update DB; if it doesn't, user still gets success.
  },

  async getStatus(escrowId: string) {
    const { data, error } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("id", escrowId)
      .single();

    if (error) throw error;
    return data;
  },
};

