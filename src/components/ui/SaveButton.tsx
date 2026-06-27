import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { savedService } from "@/services/saved/savedService";
import { supabase } from "@/lib/supabase/client";

interface Props {
  itemType: "product" | "accommodation";
  itemId: string;
  size?: number;
}

export default function SaveButton({ itemType, itemId, size = 18 }: Props) {
  const user = useAuthStore((s) => s.user);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    savedService.isSaved(user.id, itemType, itemId).then(setSaved);
  }, [user, itemType, itemId]);

  const toggle = async () => {
    if (!user) return;
    try {
      if (saved) {
        await savedService.unsaveItem(user.id, itemType, itemId);
        setSaved(false);
      } else {
        // For products, fetch current price and save as metadata
        let metadata;
        if (itemType === "product") {
          const { data: product } = await supabase
            .from("products")
            .select("price")
            .eq("id", itemId)
            .single();
          metadata = { price: product?.price };
        }
        await savedService.saveItem(user.id, itemType, itemId, metadata);
        setSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button onClick={toggle} className="p-1" aria-label={saved ? "Unsave" : "Save"}>
      <Heart
        size={size}
        fill={saved ? "var(--color-accent)" : "none"}
        strokeWidth={2}
        style={{ color: saved ? "var(--color-accent)" : "var(--color-text-muted)" }}
      />
    </button>
  );
}