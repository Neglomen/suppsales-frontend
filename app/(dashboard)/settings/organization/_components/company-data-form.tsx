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

const companyDataSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć co najmniej 2 znaki."),
  company_name: z.string().optional().or(z.literal("")),
  tax_id: z.string().optional().or(z.literal("")),
  address_street: z.string().optional().or(z.literal("")),
  address_postal_code: z.string().optional().or(z.literal("")),
  address_city: z.string().optional().or(z.literal("")),
});

type CompanyDataValues = z.infer<typeof companyDataSchema>;

export function CompanyDataForm({
  organization,
}: {
  organization: Organization;
}) {
  const form = useForm<CompanyDataValues>({
    resolver: zodResolver(companyDataSchema),
    defaultValues: {
      name: organization.name || "",
      company_name: organization.company_name || "",
      tax_id: organization.tax_id || "",
      address_street: organization.address_street || "",
      address_postal_code: organization.address_postal_code || "",
      address_city: organization.address_city || "",
    },
  });

  const { onSubmit, isPending } = useOrganizationForm(form);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dane Firmowe</CardTitle>
        <CardDescription>
          Podstawowe informacje o Twojej organizacji i dane do faktur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pola formularza (name, company_name, tax_id, etc.) */}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending || !form.formState.isDirty}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz dane firmowe
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
