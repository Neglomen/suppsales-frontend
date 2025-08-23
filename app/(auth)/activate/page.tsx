// src/app/(auth)/activate/page.tsx
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function ActivationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Aktywujemy Twoje konto...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Brak tokenu aktywacyjnego.");
      return;
    }

    const activateAccount = async () => {
      try {
        await api.post(`/auth/activate/${token}`);
        setStatus("success");
        setMessage("Twoje konto zostało pomyślnie aktywowane!");
        setTimeout(() => router.push("/login"), 3000); // Przekieruj po 3 sekundach
      } catch (err: any) {
        setStatus("error");
        setMessage(
          err.response?.data?.detail || "Wystąpił błąd podczas aktywacji."
        );
      }
    };
    activateAccount();
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4">
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
          Za chwilę zostaniesz przekierowany na stronę logowania...
        </p>
      )}
      {status === "error" && (
        <Button asChild>
          <Link href="/login">Wróć do logowania</Link>
        </Button>
      )}
    </div>
  );
}

export default function ActivationPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <ActivationContent />
    </Suspense>
  );
}
