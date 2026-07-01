import { useInfiniteQuery } from "@tanstack/react-query";
import { productService } from "@/services/products/productService";

const PAGE_SIZE = 10;

interface UseProductsOptions {
  search?: string;
  enabled?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { search = "", enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ["products", search],
    queryFn: async ({ pageParam = 0 }) => {
      const offset = pageParam * PAGE_SIZE;
      const data = await productService.getProductsPaginated(PAGE_SIZE, offset);
      return {
        products: data,
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled,
  });
}