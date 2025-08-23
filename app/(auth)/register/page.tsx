// src/app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { FullRegisterSchema, FullRegisterSchemaType } from "@/lib/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
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
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import Link from "next/link";

// --- Krok 1: Komponent formularza danych logowania ---
const Step1 = () => (
  <>
    <FormField
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input placeholder="nazwa@domena.com" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Hasło</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
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
  </>
);

// --- Krok 2: Komponent formularza danych organizacji ---
const Step2 = () => (
  <>
    <FormField
      name="organizationName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa Twojej Organizacji</FormLabel>
          <FormControl>
            <Input placeholder="Moja Firma" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="companyName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Pełna Nazwa Firmy (opcjonalnie)</FormLabel>
          <FormControl>
            <Input placeholder="Moja Firma sp. z o.o." {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="taxId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>NIP (opcjonalnie)</FormLabel>
          <FormControl>
            <Input placeholder="123-456-78-90" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);

// --- Krok 3: Komponent formularza zgód (POPRAWIONY) ---
const Step3 = () => {
  // Używamy `useFormContext`, aby połączyć się z `FormProvider`
  const { control } = useFormContext<FullRegisterSchemaType>();
  return (
    <FormField
      control={control} // Przekazujemy `control` z głównego formularza
      name="acceptTerms"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>Akceptacja regulaminu</FormLabel>
            <FormDescription>
              Akceptuję{" "}
              <Link href="/terms" className="underline hover:text-primary">
                regulamin
              </Link>{" "}
              oraz{" "}
              <Link href="/privacy" className="underline hover:text-primary">
                politykę prywatności
              </Link>
              .
            </FormDescription>
            {/* FormMessage jest teraz potrzebne, jeśli .refine() zawiedzie */}
            <FormMessage />
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
    // Waliduj przy utracie fokusa dla lepszego UX
    mode: "onBlur",
  });

  const { trigger, handleSubmit, formState } = methods;

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
    } catch (err: any) {
      setError(err.response?.data?.detail || "Wystąpił nieoczekiwany błąd.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Stwórz nowe konto</CardTitle>
          <CardDescription>Krok {step} z 3</CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {step === 1 && <Step1 />}
                  {step === 2 && <Step2 />}
                  {step === 3 && <Step3 />}
                </motion.div>
              </AnimatePresence>

              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}

              <div className="flex justify-between pt-4">
                {
                  step > 1 ? (
                    <Button type="button" variant="ghost" onClick={prevStep}>
                      Wróć
                    </Button>
                  ) : (
                    <div />
                  ) // Pusty div dla zachowania układu
                }

                {step < 3 && (
                  <Button type="button" onClick={nextStep}>
                    Dalej
                  </Button>
                )}

                {step === 3 && (
                  <Button type="submit" disabled={formState.isSubmitting}>
                    {formState.isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Załóż konto
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}
