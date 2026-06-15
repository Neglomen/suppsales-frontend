"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { MarketplaceOrder } from "@/types/marketplace-order";
import api, { getErrorMessage } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2, User, Building, MapPin, Hash, ShieldCheck, FileText } from "lucide-react";

// === POPRAWKA: Schemat Zod używa snake_case ===
const invoiceSchema = z.object({
  company_name: z.string().optional(),
  tax_id: z.string().optional(),
  first_name: z.string().min(1, "Imię jest wymagane."),
  last_name: z.string().min(1, "Nazwisko jest wymagane."),
  street: z.string().min(1, "Ulica jest wymagana."),
  zip_code: z.string().min(1, "Kod pocztowy jest wymagany."),
  city: z.string().min(1, "Miasto jest wymagane."),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface EditInvoiceDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: MarketplaceOrder) => void;
  order: MarketplaceOrder | null;
}

export function EditInvoiceDataDialog({
  isOpen,
  onClose,
  onSuccess,
  order,
}: EditInvoiceDataDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      company_name: "",
      tax_id: "",
      first_name: "",
      last_name: "",
      street: "",
      zip_code: "",
      city: "",
    },
  });

  useEffect(() => {
    if (order && isOpen) {
      const addr = order.invoice_address || order.invoiceAddress || order.deliveryAddress;
      form.reset({
        company_name: addr?.company_name || "",
        tax_id: addr?.tax_id || "",
        first_name: addr?.first_name || "",
        last_name: addr?.last_name || "",
        street: addr?.street || "",
        zip_code: addr?.zip_code || "",
        city: addr?.city || "",
      });
    }
  }, [order, form, isOpen]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values: InvoiceFormValues) =>
      api.patch(`/orders/${order!.id}/invoice-address`, values),
    onSuccess: (response) => {
      toast.success("Dane do faktury zaktualizowane.");
      onSuccess(response.data);
      queryClient.invalidateQueries({ queryKey: ["orderDetails", order!.id] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSubmit = (values: InvoiceFormValues) => {
    mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-slate-800 text-white p-0 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-primary" />
              Edytuj dane do faktury
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Poniższe dane zostaną użyte do wygenerowania faktury sprzedaży w systemie ERP.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            {/* Scrollable Form Body */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin">
              {/* Osoba Section */}
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
                            <Input {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
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
                            <Input {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
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
                      <FormLabel className="text-xs text-slate-300">Nazwa firmy (opcjonalnie)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
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
                      <FormLabel className="text-xs text-slate-300">NIP (opcjonalnie)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                          <Input {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white font-mono" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Adres Section */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-slate-900 pb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Adres</span>
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
                          <Input {...field} className="pl-9 bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
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
                            <Input {...field} className="bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white text-center font-mono" />
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
                            <Input {...field} className="bg-slate-900/80 border-slate-800 text-sm h-10 rounded-lg text-white" />
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
