import { useQuery } from "@tanstack/react-query";
import { savedService } from "@/services/saved/savedService";

export function useSavedItems(userId: string | undefined) {
  return useQuery({
    queryKey: ["saved-items", userId],
    queryFn: async () => {
      if (!userId) return [];
      const items = await savedService.getSavedItems(userId);
      const productIds: string[] = [];
      const accIds: string[] = [];
      items.forEach((item) => {
        if (item.item_type === "product") productIds.push(item.item_id);
        else if (item.item_type === "accommodation") accIds.push(item.item_id);
      });
      const [products, accommodations] = await Promise.all([
        savedService.getProductsByIds(productIds),
        savedService.getAccommodationsByIds(accIds),
      ]);
      return items.map((item) => {
        if (item.item_type === "product") {
          const product = products.find((p) => p.id === item.item_id);
          return { ...item, data: product, savedPrice: (item.metadata as any)?.price };
        } else {
          const acc = accommodations.find((a) => a.id === item.item_id);
          return { ...item, data: acc };
        }
      });
    },
    enabled: !!userId,
  });
}