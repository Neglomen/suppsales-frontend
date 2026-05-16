"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Organization } from "@/types/organization";

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
import { useOrganizationForm } from "@/hooks/use-organization-form";

const defaultSenderSchema = z.object({
  default_sender_name: z.string().optional().or(z.literal("")),
  default_sender_company: z.string().optional().or(z.literal("")),
  default_sender_street: z.string().optional().or(z.literal("")),
  default_sender_postal_code: z.string().optional().or(z.literal("")),
  default_sender_city: z.string().optional().or(z.literal("")),
  default_sender_phone: z.string().optional().or(z.literal("")),
  default_sender_email: z
    .string()
    .email({ message: "Nieprawidłowy format e-mail." })
    .optional()
    .or(z.literal("")),
});

type DefaultSenderValues = z.infer<typeof defaultSenderSchema>;

interface DefaultSenderFormProps {
  organization: Organization;
}

export function DefaultSenderForm({ organization }: DefaultSenderFormProps) {
  const form = useForm<DefaultSenderValues>({
    resolver: zodResolver(defaultSenderSchema),
    defaultValues: {
      default_sender_name: organization.default_sender_name || "",
      default_sender_company: organization.default_sender_company || "",
      default_sender_street: organization.default_sender_street || "",
      default_sender_postal_code: organization.default_sender_postal_code || "",
      default_sender_city: organization.default_sender_city || "",
      default_sender_phone: organization.default_sender_phone || "",
      default_sender_email: organization.default_sender_email || "",
    },
  });

  const { onSubmit, isPending } = useOrganizationForm(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domyślny Adres Nadawcy</CardTitle>
        <CardDescription>
          Ten adres będzie używany jako domyślny dla wszystkich przesyłek, np.
          przy generowaniu etykiet kurierskich.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="default_sender_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię i nazwisko / Nazwa nadawcy</FormLabel>
                    <FormControl>
                      <Input placeholder="Jan Kowalski" {...field} />
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
                      <Input placeholder="Twoja Firma sp. z o.o." {...field} />
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
                      <Input placeholder="ul. Przykładowa 123" {...field} />
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
                      <Input placeholder="00-001" {...field} />
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
                      <Input placeholder="Warszawa" {...field} />
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
                      <Input placeholder="+48 123 456 789" {...field} />
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
                      <Input
                        type="email"
                        placeholder="kontakt@twojafirma.pl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending || !form.formState.isDirty}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz dane nadawcy
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
