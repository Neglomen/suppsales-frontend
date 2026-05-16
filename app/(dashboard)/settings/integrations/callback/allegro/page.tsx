// src/app/(dashboard)/integrations/callback/allegro/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Przetwarzanie autoryzacji...");

  useEffect(() => {
    if (error) {
      setStatus("error");
      setMessage(`Błąd autoryzacji: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Brak kodu autoryzacyjnego w odpowiedzi od Allegro.");
      return;
    }

    const handleCallback = async () => {
      try {
        // Nasz backend zajmie się wymianą kodu na token
        await api.get(`/integrations/callback/allegro?code=${code}`);
        setStatus("success");
        setMessage("Konto Allegro połączone pomyślnie!");

        // Przekieruj z powrotem do listy integracji po 3 sekundach
        setTimeout(() => router.push("/dashboard/settings/integrations"), 3000);
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err.response?.data?.detail || "Nie udało się połączyć konta Allegro."
        );
      }
    };

    handleCallback();
  }, [code, error, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center space-y-4">
      {status === "loading" && (
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      )}
      {status === "success" && (
        <CheckCircle className="h-12 w-12 text-green-500" />
      )}
      {status === "error" && <XCircle className="h-12 w-12 text-destructive" />}
      <p className="text-xl">{message}</p>
      {status === "success" && (
        <p className="text-muted-foreground">
          Za chwilę zostaniesz przekierowany...
        </p>
      )}
      {status === "error" && (
        <Button asChild>
          <Link href="/dashboard/settings/integrations">
            Wróć do integracji
          </Link>
        </Button>
      )}
    </div>
  );
}

export default function AllegroCallbackPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
