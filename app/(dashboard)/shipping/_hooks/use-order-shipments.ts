"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Shipment } from "@/types/shipment";

// Funkcja pobierająca dane z naszego nowego endpointu
const fetchOrderShipments = async (orderId: string): Promise<Shipment[]> => {
  const { data } = await api.get(`/shipping/orders/${orderId}/shipments`);
  return data;
};

export function useOrderShipments(orderId: string | null | undefined) {
  return useQuery({
    // Klucz zapytania zawiera orderId, aby automatycznie odświeżać dane
    // przy zmianie wybranego zamówienia.
    queryKey: ["orderShipments", orderId],
    // Funkcja pobierająca jest wywoływana tylko, gdy orderId istnieje (enabled: !!orderId)
    queryFn: () => fetchOrderShipments(orderId!),
    // Zapytanie będzie aktywne tylko jeśli orderId nie jest nullem/undefined
    enabled: !!orderId,
    // Możemy ustawić krótki czas przetrzymywania danych, aby były w miarę aktualne
    staleTime: 1 * 60 * 1000, // 1 minuta
  });
}
