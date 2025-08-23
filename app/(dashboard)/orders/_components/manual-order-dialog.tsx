// src/app/(dashboard)/orders/_components/manual-order-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ManualOrderSchema, ManualOrderSchemaType } from "@/lib/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";

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
import { Separator } from "@/components/ui/separator";
import { Trash2, PlusCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface ManualOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
}

const AddressFields = ({ prefix }: { prefix: "delivery_address" }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      name={`${prefix}.first_name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Imię *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.last_name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwisko *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.street`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Ulica i numer *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.postal_code`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Kod pocztowy *</FormLabel>
          <FormControl>
            <Input placeholder="00-000" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.city`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Miasto *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.phone_number`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Numer telefonu *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

const PickupPointFields = ({ prefix }: { prefix: "pickup_point" }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      name={`${prefix}.point_id`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>ID Punktu Odbioru *</FormLabel>
          <FormControl>
            <Input placeholder="np. APM-123" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa punktu *</FormLabel>
          <FormControl>
            <Input placeholder="np. Paczkomat WAW01A" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.street`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Ulica i numer *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.postal_code`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Kod pocztowy *</FormLabel>
          <FormControl>
            <Input placeholder="00-000" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.city`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Miasto *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.description`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Opis (np. obok sklepu)</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

const InvoiceFields = ({ prefix }: { prefix: "invoice_address" }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      name={`${prefix}.company_name`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Nazwa firmy</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.first_name`}
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
      name={`${prefix}.last_name`}
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
    <FormField
      name={`${prefix}.tax_id`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>NIP</FormLabel>
          <FormControl>
            <Input placeholder="123-456-78-90" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.street`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Ulica i numer *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.postal_code`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Kod pocztowy *</FormLabel>
          <FormControl>
            <Input placeholder="00-000" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.city`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Miasto *</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
);

export function ManualOrderDialog({
  isOpen,
  setIsOpen,
  onSuccess,
}: ManualOrderDialogProps) {
  const methods = useForm<ManualOrderSchemaType>({
    resolver: zodResolver(ManualOrderSchema),
    defaultValues: {
      reference_number: "",
      buyer_login: "",
      buyer_email: "",
      line_items: [{ name: "", quantity: 1, price: 0.01 }],
      deliveryType: "address",
      delivery_address: {
        first_name: "",
        last_name: "",
        street: "",
        city: "",
        postal_code: "",
        phone_number: "",
        country: "Polska",
      },
      has_invoice_address: false,
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "line_items",
  });
  const watchDeliveryType = methods.watch("deliveryType");
  const watchHasInvoice = methods.watch("has_invoice_address");

  // Efekty do zarządzania stanem warunkowych pól formularza
  useEffect(() => {
    if (watchDeliveryType === "address") {
      methods.setValue("pickup_point", undefined);
      if (!methods.getValues("delivery_address")) {
        methods.setValue("delivery_address", {
          first_name: "",
          last_name: "",
          street: "",
          city: "",
          postal_code: "",
          phone_number: "",
          country: "Polska",
        });
      }
    } else if (watchDeliveryType === "pickup_point") {
      methods.setValue("delivery_address", undefined);
      if (!methods.getValues("pickup_point")) {
        methods.setValue("pickup_point", {
          point_id: "",
          name: "",
          street: "",
          city: "",
          postal_code: "",
          description: "",
        });
      }
    }
  }, [watchDeliveryType, methods]);

  useEffect(() => {
    if (!watchHasInvoice) {
      methods.setValue("invoice_address", undefined);
    } else {
      if (!methods.getValues("invoice_address")) {
        methods.setValue("invoice_address", {
          company_name: "",
          first_name: "",
          last_name: "",
          tax_id: "",
          street: "",
          city: "",
          postal_code: "",
          country: "Polska",
        });
      }
    }
  }, [watchHasInvoice, methods]);

  const onSubmit = async (values: ManualOrderSchemaType) => {
    const payload = { ...values };
    if (values.deliveryType === "address") {
      payload.pickup_point = undefined;
    } else {
      payload.delivery_address = undefined;
    }
    if (!values.has_invoice_address) {
      payload.invoice_address = undefined;
    }
    // @ts-ignore
    delete payload.deliveryType;

    await toast.promise(api.post("/orders/manual", payload), {
      loading: "Dodawanie zamówienia...",
      success: () => {
        onSuccess();
        setIsOpen(false);
        methods.reset();
        return "Zamówienie dodane pomyślnie!";
      },
      error: (err: any) =>
        err.response?.data?.detail || "Nie udało się dodać zamówienia.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Dodaj nowe zamówienie ręcznie</DialogTitle>
          <DialogDescription>
            Wprowadź wszystkie dane zamówienia. Pola oznaczone * są wymagane.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="space-y-6 max-h-[75vh] overflow-y-auto p-1 pr-4 border-t"
          >
            <div className="pt-4">
              <h3 className="text-lg font-semibold">Dane Kupującego</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  name="buyer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="buyer_login"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login (opcjonalnie)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Separator />

            <FormField
              name="deliveryType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Typ Dostawy *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="address" />
                        </FormControl>
                        <FormLabel className="font-normal">Adres</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="pickup_point" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Punkt odbioru
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchDeliveryType === "address" && (
              <AddressFields prefix="delivery_address" />
            )}
            {watchDeliveryType === "pickup_point" && (
              <PickupPointFields prefix="pickup_point" />
            )}

            <Separator />
            <FormField
              name="has_invoice_address"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Chcę otrzymać fakturę (inne dane)</FormLabel>
                </FormItem>
              )}
            />
            {watchHasInvoice && (
              <>
                <h3 className="text-lg font-semibold pt-4">Dane do Faktury</h3>
                <InvoiceFields prefix="invoice_address" />
              </>
            )}
            <Separator />
            <FormField
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uwagi do zamówienia</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="np. proszę o kontakt przed dostawą"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <h3 className="text-lg font-semibold">Produkty *</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  name={`line_items.${index}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Nazwa</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`line_items.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormLabel>Ilość</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`line_items.${index}.price`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormLabel>Cena (szt.)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0.01)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  {" "}
                  <Trash2 className="h-4 w-4 text-destructive" />{" "}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", quantity: 1, price: 0.01 })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Dodaj produkt
            </Button>
          </form>
        </FormProvider>
        <DialogFooter className="pt-6 sm:justify-end border-t mt-6">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Anuluj
          </Button>
          <Button
            onClick={methods.handleSubmit(onSubmit)}
            disabled={methods.formState.isSubmitting}
          >
            {methods.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Zapisz Zamówienie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
