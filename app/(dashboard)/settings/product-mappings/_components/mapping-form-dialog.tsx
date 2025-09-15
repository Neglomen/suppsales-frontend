"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

import {
  ProductSupplierMappingFormValues,
  productSupplierMappingSchema,
} from "@/lib/zod";
import { ProductSupplierMapping } from "@/types/product-supplier-mapping";
import { ServiceIntegration } from "@/types/service-integration";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

interface MappingFormDialogProps {
  mapping: ProductSupplierMapping | null; // null dla tworzenia, obiekt dla edycji
  isOpen: boolean;
  onClose: () => void;
}

export function MappingFormDialog({
  mapping,
  isOpen,
  onClose,
}: MappingFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!mapping;

  const form = useForm<ProductSupplierMappingFormValues>({
    resolver: zodResolver(productSupplierMappingSchema),
    defaultValues: {
      marketplace_offer_id: "",
      supplierIntegrationId: "",
      supplierProductIndex: "",
    },
  });

  // Wypełnij formularz danymi, jeśli jesteśmy w trybie edycji
  useEffect(() => {
    if (isEditMode && mapping) {
      form.reset({
        marketplace_offer_id: mapping.marketplace_offer_id,
        supplierIntegrationId: String(mapping.supplierIntegrationId),
        supplierProductIndex: mapping.supplierProductIndex,
      });
    } else {
      form.reset();
    }
  }, [mapping, isEditMode, form]);

  const {
    data: suppliers,
    isLoading: areSuppliersLoading,
    isError,
    error,
  } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  // Diagnostyczny console.log
  console.log({ areSuppliersLoading, isError, error, suppliers });

  const { mutate: createMapping, isPending: isCreating } = useMutation({
    mutationFn: (data: ProductSupplierMappingFormValues) =>
      api.post("/product-supplier-mappings", data),
    onSuccess: () => {
      toast.success("Mapowanie zostało utworzone.");
      queryClient.invalidateQueries({ queryKey: ["productMappings"] });
      onClose();
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Nie udało się utworzyć mapowania."
      ),
  });

  const { mutate: updateMapping, isPending: isUpdating } = useMutation({
    mutationFn: (data: ProductSupplierMappingFormValues) =>
      api.put(`/product-supplier-mappings/${mapping!.id}`, data),
    onSuccess: () => {
      toast.success("Mapowanie zostało zaktualizowane.");
      queryClient.invalidateQueries({ queryKey: ["productMappings"] });
      onClose();
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Nie udało się zaktualizować mapowania."
      ),
  });

  const onSubmit = (data: ProductSupplierMappingFormValues) => {
    if (isEditMode) {
      updateMapping(data);
    } else {
      createMapping(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edytuj mapowanie" : "Dodaj nowe mapowanie"}
          </DialogTitle>
          <DialogDescription>
            Powiąż ofertę z marketplace z indeksem produktu w hurtowni.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplierIntegrationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hurtownia</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={areSuppliersLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz hurtownię..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* ### START ZMIANY: Lepszy UX ładowania ### */}
                      {areSuppliersLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Ładowanie...
                        </div>
                      ) : isError ? (
                        <div className="p-4 text-center text-sm text-destructive">
                          Błąd ładowania hurtowni.
                        </div>
                      ) : (
                        suppliers?.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))
                      )}
                      {/* ### KONIEC ZMIANY ### */}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marketplace_offer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Oferty Marketplace</FormLabel>
                  <FormControl>
                    <Input placeholder="np. ID oferty Allegro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierProductIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indeks produktu w hurtowni</FormLabel>
                  <FormControl>
                    <Input placeholder="np. kod produktu AB" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zapisz
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
