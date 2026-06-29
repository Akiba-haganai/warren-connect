import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { savedService } from "@/services/saved/savedService";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

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

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();            // ⛔ stop the card link
    e.preventDefault();             // ⛔ prevent any default link behaviour

    if (!user) return;
    try {
      if (saved) {
        await savedService.unsaveItem(user.id, itemType, itemId);
        setSaved(false);
        toast.success("Removed from saved.");
      } else {
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
        toast.success("Saved!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save.");
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-1 rounded-full active:scale-90 transition-transform"
      aria-label={saved ? "Unsave" : "Save"}
      style={{ background: "transparent", border: "none", cursor: "pointer" }}
    >
      <Heart
        size={size}
        fill={saved ? "var(--color-accent)" : "none"}
        strokeWidth={2}
        style={{ color: saved ? "var(--color-accent)" : "var(--color-text-muted)" }}
      />
    </button>
  );
}