// src/app/(dashboard)/integrations/callback/allegro/status/page.tsx
"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function StatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const message = searchParams.get("message");

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        router.push("/dashboard/settings/integrations");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [router, status]);

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-bold">Połączenie z Allegro udane!</h1>
        <p className="text-muted-foreground">
          Konto zostało pomyślnie połączone. Za chwilę zostaniesz
          przekierowany...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center space-y-4">
      <XCircle className="h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-bold">Wystąpił błąd</h1>
      <p className="text-muted-foreground">
        {message || "Nie udało się połączyć konta. Spróbuj ponownie."}
      </p>
      <Button asChild>
        <Link href="/dashboard/settings/integrations">Wróć do integracji</Link>
      </Button>
    </div>
  );
}

export default function AllegroCallbackStatusPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <StatusContent />
    </Suspense>
  );
}
