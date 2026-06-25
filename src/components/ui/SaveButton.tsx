import { Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth/authStore";
import { savedService } from "@/services/saved/savedService";

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
      } else {
        await savedService.saveItem(user.id, itemType, itemId);
      }
      setSaved(!saved);
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