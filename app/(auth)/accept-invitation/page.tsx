// src/app/(auth)/accept-invitation/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { Loader2, ArrowRight, UserPlus, Sparkles, ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/shared/grid-background";
import { Logo } from "@/components/shared/logo";
import { motion } from "framer-motion";

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
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(
          axiosError.response?.data?.detail ||
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
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AnimatedBackground>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-4"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
          <ArrowLeft className="h-4 w-4" /> Wróć do strony głównej
        </Link>

        <Card className="glass border-border/60 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden text-slate-100">
          {/* Subtle neon glowing light effects */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />

          <CardHeader className="text-center pt-8 pb-6">
            <div className="flex justify-center mb-6">
              <Logo showText={true} textClassName="text-xl" iconClassName="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
              Dołącz do Zespołu <Sparkles className="h-5 w-5 text-primary" />
            </CardTitle>
            <CardDescription className="text-slate-400">
              Uzupełnij swoje dane, aby dokończyć rejestrację w SuppSales.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs text-slate-400 font-semibold">Weryfikowanie zaproszenia...</span>
              </div>
            )}

            {error && !isLoading && (
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium text-rose-400 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 leading-relaxed">
                  {error}
                </p>
                <Button
                  onClick={() => router.push("/login")}
                  variant="outline"
                  className="rounded-xl border-border/50 text-slate-300 hover:text-slate-50"
                >
                  Wróć do logowania
                </Button>
              </div>
            )}

            {invitedEmail && !isLoading && !error && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormItem>
                    <FormLabel className="text-slate-300">Adres email</FormLabel>
                    <FormControl>
                      <Input
                        value={invitedEmail}
                        disabled
                        className="bg-slate-950/10 border-border/30 text-slate-400 rounded-xl h-11 opacity-70 cursor-not-allowed"
                      />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Imię i Nazwisko (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Jan Kowalski"
                            className="bg-slate-950/20 border-border/50 text-foreground placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-rose-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Hasło</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="bg-slate-950/20 border-border/50 text-foreground placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-rose-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Potwierdź Hasło</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="bg-slate-950/20 border-border/50 text-foreground placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-rose-400" />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-medium rounded-xl h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] border-none mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Zarejestruj się i dołącz <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatedBackground>
  );
}

// Opakowujemy główny komponent w Suspense
export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AcceptInvitationForm />
    </Suspense>
  );
}
