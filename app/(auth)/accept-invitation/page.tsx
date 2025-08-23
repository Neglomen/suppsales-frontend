// src/app/(auth)/accept-invitation/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { AcceptInvitationSchema, AcceptInvitationSchemaType } from "@/lib/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Komponent wewnętrzny, aby móc używać `useSearchParams` wewnątrz Suspense
function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  // Efekt do weryfikacji tokenu przy pierwszym ładowaniu
  useEffect(() => {
    if (!token) {
      setError(
        "Brak tokenu zaproszenia. Upewnij się, że używasz poprawnego linku."
      );
      setIsLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/invitations/${token}`);
        setInvitedEmail(response.data.email);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
            "Nieprawidłowy lub wygasły link zaproszenia."
        );
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const form = useForm<AcceptInvitationSchemaType>({
    resolver: zodResolver(AcceptInvitationSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: AcceptInvitationSchemaType) {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        password: values.password,
        name: values.name,
      };

      // Akceptujemy zaproszenie, tworzymy użytkownika i od razu go logujemy
      const response = await api.post(`/invitations/${token}/accept`, payload);
      const { access_token } = response.data;

      // Pobieramy dane nowego użytkownika
      const userResponse = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      // Zapisujemy sesję w Zustand
      login(access_token, userResponse.data);

      // Przekierowujemy do panelu
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Wystąpił nieoczekiwany błąd.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Dołącz do Zespołu
          </CardTitle>
          <CardDescription>
            Uzupełnij swoje dane, aby dokończyć rejestrację.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}

          {error && !isLoading && (
            <p className="text-sm font-medium text-destructive text-center">
              {error}
            </p>
          )}

          {invitedEmail && !isLoading && !error && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input value={invitedEmail} disabled />
                  </FormControl>
                </FormItem>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię i Nazwisko (opcjonalnie)</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan Kowalski" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hasło</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potwierdź Hasło</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Zarejestruj się i dołącz
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Opakowujemy główny komponent w Suspense, co jest dobrą praktyką
// przy używaniu hooka `useSearchParams` w App Router.
export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <AcceptInvitationForm />
    </Suspense>
  );
}
