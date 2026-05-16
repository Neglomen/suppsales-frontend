// suppsales_frontend/src/hooks/use-print-hub.ts

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { usePrintHubStore } from "@/store/print-hub";
import { printHubService } from "@/lib/print-hub-service";

export function usePrintHub() {
  // Pobieramy flagę, ale jeśli jest niezdefiniowana, zakladamy ze serwer może działać lokalnie
  const rawPrintHubEnabled = useAuthStore(
    (state) => (state as any).organizationSettings?.printHubEnabled
  );
  const printHubEnabled = rawPrintHubEnabled !== false; // Domyślnie true (próba połączenia)
  const defaultInvoicePrinter = useAuthStore(
    (state) => (state as any).organizationSettings?.defaultInvoicePrinter
  );
  const defaultLabelPrinter = useAuthStore(
    (state) => (state as any).organizationSettings?.defaultLabelPrinter
  );
  const authHasHydrated = useAuthStore((state) => state._hasHydrated);

  // === START KLUCZOWEJ POPRAWKI ===
  // Pobieramy każdą wartość ze store'u osobno.
  // To zapewnia, że re-render nastąpi tylko wtedy, gdy dana wartość się zmieni.
  const status = usePrintHubStore((state) => state.status);
  const printers = usePrintHubStore((state) => state.printers);
  // === KONIEC KLUCZOWEJ POPRAWKI ===

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
    defaultLabelPrinter 
  };
}
