import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PackageDefinition } from "@/types/package-definition";
import { DeliveryMethodMapping } from "@/types/delivery-method-mapping";
import { ServiceIntegration } from "@/types/service-integration";
import { PaginatedResponse } from "@/types/pagination"; // Importuj typ

const fetchShippingConfig = async () => {
  const [packagesRes, mappingsRes, couriersRes] = await Promise.all([
    api.get<PackageDefinition[]>("/package-definitions"),
    // Oczekujemy teraz paginowanej odpowiedzi (zwiększamy limit by pobrać wszystkie dla strony wysyłek)
    api.get<PaginatedResponse<DeliveryMethodMapping>>(
      "/delivery-method-mappings",
      { params: { size: 1000 } }
    ),
    api.get<ServiceIntegration[]>("/service-integrations", {
      params: { canBeCourier: "true" },
    }),
  ]);

  return {
    packages: packagesRes.data,
    // === POPRAWKA TUTAJ ===
    // Zwracamy tablicę `items` z obiektu paginacji
    mappings: mappingsRes.data.items,
    // === KONIEC POPRAWKI ===
    couriers: couriersRes.data,
  };
};

export function useShippingConfig() {
  return useQuery({
    queryKey: ["shippingConfig"],
    queryFn: fetchShippingConfig,
    staleTime: 0, // always refetch on mount to pick up mapping or template changes
  });
}
