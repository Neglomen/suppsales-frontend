// src/app/(auth)/login/page.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/shared/grid-background"; // Importujemy nowe tło

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginSchemaType) {
    setError(null);
    try {
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

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Logowanie nieudane:", err);
      setError(
        err.response?.data?.detail ||
          "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
      );
    }
  }

  return (
    <AnimatedBackground>
      <Card className="w-full max-w-sm border-border/40 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Witaj z powrotem!
          </CardTitle>
          <CardDescription>
            Wprowadź swoje dane, aby uzyskać dostęp do panelu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres email</FormLabel>
                    <FormControl>
                      <Input placeholder="nazwa@przyklad.com" {...field} />
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me" />
                  <label
                    htmlFor="remember-me"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Zapamiętaj mnie
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Nie pamiętasz hasła?
                </Link>
              </div>

              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zaloguj się
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Nie masz jeszcze konta?&nbsp;
            <Link
              href="/register"
              className="text-primary hover:underline font-semibold"
            >
              Zarejestruj się
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AnimatedBackground>
  );
}
