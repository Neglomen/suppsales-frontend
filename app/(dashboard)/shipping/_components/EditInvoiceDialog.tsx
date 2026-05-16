"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Schemat walidacji danych do faktury
const invoiceSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    tax_id: z.string().optional(),
    street: z.string().min(3, "Ulica i numer są wymagane."),
    zip_code: z
      .string()
      .regex(/^\d{2}-\d{3}$/, "Nieprawidłowy format kodu pocztowego (np. 12-345)."),
    city: z.string().min(2, "Miasto jest wymagane."),
  })
  .superRefine((data, ctx) => {
    const hasPersonal = data.first_name?.trim() && data.last_name?.trim();
    const hasCompany = data.company_name?.trim();
    if (!hasPersonal && !hasCompany) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj imię i nazwisko lub nazwę firmy.",
        path: ["first_name"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wymagane gdy brak nazwy firmy.",
        path: ["last_name"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lub podaj nazwę firmy.",
        path: ["company_name"],
      });
    }
  });

type InvoiceSchema = z.infer<typeof invoiceSchema>;

// Minimalny interfejs wymagany przez dialog
export interface OrderLikeForInvoice {
  id: string;
  invoice_address?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    tax_id?: string | null;
    street?: string | null;
    zip_code?: string | null;
    city?: string | null;
  } | null;
  details_payload?: any;
}

interface EditInvoiceDialogProps {
  order: OrderLikeForInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
}

export function EditInvoiceDialog({
  order,
  isOpen,
  onClose,
  onSuccess,
}: EditInvoiceDialogProps) {
  const form = useForm<InvoiceSchema>({
    resolver: zodResolver(invoiceSchema),
    mode: "onChange",
    defaultValues: {
      first_name: "",
      last_name: "",
      company_name: "",
      tax_id: "",
      street: "",
      zip_code: "",
      city: "",
    },
  });

  // Wypełnij formularz danymi z bazy danych
  useEffect(() => {
    if (!order || !isOpen) return;

    // Priorytet 1: znormalizowany adres FV z DB (invoice_address)
    const inv = (order as any).invoice_address;
    if (inv) {
      form.reset({
        first_name: inv.first_name || "",
        last_name: inv.last_name || "",
        company_name: inv.company_name || "",
        tax_id: inv.tax_id || "",
        street: inv.street || "",
        zip_code: inv.zip_code || "",
        city: inv.city || "",
      });
      return;
    }

    // Priorytet 2: dane z payload zamówienia (details_payload)
    const payload = (order as any).details_payload || {};
    const invoice =
      payload.invoice || (payload.want_invoice === "1" ? payload : null);
    const invoiceAddress = invoice?.address || invoice || {};

    form.reset({
      first_name:
        invoiceAddress.naturalPerson?.firstName ||
        invoiceAddress.firstName ||
        invoiceAddress.invoice_fullname?.split(" ")[0] ||
        "",
      last_name:
        invoiceAddress.naturalPerson?.lastName ||
        invoiceAddress.lastName ||
        invoiceAddress.invoice_fullname?.split(" ").slice(1).join(" ") ||
        "",
      company_name:
        invoiceAddress.company?.name ||
        invoiceAddress.invoice_company ||
        "",
      tax_id:
        invoiceAddress.company?.taxId ||
        invoiceAddress.taxId ||
        invoiceAddress.invoice_nip ||
        "",
      street:
        invoiceAddress.street ||
        invoiceAddress.invoice_address ||
        "",
      zip_code:
        invoiceAddress.zipCode ||
        invoiceAddress.zip_code ||
        invoiceAddress.invoice_postcode ||
        "",
      city:
        invoiceAddress.city ||
        invoiceAddress.invoice_city ||
        "",
    });
  }, [order, isOpen, form]);

  const { mutate: updateInvoice, isPending } = useMutation({
    mutationFn: (data: InvoiceSchema) => {
      if (!order) throw new Error("Order is not defined.");
      return api.patch(`/orders/${order.id}/invoice-address`, {
        first_name: data.first_name,
        last_name: data.last_name,
        company_name: data.company_name || null,
        tax_id: data.tax_id || null,
        street: data.street,
        zip_code: data.zip_code,
        city: data.city,
      });
    },
    onSuccess: (response) => {
      toast.success("Dane do faktury zostały pomyślnie zaktualizowane.");
      onSuccess(response.data);
      onClose();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((e: any) => e.msg || String(e)).join(", ")
        : typeof detail === "string"
        ? detail
        : "Nie udało się zaktualizować danych do faktury.";
      toast.error(msg);
    },
  });

  const onSubmit = (data: InvoiceSchema) => {
    updateInvoice(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edytuj dane do faktury</DialogTitle>
          <DialogDescription>
            Zmień dane nabywcy na fakturze. Każda zmiana zostanie zapisana w historii zamówienia.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dane nabywcy
            </p>
            <p className="text-xs text-muted-foreground -mt-2">Wypełnij imię i nazwisko <strong>lub</strong> danę firmy &mdash; wystarczy jedno.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię</FormLabel>
                    <FormControl>
                      <Input placeholder="Jan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwisko</FormLabel>
                    <FormControl>
                      <Input placeholder="Kowalski" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Dane firmowe (opcjonalne)
            </p>
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa firmy</FormLabel>
                  <FormControl>
                    <Input placeholder="Firma Sp. z o.o." {...field} />
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
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Adres
            </p>
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ulica i numer</FormLabel>
                  <FormControl>
                    <Input placeholder="ul. Kwiatowa 1/2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod pocztowy</FormLabel>
                    <FormControl>
                      <Input placeholder="00-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miejscowość</FormLabel>
                    <FormControl>
                      <Input placeholder="Warszawa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
