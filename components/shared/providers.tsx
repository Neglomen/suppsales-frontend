"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function Providers({ children }: { children: React.ReactNode }) {
  // Stwórz instancję klienta.
  // Używamy useState, aby upewnić się, że klient jest tworzony tylko raz na render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Ustawienia domyślne dla wszystkich zapytań
            staleTime: 5 * 60 * 1000, // 5 minut
            refetchOnWindowFocus: false, // Opcjonalnie: wyłącz odświeżanie przy focusie okna
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Narzędzia deweloperskie, widoczne tylko w trybie deweloperskim */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
