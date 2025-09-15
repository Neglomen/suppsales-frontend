"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { MarketplaceOrder } from "@/types/marketplace-order";
import {
  getAddressValidator,
  AddressSchema,
} from "@/lib/validators/address-validator";

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

interface EditAddressDialogProps {
  order: MarketplaceOrder | null;
  courierProvider?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: MarketplaceOrder) => void;
}

export function EditAddressDialog({
  order,
  courierProvider,
  isOpen,
  onClose,
  onSuccess,
}: EditAddressDialogProps) {
  const addressValidator = getAddressValidator(courierProvider);

  const form = useForm<AddressSchema>({
    resolver: zodResolver(addressValidator),
    mode: "onChange",
  });

  // Uproszczony `useEffect` bazujący na ustandaryzowanych danych
  useEffect(() => {
    if (order && isOpen) {
      const address = order.deliveryAddress; // <-- Poprawka
      const recipientName = `${address?.firstName || ""} ${
        address?.lastName || ""
      }`.trim();

      form.reset({
        name: recipientName,
        street: address?.street || "",
        postalCode: address?.zipCode || "", // <-- Poprawka
        city: address?.city || "",
        phone: address?.phoneNumber || order.buyerPhoneNumber || "", // <-- Poprawka
        email: order.buyerEmail || "", // <-- Poprawka
      });
    }
  }, [order, isOpen, form]);

  // Mutacja z prawdziwym wywołaniem API
  const { mutate: updateAddress, isPending } = useMutation({
    mutationFn: (data: AddressSchema) => {
      if (!order) throw new Error("Order is not defined.");
      // Używamy nowego endpointu PATCH
      return api.patch(`/orders/${order.id}/delivery-address`, data);
    },
    onSuccess: (response) => {
      toast.success("Adres został pomyślnie zaktualizowany.");
      onSuccess(response.data); // Przekazujemy zaktualizowane dane zamówienia
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || "Nie udało się zaktualizować adresu."
      );
    },
  });

  const onSubmit = (data: AddressSchema) => {
    updateAddress(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj adres dostawy</DialogTitle>
          <DialogDescription>
            Wprowadź poprawne dane i zapisz zmiany.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię i nazwisko / Nazwa firmy</FormLabel>
                  <FormControl>
                    <Input placeholder="Jan Kowalski" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                name="postalCode"
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
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon kontaktowy</FormLabel>
                  <FormControl>
                    <Input placeholder="123-456-789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres e-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="kontakt@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
