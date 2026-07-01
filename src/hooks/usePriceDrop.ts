import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth/authStore";
import { supabase } from "@/lib/supabase/client";
import { savedService } from "@/services/saved/savedService";
import { triggerNotification } from "@/services/notifications/triggerService";

export function usePriceDropListener() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("price-drops")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const updatedProduct = payload.new as any;
        const oldProduct = payload.old as any;
        if (updatedProduct.price < oldProduct.price) {
          savedService.isSaved(user.id, "product", updatedProduct.id).then((saved: boolean) => {
            if (saved) {
              triggerNotification.system(
                user.id,
                "Price Drop",
                `The price of ${updatedProduct.title} dropped from K${oldProduct.price} to K${updatedProduct.price}!`,
                `/marketplace/${updatedProduct.id}`
              );
              queryClient.invalidateQueries({ queryKey: ["saved-items", user.id] });
            }
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);
}