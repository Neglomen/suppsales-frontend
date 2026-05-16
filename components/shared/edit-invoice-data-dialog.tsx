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
import { Loader2 } from "lucide-react";

// === POPRAWKA: Schemat Zod używa snake_case ===
const invoiceSchema = z.object({
  company_name: z.string().optional(),
  tax_id: z.string().optional(),
  first_name: z.string(),
  last_name: z.string(),
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
    if (order) {
      const addr = order.invoice_address || order.invoiceAddress || order.deliveryAddress;
      // Używamy `snake_case` do wypełnienia formularza
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
  }, [order, form, isOpen]); // Dodajemy isOpen, aby resetować formularz przy każdym otwarciu

  const { mutate, isPending } = useMutation({
    // Backend oczekuje snake_case, więc `values` są już w dobrym formacie
    mutationFn: (values: InvoiceFormValues) =>
      api.patch(`/orders/${order!.id}/invoice-address`, values),
    onSuccess: (response) => {
      toast.success("Dane do faktury zaktualizowane.");
      onSuccess(response.data);
      queryClient.invalidateQueries({ queryKey: ["orderDetails", order!.id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSubmit = (values: InvoiceFormValues) => {
    mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj dane do faktury</DialogTitle>
          <DialogDescription>
            Poniższe dane zostaną użyte do wygenerowania faktury sprzedaży.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* Używamy pól snake_case w nazwach pól formularza */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa firmy (opcjonalnie)</FormLabel>
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
                  <FormLabel>NIP (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imię</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="street"
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
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem className="col-span-1">
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
                name="city"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Miasto</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
