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
import { Loader2, User, Building, MapPin, Phone, Mail, Box, ShieldCheck, Home } from "lucide-react";

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
      const pickupPoint = (order as any).pickup_point;
      const pointId = pickupPoint?.id || payload?.delivery?.pickupPoint?.id || payload?.delivery_point_id || "";

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
      onSuccess(response.data);
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
      <DialogContent className="sm:max-w-[550px] bg-background border border-border text-foreground p-0 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 pb-4 border-b border-border/60 bg-muted/40 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Home className="h-5 w-5 text-primary" />
              Edytuj adres dostawy
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Modyfikacja adresu dostarczenia przesyłki. Zmiany wpływają na generowanie etykiet kurierskich.
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
              {/* Odbiorca Section */}
              <div className="bg-slate-950/10 dark:bg-slate-950/40 border border-border/60 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-border/20 pb-2">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Odbiorca przesyłki</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Imię</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                            <Input placeholder="Jan" {...field} className="pl-9 bg-background border-border text-sm h-10 rounded-lg text-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Nazwisko</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                            <Input placeholder="Kowalski" {...field} className="pl-9 bg-background border-border text-sm h-10 rounded-lg text-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Nazwa firmy (opcjonalnie)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                          <Input placeholder="Firma Sp. z o.o." {...field} className="pl-9 bg-background border-border text-sm h-10 rounded-lg text-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Adres Section */}
              <div className="bg-slate-950/10 dark:bg-slate-950/40 border border-border/60 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-border/20 pb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Adres doręczenia</span>
                </div>

                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Ulica i numer domu/lokalu</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                          <Input placeholder="ul. Kwiatowa 1/2" {...field} className="pl-9 bg-background border-border text-sm h-10 rounded-lg text-foreground" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Kod pocztowy</FormLabel>
                          <FormControl>
                            <Input placeholder="00-000" {...field} className="bg-background border-border text-sm h-10 rounded-lg text-foreground text-center font-mono" />
                          </FormControl>
                          <FormMessage className="text-xs text-red-500" />
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
                          <FormLabel className="text-xs text-muted-foreground">Miejscowość</FormLabel>
                          <FormControl>
                            <Input placeholder="Warszawa" {...field} className="bg-background border-border text-sm h-10 rounded-lg text-foreground" />
                          </FormControl>
                          <FormMessage className="text-xs text-red-500" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="deliveryPointId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
                        ID Punktu odbioru (opcjonalnie)
                        <span className="text-[10px] text-muted-foreground/60 font-normal normal-case">(np. Paczkomat)</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Box className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                          <Input placeholder="np. ROT01M, DPD-1234" {...field} className="pl-9 bg-background border-border text-sm h-10 rounded-lg text-foreground font-mono uppercase" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Kontakt Section */}
              <div className="bg-slate-950/10 dark:bg-slate-950/40 border border-border/60 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary border-b border-border/20 pb-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Dane kontaktowe</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Telefon kontaktowy</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                            <Input placeholder="123-456-789" {...field} className="pl-9 bg-background border-border text-sm h-10 rounded-lg text-foreground font-mono" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Adres e-mail</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                            <Input placeholder="kontakt@example.com" {...field} className="pl-9 bg-background border-border text-sm h-10 rounded-lg text-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="p-6 border-t border-border bg-muted/40 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="border-border hover:bg-accent/10 hover:text-foreground text-muted-foreground">
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
