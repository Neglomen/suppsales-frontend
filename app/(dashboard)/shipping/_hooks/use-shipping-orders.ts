import { useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { PaginatedResponse } from "@/types/pagination";

// Funkcja pobierająca dane, może być w tym samym pliku lub importowana
const fetchShippingOrders = async ({
  pageParam = 1,
  queryKey,
}: {
  pageParam: number;
  queryKey: (string | Record<string, any>)[];
}): Promise<PaginatedResponse<MarketplaceOrder>> => {
  // Pobieramy filtry z queryKey
  const [_key, filters] = queryKey;

  const params = new URLSearchParams();
  params.append("sortBy", "purchased_at");
  params.append("sortOrder", "asc");
  params.append("page", String(pageParam));
  params.append("size", "50"); // Pobieramy paczki po 50

  // Dynamicznie dodajemy filtry do parametrów
  if (typeof filters === "object" && filters !== null) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
  }

  const res = await api.get(`/orders?${params.toString()}`);
  return res.data;
};

// Interfejs dla filtrów, które można przekazać do hooka
interface ShippingOrdersFilters {
  fulfillmentStatus?: string;
  search?: string;
  // W przyszłości można dodać więcej
}

export function useShippingOrders(filters: ShippingOrdersFilters) {
  return useInfiniteQuery({
    // Klucz zapytania zawiera teraz filtry, aby react-query automatycznie odświeżał dane po ich zmianie
    queryKey: ["shippingOrders", filters],
    queryFn: fetchShippingOrders,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
  });
}
