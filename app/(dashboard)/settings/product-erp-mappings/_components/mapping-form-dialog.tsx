"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import * as z from "zod";
import { useEffect } from "react";

import { ProductErpMapping } from "@/types/product-erp-mapping";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { MarketplaceOfferCombobox } from "./marketplace-offer-combobox";
import { SubiektProductCombobox } from "./subiekt-product-combobox";

// === POPRAWKA: Schemat Zod używa `snake_case` zgodnie z API ===
const formSchema = z.object({
  source_integration_id: z.string().min(1, "Wybierz integrację marketplace."),
  erp_integration_id: z.string().min(1, "Wybierz integrację ERP."),
  marketplace_offer_id: z.string().min(1, "Wybierz lub wpisz ID oferty."),
  erp_product_symbol: z.string().min(1, "Wyszukaj lub wpisz symbol produktu."),
  last_known_offer_name: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MappingFormDialogProps {
  mapping: ProductErpMapping | null;
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source_integration_id: "",
      erp_integration_id: "",
      marketplace_offer_id: "",
      erp_product_symbol: "",
      last_known_offer_name: "",
    },
  });

  const sourceIntegrationId = form.watch("source_integration_id");
  const erpIntegrationId = form.watch("erp_integration_id");

  useEffect(() => {
    if (isOpen) {
      form.reset(
        isEditMode && mapping
          ? {
              source_integration_id: String(mapping.source_integration_id),
              erp_integration_id: String(mapping.erp_integration_id),
              marketplace_offer_id: mapping.marketplace_offer_id,
              erp_product_symbol: mapping.erp_product_symbol,
              last_known_offer_name: mapping.last_known_offer_name || "",
            }
          : {
              source_integration_id: "",
              erp_integration_id: "",
              marketplace_offer_id: "",
              erp_product_symbol: "",
              last_known_offer_name: "",
            }
      );
    }
  }, [mapping, isEditMode, form, isOpen]);

  const { data: marketplaceIntegrations, isLoading: marketplaceLoading } =
    useQuery<ServiceIntegration[]>({
      queryKey: ["serviceIntegrations", { category: "MARKETPLACE" }],
      queryFn: async () =>
        (await api.get("/service-integrations?category=MARKETPLACE")).data,
    });

  const { data: erpIntegrations, isLoading: erpLoading } = useQuery<
    ServiceIntegration[]
  >({
    queryKey: ["serviceIntegrations", { category: "ERP" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=ERP")).data,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) => {
      // W trybie edycji wysyłamy tylko te pola, które można zmieniać
      if (isEditMode) {
        const updatePayload = {
          erp_product_symbol: data.erp_product_symbol,
          last_known_offer_name: data.last_known_offer_name,
        };
        return api.put(`/product-erp-mappings/${mapping!.id}`, updatePayload);
      }

      // W trybie tworzenia wysyłamy pełny, jawnie zdefiniowany obiekt
      const createPayload = {
        marketplace_offer_id: data.marketplace_offer_id,
        erp_product_symbol: data.erp_product_symbol,
        source_integration_id: parseInt(data.source_integration_id),
        erp_integration_id: parseInt(data.erp_integration_id),
        last_known_offer_name: data.last_known_offer_name,
      };
      return api.post("/product-erp-mappings", createPayload);
    },
    onSuccess: () => {
      toast.success(
        `Mapowanie zostało ${isEditMode ? "zaktualizowane" : "utworzone"}.`
      );
      queryClient.invalidateQueries({ queryKey: ["productErpMappings"] });
      onClose();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });

  const onSubmit = (data: FormValues) => {
    // console.log("Dane wysyłane do API:", data); // Możesz odkomentować do debugowania
    mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edytuj mapowanie" : "Dodaj nowe mapowanie"}
          </DialogTitle>
          <DialogDescription>
            Powiąż ofertę z marketplace z produktem w systemie ERP.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_integration_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketplace</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={marketplaceLoading || isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {marketplaceIntegrations?.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
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
                name="erp_integration_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System ERP</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={erpLoading || isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {erpIntegrations?.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="marketplace_offer_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Oferta Marketplace</FormLabel>
                  <MarketplaceOfferCombobox
                    marketplaceIntegrationId={parseInt(sourceIntegrationId)}
                    value={field.value}
                    onValueChange={(offerId, offerName) => {
                      field.onChange(offerId);
                      form.setValue("last_known_offer_name", offerName);
                    }}
                    disabled={!sourceIntegrationId || isEditMode}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="erp_product_symbol"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Symbol produktu w ERP</FormLabel>
                  <SubiektProductCombobox
                    erpIntegrationId={parseInt(erpIntegrationId)}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!erpIntegrationId}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
