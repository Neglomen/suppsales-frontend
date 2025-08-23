// src/components/shared/auth-check.tsx
"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Pobieramy flagę nawodnienia i status autentykacji bezpośrednio ze store'a
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Uruchamiamy logikę tylko wtedy, gdy stan jest już nawodniony
    if (_hasHydrated) {
      // Jeśli stan jest wczytany i użytkownik NIE jest zalogowany, przekieruj
      if (!isAuthenticated) {
        router.replace("/login");
      }
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Jeśli stan nie jest jeszcze nawodniony, pokazujemy ekran ładowania.
  // To zapobiega "mignięciu" i przedwczesnemu przekierowaniu.
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Jeśli stan jest nawodniony i użytkownik jest zalogowany
  // (bo `useEffect` by go już przekierował, gdyby nie był), renderujemy chronioną treść.
  return <>{children}</>;
}
