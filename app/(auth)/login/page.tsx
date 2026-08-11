// src/app/(auth)/login/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LoginSchema, LoginSchemaType } from "@/lib/zod";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/shared/grid-background";
import { Logo } from "@/components/shared/logo";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, _hasHydrated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      const user = useAuthStore.getState().user;
      router.replace(user?.is_super_admin ? "/superadmin" : "/dashboard");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  if (!_hasHydrated || (isAuthenticated && _hasHydrated)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  async function onSubmit(values: LoginSchemaType) {
    setError(null);
    try {
      // Zapisujemy stan rememberMe w localStorage przed zalogowaniem
      if (typeof window !== "undefined") {
        localStorage.setItem("auth-remember-me", values.rememberMe ? "true" : "false");
      }

      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const response = await api.post("/auth/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const { access_token } = response.data;

      const userResponse = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      login(access_token, userResponse.data);

      // Przekieruj super admina do panelu wsparcia, zwykłych użytkowników do dashboardu
      const isSuperAdmin = userResponse.data?.is_super_admin === true;
      router.push(isSuperAdmin ? "/superadmin" : "/dashboard");
    } catch (err: unknown) {
      console.error("Logowanie nieudane:", err);
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError.response?.data?.detail ||
          "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
      );
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

        <Card className="glass shadow-2xl relative overflow-hidden text-foreground border-slate-200/50 dark:border-white/10 bg-white/70 dark:bg-slate-900/60">
          {/* Subtle neon glowing light effect in upper corner */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 dark:bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/5 dark:bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />

          <CardHeader className="text-center pt-8 pb-6">
            <div className="flex justify-center mb-6">
              <Logo showText={true} textClassName="text-xl" iconClassName="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Witaj z powrotem!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Wprowadź swoje dane, aby uzyskać dostęp do panelu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Adres email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="nazwa@przyklad.com"
                          className="bg-white/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-border/50 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11"
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
                      <FormLabel className="text-foreground/80">Hasło</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="bg-white/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-border/50 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-rose-400" />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-1">
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            id="rememberMe"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-slate-300 dark:border-slate-600 text-foreground dark:text-white data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded"
                          />
                        </FormControl>
                        <FormLabel
                          htmlFor="rememberMe"
                          className="text-xs sm:text-sm font-medium leading-none cursor-pointer text-foreground/75 hover:text-foreground transition-colors"
                        >
                          Zapamiętaj mnie
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <Link
                    href="/forgot-password"
                    className="text-xs sm:text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Nie pamiętasz hasła?
                  </Link>
                </div>

                {error && (
                  <p className="text-sm font-medium text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-center animate-shake">
                    {error}
                  </p>
                )}
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-medium rounded-xl h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.99] border-none"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Zaloguj się <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm border-t border-slate-100 dark:border-border/30 pt-5 pb-6">
            <p className="text-muted-foreground">
              Nie masz jeszcze konta?&nbsp;
              <Link
                href="/register"
                className="text-primary hover:text-primary/80 transition-colors font-semibold"
              >
                Zarejestruj się
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatedBackground>
  );
}
