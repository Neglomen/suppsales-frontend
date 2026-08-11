// src/app/(auth)/register/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FullRegisterSchema, FullRegisterSchemaType } from "@/lib/zod";
import { useAuthStore } from "@/store/auth";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
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
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AnimatedBackground } from "@/components/shared/grid-background";
import { Logo } from "@/components/shared/logo";

// Input styling helper
const inputClassName =
  "bg-white/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-border/50 text-foreground placeholder-slate-400 dark:placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl h-11";

// --- Krok 1: Komponent formularza danych logowania ---
const Step1 = () => (
  <>
    <FormField
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground/80">Email</FormLabel>
          <FormControl>
            <Input placeholder="nazwa@domena.com" className={inputClassName} {...field} />
          </FormControl>
          <FormMessage className="text-rose-400" />
        </FormItem>
      )}
    />
    <FormField
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground/80">Hasło</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••" className={inputClassName} {...field} />
          </FormControl>
          <FormMessage className="text-rose-400" />
        </FormItem>
      )}
    />
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground/80">Imię i Nazwisko (opcjonalnie)</FormLabel>
          <FormControl>
            <Input placeholder="Jan Kowalski" className={inputClassName} {...field} />
          </FormControl>
          <FormMessage className="text-rose-400" />
        </FormItem>
      )}
    />
  </>
);

// --- Krok 2: Komponent formularza danych organizacji ---
const Step2 = () => (
  <>
    <FormField
      name="organizationName"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground/80">Nazwa Twojej Organizacji</FormLabel>
          <FormControl>
            <Input placeholder="Moja Firma" className={inputClassName} {...field} />
          </FormControl>
          <FormMessage className="text-rose-400" />
        </FormItem>
      )}
    />
    <FormField
      name="companyName"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground/80">Pełna Nazwa Firmy (opcjonalnie)</FormLabel>
          <FormControl>
            <Input placeholder="Moja Firma sp. z o.o." className={inputClassName} {...field} />
          </FormControl>
          <FormMessage className="text-rose-400" />
        </FormItem>
      )}
    />
    <FormField
      name="taxId"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground/80">NIP (opcjonalnie)</FormLabel>
          <FormControl>
            <Input placeholder="123-456-78-90" className={inputClassName} {...field} />
          </FormControl>
          <FormMessage className="text-rose-400" />
        </FormItem>
      )}
    />
  </>
);

// --- Krok 3: Komponent formularza zgód ---
const Step3 = () => {
  const { control } = useFormContext<FullRegisterSchemaType>();
  return (
    <FormField
      control={control}
      name="acceptTerms"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-xl border border-slate-200/50 dark:border-border/60 bg-white/50 dark:bg-slate-950/20 p-4">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              className="border-slate-300 dark:border-slate-600 text-foreground dark:text-white data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded mt-1"
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="text-foreground/90 dark:text-slate-200 font-medium">Akceptacja regulaminu</FormLabel>
            <FormDescription className="text-muted-foreground text-xs sm:text-sm">
              Akceptuję{" "}
              <Link href="/terms" className="underline text-primary hover:text-primary/80 transition-colors">
                regulamin
              </Link>{" "}
              oraz{" "}
              <Link href="/privacy" className="underline text-primary hover:text-primary/80 transition-colors">
                politykę prywatności
              </Link>
              .
            </FormDescription>
            <FormMessage className="text-rose-400" />
          </div>
        </FormItem>
      )}
    />
  );
};

// --- Główny komponent strony ---
export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const methods = useForm<FullRegisterSchemaType>({
    resolver: zodResolver(FullRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      organizationName: "",
      companyName: "",
      taxId: "",
      acceptTerms: false,
    },
    mode: "onBlur",
  });

  const { trigger, handleSubmit, formState } = methods;

  if (!_hasHydrated || (isAuthenticated && _hasHydrated)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const nextStep = async () => {
    let fieldsToValidate: (keyof FullRegisterSchemaType)[] = [];
    if (step === 1) fieldsToValidate = ["email", "password"];
    if (step === 2) fieldsToValidate = ["organizationName"];

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => setStep((prev) => prev - 1);

  const onSubmit = async (data: FullRegisterSchemaType) => {
    setError(null);
    try {
      const payload = {
        email: data.email,
        password: data.password,
        name: data.name || null,
        accept_terms: data.acceptTerms,
        organization: {
          name: data.organizationName,
          company_name: data.companyName || null,
          tax_id: data.taxId || null,
        },
      };

      await api.post("/auth/register", payload);
      router.push(`/register/success?email=${data.email}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || "Wystąpił nieoczekiwany błąd.");
    }
  };

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
          {/* Subtle neon glowing light effects */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 dark:bg-primary/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-600/5 dark:bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />

          <CardHeader className="text-center pt-8 pb-4">
            <div className="flex justify-center mb-6">
              <Logo showText={true} textClassName="text-xl" iconClassName="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Stwórz nowe konto
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Krok {step} z 3 — Wypełnij dane rejestracyjne
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-6">
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="min-h-[200px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -30, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {step === 1 && <Step1 />}
                      {step === 2 && <Step2 />}
                      {step === 3 && <Step3 />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {error && (
                  <p className="text-sm font-medium text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-center">
                    {error}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={prevStep}
                      className="text-foreground/70 hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl h-11"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Wróć
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="bg-primary hover:bg-primary/90 text-white font-medium rounded-xl h-11 px-5 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
                    >
                      Dalej <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={formState.isSubmitting}
                      className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-medium rounded-xl h-11 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
                    >
                      {formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          Załóż konto <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </FormProvider>
          </CardContent>

          <CardFooter className="flex justify-center text-sm border-t border-slate-100 dark:border-border/30 pt-5 pb-6">
            <p className="text-muted-foreground">
              Masz już konto?&nbsp;
              <Link
                href="/login"
                className="text-primary hover:text-primary/80 transition-colors font-semibold"
              >
                Zaloguj się
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatedBackground>
  );
}
