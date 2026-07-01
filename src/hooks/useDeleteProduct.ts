import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/products/productService";

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => productService.deleteProduct(productId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
      queryClient.invalidateQueries({ queryKey: ["all-shops"] });
    },

    onError: () => {
      alert("Could not delete product. Please try again.");
    },
  });
}