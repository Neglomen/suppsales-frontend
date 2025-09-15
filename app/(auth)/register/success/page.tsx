// src/app/(auth)/register/success/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Dziękujemy za rejestrację!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MailCheck className="mx-auto h-16 w-16 text-green-500" />
          <p>
            Na Twój adres email <span className="font-semibold">{email}</span>
            wysłaliśmy link aktywacyjny.
          </p>
          <p className="text-sm text-muted-foreground">
            Kliknij w link, aby dokończyć proces i aktywować swoje konto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
