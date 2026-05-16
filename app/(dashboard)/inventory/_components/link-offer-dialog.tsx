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
import toast from "react-hot-toast";
import api from "@/lib/api";
import { MarketplaceOfferCombobox } from "../../settings/product-erp-mappings/_components/marketplace-offer-combobox";

const formSchema = z.object({
  service_integration_id: z.coerce.number().min(1, "Wybierz integrację"),
  external_offer_id: z.string().min(1, "Wybierz ofertę"),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      external_offer_id: "",
    },
  });

  const selectedIntegrationId = form.watch("service_integration_id");

  useEffect(() => {
    if (open && integrations.length === 0) {
      api.get("/service-integrations/").then((res) => {
        setIntegrations(res.data.filter((i: any) => i.provider_type === "ALLEGRO" || i.category === "MARKETPLACE"));
      });
    }
  }, [open]);

  // Kiedy zmieniamy integrację, resetujemy wybraną ofertę
  useEffect(() => {
    form.setValue("external_offer_id", "");
  }, [selectedIntegrationId, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      await api.post(`/inventory/${productId}/channel-offers`, values);
      toast.success("Oferta została pomyślnie podpięta pod produkt.");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Nie udało się dodać powiązania.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Podepnij ofertę</DialogTitle>
          <DialogDescription>
            Wybierz konto Allegro i wybierz z listy aukcję, którą chcesz połączyć z tym produktem.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="service_integration_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konto (Integracja)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz konto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {integrations.map((i) => (
                        <SelectItem key={i.id} value={i.id.toString()}>{i.name} ({i.provider_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="external_offer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wybierz Ofertę</FormLabel>
                  <FormControl>
                    <MarketplaceOfferCombobox
                      marketplaceIntegrationId={selectedIntegrationId}
                      value={field.value}
                      onValueChange={(offerId, offerName) => field.onChange(offerId)}
                      disabled={!selectedIntegrationId}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isLoading || !form.watch("external_offer_id")}>
                {isLoading ? "Podpinanie..." : "Podepnij ofertę"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
