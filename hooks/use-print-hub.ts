// suppsales_frontend/src/hooks/use-print-hub.ts

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { usePrintHubStore } from "@/store/print-hub";
import { printHubService } from "@/lib/print-hub-service";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function usePrintHub() {
  const authHasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Pobieramy dane organizacji z serwera za pomocą React Query
  const { data: organization } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => (await api.get("/organization")).data,
    enabled: authHasHydrated && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minut cache
  });

  const printHubEnabled = organization?.print_hub_enabled ?? false;
  const defaultInvoicePrinter = organization?.print_hub_default_invoice_printer;
  const defaultLabelPrinter = organization?.print_hub_default_label_printer;
  const printErpSymbolOnLabel = organization?.print_erp_symbol_on_label ?? false;
  const labelItemsPerPage = organization?.label_items_per_page ?? 3;

  const status = usePrintHubStore((state) => state.status);
  const printers = usePrintHubStore((state) => state.printers);

  useEffect(() => {
    if (typeof window !== "undefined" && authHasHydrated && printHubEnabled) {
      console.log("[PrintHub] Inicjalizacja serwisu...");
      printHubService.initialize();
    }
  }, [printHubEnabled, authHasHydrated]);

  // Zwracamy stabilne wartości.
  return { 
    isEnabled: printHubEnabled, 
    status, 
    printers, 
    defaultInvoicePrinter, 
    defaultLabelPrinter,
    printErpSymbolOnLabel,
    labelItemsPerPage,
  };
}
