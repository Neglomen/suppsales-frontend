"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  organizationSettingsSchema,
  OrganizationSettingsValues,
} from "@/lib/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Funkcja pomocnicza do czyszczenia danych z API (zamienia null na '')
const sanitizeDataForForm = (data: any): OrganizationSettingsValues => {
  const sanitized: any = {};
  for (const key in organizationSettingsSchema.shape) {
    sanitized[key] = data[key] ?? ""; // Użyj operatora nullish coalescing
  }
  return sanitized;
};

export function GeneralSettingsTab() {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<OrganizationSettingsValues>({
    resolver: zodResolver(organizationSettingsSchema),
  });

  useEffect(() => {
    const fetchOrganizationData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/organization");
        // Używamy naszej funkcji do "oczyszczenia" danych przed wstawieniem do formularza
        form.reset(sanitizeDataForForm(response.data));
      } catch (error) {
        toast.error("Nie udało się pobrać danych organizacji.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrganizationData();
  }, [form]);

  const onSubmit = async (values: OrganizationSettingsValues) => {
    // ID organizacji nie jest częścią formularza, pobieramy je z innego miejsca
    // (np. z hooka, ale dla uproszczenia załóżmy, że endpoint wie, którą organizację zaktualizować)
    await toast.promise(
      api.patch(`/organization`, values), // Uproszczony endpoint
      {
        loading: "Zapisywanie zmian...",
        success: (response) => {
          // Resetuj formularz z nowymi, "oczyszczonymi" danymi
          form.reset(sanitizeDataForForm(response.data));
          return "Dane organizacji zostały zaktualizowane.";
        },
        error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Dane Firmowe</CardTitle>
            <CardDescription>
              Podstawowe informacje o Twojej organizacji.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa organizacji</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pełna nazwa firmy</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ulica i numer</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod pocztowy</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miasto</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domyślny Adres Nadawcy</CardTitle>
            <CardDescription>
              Ten adres będzie używany jako domyślny dla wszystkich przesyłek.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_sender_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię i nazwisko / Nazwa</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_sender_company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firma (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_sender_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ulica i numer</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_sender_postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod pocztowy</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_sender_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miasto</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_sender_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon kontaktowy</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default_sender_email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Adres e-mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Zapisz zmiany
          </Button>
        </div>
      </form>
    </Form>
  );
}
