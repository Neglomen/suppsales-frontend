"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DeliveryMappingFormValues,
  deliveryMappingFormSchema,
} from "@/lib/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";

import { DeliveryMethodMapping } from "@/types/delivery-method-mapping";
import { ServiceIntegration } from "@/types/service-integration";
import { PackageDefinition } from "@/types/package-definition";
import { SUUS_PACKAGE_CODES } from "@/lib/courier-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";

interface DeliveryMappingFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
  mapping: DeliveryMethodMapping | null;
  courierIntegrations: ServiceIntegration[];
  packageDefinitions: PackageDefinition[];
}

export function DeliveryMappingFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  mapping,
  courierIntegrations,
  packageDefinitions,
}: DeliveryMappingFormDialogProps) {
  const form = useForm<DeliveryMappingFormValues>({
    resolver: zodResolver(deliveryMappingFormSchema),
  });

  const selectedIntegrationId = form.watch("serviceIntegration_id");

  const filteredPackages = useMemo(() => {
    const selectedIntegration = courierIntegrations.find(
      (integ) => String(integ.id) === selectedIntegrationId
    );

    if (!selectedIntegration || selectedIntegration.provider_type !== "SUUS") {
      return packageDefinitions.filter((pkg) => !pkg.courier_code);
    }

    return packageDefinitions.filter(
      (pkg) =>
        pkg.courier_code && SUUS_PACKAGE_CODES.hasOwnProperty(pkg.courier_code)
    );
  }, [selectedIntegrationId, courierIntegrations, packageDefinitions]);

  useEffect(() => {
    if (mapping) {
      form.reset({
        marketplace_delivery_method: mapping.marketplace_delivery_method,
        serviceIntegration_id: mapping.serviceIntegration_id
          ? String(mapping.serviceIntegration_id)
          : "",
        courier_service_code: mapping.courier_service_code || "",
        default_package_definition_id:
          mapping.default_package_definition_id || "NONE",
      });
    }
  }, [mapping, form]);

  // Efekt do resetowania wyboru opakowania, jeśli zmieni się kurier i wybrane opakowanie nie jest już dostępne
  useEffect(() => {
    const selectedPackageId = form.getValues("default_package_definition_id");
    if (selectedPackageId && selectedPackageId !== "NONE") {
      const isSelectedPackageVisible = filteredPackages.some(
        (p) => p.id === selectedPackageId
      );
      if (!isSelectedPackageVisible) {
        form.setValue("default_package_definition_id", "NONE");
      }
    }
  }, [filteredPackages, form]);

  const onSubmit = async (values: DeliveryMappingFormValues) => {
    if (!mapping) return;

    const payload = {
      serviceIntegration_id: parseInt(values.serviceIntegration_id, 10),
      courier_service_code: values.courier_service_code,
      default_package_definition_id:
        values.default_package_definition_id === "NONE"
          ? null
          : values.default_package_definition_id,
    };

    await toast.promise(
      api.put(`/delivery-method-mappings/${mapping.id}`, payload),
      {
        loading: "Aktualizowanie mapowania...",
        success: () => {
          onSuccess();
          setIsOpen(false);
          return "Mapowanie pomyślnie zaktualizowane.";
        },
        error: (err) => err.response?.data?.detail || "Wystąpił błąd.",
      }
    );
  };

  const sourceIntegration = mapping?.source_integration;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj mapowanie</DialogTitle>
          <DialogDescription>
            Skonfiguruj, jak system ma obsługiwać tę metodę dostawy.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-4"
          >
            <div className="p-3 rounded-md border bg-muted/50">
              <p className="text-sm font-medium text-muted-foreground">
                Metoda dostawy z marketplace
              </p>
              <div className="flex items-center gap-2 mt-1">
                {sourceIntegration?.provider_type === "ALLEGRO" && (
                  <AllegroIcon className="h-5 w-5" />
                )}
                {sourceIntegration?.provider_type === "BASELINKER" && (
                  <BaseLinkerIcon className="h-5 w-5 rounded-sm" />
                )}
                <p className="font-semibold">
                  {mapping?.marketplace_delivery_method}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="serviceIntegration_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>1. Wybierz kuriera</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz integrację kurierską..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courierIntegrations.map((integ) => (
                          <SelectItem key={integ.id} value={String(integ.id)}>
                            {integ.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courier_service_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>2. Wpisz kod usługi</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Np. SUUS_STANDARD, KEX_EXPRESS"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Kod, który identyfikuje konkretną usługę u kuriera.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_package_definition_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      3. Wybierz domyślne opakowanie (opcjonalnie)
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz opakowanie..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">Brak</SelectItem>
                        {filteredPackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name}
                            {pkg.courier_code ? `(${pkg.courier_code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zapisz mapowanie
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
