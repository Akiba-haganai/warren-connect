import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { triggerNotification } from "@/services/notifications/triggerService";
import { useAuthStore } from "@/store/auth/authStore";

export function useMarketplaceNotifications() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("marketplace-retention")
      // Back in stock: in_stock flips from false -> true
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: "in_stock=eq.true",
        },
        async (payload) => {
          const updatedProduct = payload.new as any;
          const oldProduct = payload.old as any;

          if (!oldProduct.in_stock && updatedProduct.in_stock) {
            const { data: saved } = await supabase
              .from("saved_items")
              .select("user_id")
              .eq("item_type", "product")
              .eq("item_id", updatedProduct.id);

            if (saved?.length) {
              for (const s of saved) {
                if (s.user_id !== user.id) {
                  triggerNotification.system(
                    s.user_id,
                    "Back in Stock",
                    `"${updatedProduct.title}" is available again!`,
                    `/marketplace/${updatedProduct.id}`
                  );
                }
              }
            }
          }
        }
      )
      // Similar item listed (match saved searches)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "products",
        },
        async (payload) => {
          const newProduct = payload.new as any;

          const { data: searches } = await supabase
            .from("saved_searches")
            .select("user_id, query, category")
            .neq("user_id", newProduct.seller_id);

          if (searches?.length) {
            for (const search of searches) {
              const match =
                newProduct.title?.toLowerCase().includes(search.query?.toLowerCase()) ||
                (search.category && newProduct.category === search.category);

              if (match) {
                triggerNotification.system(
                  search.user_id,
                  "New Listing Matches Your Search",
                  `"${newProduct.title}" — K${newProduct.price}`,
                  `/marketplace/${newProduct.id}`
                );
              }
            }
          }
        }
      )
      // Shop new product notification
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "products",
          filter: "shop_id=neq.null",
        },
        async (payload) => {
          const newProduct = payload.new as any;
          if (!newProduct.shop_id) return;

          const { data: followers } = await supabase
            .from("shop_followers")
            .select("user_id")
            .eq("shop_id", newProduct.shop_id);

          if (followers?.length) {
            for (const f of followers) {
              if (f.user_id !== newProduct.seller_id) {
                triggerNotification.system(
                  f.user_id,
                  "New Product in a Shop You Follow",
                  `"${newProduct.title}" — K${newProduct.price}`,
                  `/marketplace/${newProduct.id}`
                );
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}

