import { useQuery } from "@tanstack/react-query";
import { productService } from "@/services/products/productService";

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => productService.getProductWithSeller(productId!),
    enabled: !!productId,
  });
}