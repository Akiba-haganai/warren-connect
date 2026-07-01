import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productService } from "@/services/products/productService";

export function useToggleProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      newStatus,
    }: {
      productId: string;
      newStatus: boolean;
    }) => productService.toggleStock(productId, newStatus),

    onMutate: async ({ productId, newStatus }) => {
      // Cancel outgoing product queries to prevent overwrite
      await queryClient.cancelQueries({ queryKey: ["products"] });
      await queryClient.cancelQueries({ queryKey: ["product", productId] });

      // Snapshot previous data for rollback
      const previousProducts = queryClient.getQueriesData({
        queryKey: ["products"],
      });
      const previousProduct = queryClient.getQueryData(["product", productId]);

      // Optimistically update all product lists
      queryClient.setQueriesData({ queryKey: ["products"] }, (old: any) => {
        if (!old) return old;
        // Handle infinite query data structure
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            products: page.products.map((p: any) =>
              p.id === productId ? { ...p, in_stock: newStatus } : p
            ),
          })),
        };
      });

      // Update single product cache
      queryClient.setQueryData(["product", productId], (old: any) =>
        old ? { ...old, in_stock: newStatus } : old
      );

      return { previousProducts, previousProduct };
    },

    onError: (_err, { productId }, context) => {
      // Rollback on failure
      if (context?.previousProducts) {
        context.previousProducts.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      if (context?.previousProduct !== undefined) {
        queryClient.setQueryData(
          ["product", productId],
          context.previousProduct
        );
      }
      alert("Could not update stock. Please try again.");
    },

    onSettled: (_, __, { productId }) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["unified-feed"] });
    },
  });
}