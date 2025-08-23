// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useAuthStore } from "@/store/auth";

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        Witaj z powrotem, {user?.name || user?.email}!
      </h1>
      <p className="text-muted-foreground">Oto co nowego w Twoim biznesie.</p>

      {/* Tutaj w przyszłości pojawią się komponenty, statystyki i wykresy */}
      <div className="mt-6">
        <p>
          Panel główny jest w budowie. Wybierz opcję z menu, aby kontynuować.
        </p>
      </div>
    </div>
  );
}
