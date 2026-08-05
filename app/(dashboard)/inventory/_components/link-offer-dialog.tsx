"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link2, ShoppingBag, Search, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { MarketplaceOfferCombobox } from "../../settings/product-erp-mappings/_components/marketplace-offer-combobox";

const formSchema = z.object({
  service_integration_id: z.coerce.number().min(1, "Wybierz integrację"),
  external_offer_id: z.string().min(1, "Wpisz lub wybierz ofertę"),
  channel_sku: z.string().optional(),
});

interface LinkOfferDialogProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LinkOfferDialog({ productId, open, onOpenChange, onSuccess }: LinkOfferDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [manualInputMode, setManualInputMode] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service_integration_id: undefined as any,
      external_offer_id: "",
      channel_sku: "",
    },
  });

  const selectedIntegrationId = form.watch("service_integration_id");

  useEffect(() => {
    if (open) {
      api.get("/service-integrations").then((res) => {
        const activeMarketplaces = (res.data || []).filter(
          (i: any) =>
            i.provider_type === "ALLEGRO" ||
            i.provider_type === "EMPIK" ||
            i.provider_type === "BASELINKER" ||
            i.category === "MARKETPLACE"
        );
        setIntegrations(activeMarketplaces);

        // Wybierz pierwszą dostępną integrację domyślnie
        if (activeMarketplaces.length > 0 && !form.getValues("service_integration_id")) {
          form.setValue("service_integration_id", activeMarketplaces[0].id);
        }
      });
    }
  }, [open]);

  useEffect(() => {
    form.setValue("external_offer_id", "");
    form.setValue("channel_sku", "");
  }, [selectedIntegrationId, form]);

  async function onSubmit(data: any) {
    const values = data as z.infer<typeof formSchema>;
    try {
      setIsLoading(true);
      await api.post(`/inventory/${productId}/channel-offers`, {
        service_integration_id: Number(values.service_integration_id),
        external_offer_id: values.external_offer_id.trim(),
        channel_sku: values.channel_sku?.trim() || null,
      });
      toast.success("Aukcja została pomyślnie powiązana z produktem!");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Nie udało się powiązać aukcji.");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedInteg = integrations.find((i) => i.id === Number(selectedIntegrationId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Podepnij Aukcję (Allegro / Empik)</DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                Wybierz konto marketplace oraz wyszukaj ofertę po tytule, ID lub symbolu SKU.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Field: Integration Selection */}
            <FormField
              control={form.control}
              name="service_integration_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">1. Wybierz Konto (Integrację)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Wybierz konto Allegro / Empik..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {integrations.map((i) => (
                        <SelectItem key={i.id} value={i.id.toString()}>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                            <span className="font-medium">{i.name}</span>
                            <Badge variant="outline" className="text-[10px] ml-1">
                              {i.provider_type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field: Offer Selection */}
            <FormField
              control={form.control}
              name="external_offer_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold">2. Wybierz lub Wpisz Aukcję</FormLabel>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setManualInputMode(!manualInputMode)}
                      className="text-[11px] h-auto p-0 text-primary"
                    >
                      {manualInputMode ? "Wyszukaj z listy" : "Wpisz ID ręcznie"}
                    </Button>
                  </div>

                  <FormControl>
                    {manualInputMode ? (
                      <Input
                        placeholder="Wpisz bezpośrednio ID aukcji (np. 18092225226)..."
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-11 font-mono text-sm"
                      />
                    ) : (
                      <MarketplaceOfferCombobox
                        marketplaceIntegrationId={Number(selectedIntegrationId)}
                        value={field.value}
                        onValueChange={(offerId) => field.onChange(offerId)}
                        disabled={!selectedIntegrationId}
                        placeholder={
                          selectedInteg
                            ? `Wyszukaj na ${selectedInteg.name} (${selectedInteg.provider_type})...`
                            : "Najpierw wybierz konto..."
                        }
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Field: Channel SKU */}
            {manualInputMode && (
              <FormField
                control={form.control}
                name="channel_sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Symbol Oferty Sprzedawcy (Shop SKU - opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="np. 17863365459"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-10 font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !form.watch("external_offer_id")}
                className="bg-primary hover:bg-primary/90 font-medium"
              >
                {isLoading ? "Podpinanie..." : "Podepnij Aukcję z Produktem"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
