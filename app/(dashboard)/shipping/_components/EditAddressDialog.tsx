"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/api";
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

// Minimalny interfejs wymagany przez dialog
export interface OrderLikeForAddress {
  id: string;
  deliveryAddress?: {
    firstName?: string | null;
    lastName?: string | null;
    street?: string | null;
    zipCode?: string | null;
    city?: string | null;
    phoneNumber?: string | null;
  } | null;
  delivery_address?: {
    first_name?: string | null;
    last_name?: string | null;
    street?: string | null;
    zip_code?: string | null;
    city?: string | null;
    phone_number?: string | null;
  } | null;
  buyerPhoneNumber?: string | null;
  buyer_phone_number?: string | null;
  buyerEmail?: string | null;
  buyer_email?: string | null;
  details_payload?: any;
}

interface EditAddressDialogProps {
  order: OrderLikeForAddress | null;
  courierProvider?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
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

  useEffect(() => {
    if (order && isOpen) {
      const da = (order as any).delivery_address;
      const address = (order as any).deliveryAddress;
      const payload = (order as any).details_payload || {};
      const pointId = payload?.delivery?.pickupPoint?.id || payload?.delivery_point_id || "";

      form.reset({
        firstName: da?.first_name || address?.firstName || payload.delivery?.address?.firstName || payload.delivery_fullname?.split(" ")[0] || "",
        lastName: da?.last_name || address?.lastName || payload.delivery?.address?.lastName || payload.delivery_fullname?.split(" ").slice(1).join(" ") || "",
        companyName: da?.company_name || address?.companyName || "",
        street: da?.street || address?.street || payload.delivery?.address?.street || payload.delivery_address || "",
        postalCode: da?.zip_code || address?.zipCode || payload.delivery?.address?.zipCode || payload.delivery_postcode || "",
        city: da?.city || address?.city || payload.delivery?.address?.city || payload.delivery_city || "",
        phone: da?.phone_number || address?.phoneNumber || (order as any).buyerPhoneNumber || (order as any).buyer_phone_number || payload.phone || "",
        email: (order as any).buyerEmail || (order as any).buyer_email || "",
        deliveryPointId: pointId,
      });
    }
  }, [order, isOpen, form]);

  const { mutate: updateAddress, isPending } = useMutation({
    mutationFn: (data: AddressSchema) => {
      if (!order) throw new Error("Order is not defined.");
      // Backend expects: name, street, postal_code, city, phone, email
      const name = data.companyName?.trim()
        ? data.companyName.trim()
        : `${data.firstName || ""} ${data.lastName || ""}`.trim();
      return api.patch(`/orders/${order.id}/delivery-address`, {
        name,
        street: data.street,
        postal_code: data.postalCode,
        city: data.city,
        phone: data.phone,
        email: data.email || null,
        delivery_point_id: data.deliveryPointId || null,
      });
    },
    onSuccess: (response) => {
      toast.success("Adres został pomyślnie zaktualizowany.");
      onSuccess(response.data); // Przekazujemy zaktualizowane dane zamówienia
      onClose();
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((e: any) => e.msg || String(e)).join(", ")
        : typeof detail === "string"
        ? detail
        : "Nie udało się zaktualizować adresu.";
      toast.error(msg);
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Odbiorca</p>
            <p className="text-xs text-muted-foreground -mt-2">Wypełnij imię i nazwisko <strong>lub</strong> nazwę firmy &mdash; wystarczy jedno.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
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
                name="lastName"
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
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa firmy <span className="text-muted-foreground font-normal">(opcjonalne)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Firma Sp. z o.o." {...field} />
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
            <FormField
              control={form.control}
              name="deliveryPointId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Punkt odbioru (ID) <span className="text-muted-foreground font-normal">(opcjonalne)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="np. ROT01M, DPD-1234" {...field} className="font-mono uppercase" />
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
