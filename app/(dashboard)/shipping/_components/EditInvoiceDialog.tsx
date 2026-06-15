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
import { Loader2, User, Building, MapPin, Hash, ShieldCheck, FileText } from "lucide-react";

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
      <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-slate-800 text-white p-0 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-primary" />
              Edytuj dane do faktury (FV)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Modyfikacja danych płatnika faktury sprzedaży. Wpłynie to na dane generowane w systemie ERP.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col"
          >
            {/* Scrollable Form Body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin">
              {/* Nabywca Section */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-slate-900 pb-2">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Osoba fizyczna</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-300">Imię</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                            <Input placeholder="Jan" {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-slate-300">Nazwisko</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                            <Input placeholder="Kowalski" {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Firma Section */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-slate-900 pb-2">
                  <Building className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Firma</span>
                </div>

                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300">Pełna nazwa firmy</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input placeholder="Firma Sp. z o.o." {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300">NIP (numer identyfikacji podatkowej)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input placeholder="np. 5361914942" {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white font-mono" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Adres Rejestracyjny Section */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-slate-900 pb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Adres rejestracyjny</span>
                </div>

                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-slate-300">Ulica i numer</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input placeholder="ul. Kwiatowa 1/2" {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="zip_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300">Kod pocztowy</FormLabel>
                          <FormControl>
                            <Input placeholder="00-000" {...field} className="bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white text-center font-mono" />
                          </FormControl>
                          <FormMessage className="text-xs text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-slate-300">Miejscowość</FormLabel>
                          <FormControl>
                            <Input placeholder="Warszawa" {...field} className="bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
                          </FormControl>
                          <FormMessage className="text-xs text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300">
                Anuluj
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md px-6">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Zapisz zmiany
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
