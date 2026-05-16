import { QueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // === POPRAWKA: Wyłącz ponawianie prób dla błędów 401 ===
      retry: (failureCount, error) => {
        // Jeśli błąd to błąd axios i ma status 401, nie ponawiaj
        if (error instanceof AxiosError && error.response?.status === 401) {
          return false;
        }
        // W przeciwnym razie, użyj domyślnej logiki (ponów 3 razy)
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minut
    },
  },
});
