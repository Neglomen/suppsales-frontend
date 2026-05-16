"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SubiektProductCombobox } from "./subiekt-product-combobox";
import { ProductErpMapping } from "@/types/product-erp-mapping";
import { MarketplaceOffer } from "@/types/marketplace-offer";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { Save, Trash2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InlineMappingCellProps {
  offer: MarketplaceOffer;
  mapping: ProductErpMapping | undefined;
  erpIntegrationId: number;
  sourceIntegrationId: number;
}

export function InlineMappingCell({
  offer,
  mapping,
  erpIntegrationId,
  sourceIntegrationId,
}: InlineMappingCellProps) {
  const queryClient = useQueryClient();
  const [symbol, setSymbol] = useState(mapping?.erp_product_symbol || "");
  const isDirty = symbol !== (mapping?.erp_product_symbol || "");

  useEffect(() => {
    setSymbol(mapping?.erp_product_symbol || "");
  }, [mapping]);

  const { mutate: saveMapping, isPending: isSaving } = useMutation({
    mutationFn: (newSymbol: string) => {
      const payload = {
        marketplace_offer_id: offer.id,
        erp_product_symbol: newSymbol.toUpperCase(),
        source_integration_id: sourceIntegrationId,
        erp_integration_id: erpIntegrationId,
        last_known_offer_name: offer.name,
      };

      const updatePayload = {
        erp_product_symbol: newSymbol.toUpperCase(),
        last_known_offer_name: offer.name,
      };

      return mapping
        ? api.put(`/product-erp-mappings/${mapping.id}`, updatePayload)
        : api.post("/product-erp-mappings", payload);
    },
    onSuccess: () => {
      toast.success("Mapowanie zapisane.");
      // Odświeżamy oba zapytania: o oferty i o mapowania
      queryClient.invalidateQueries({ queryKey: ["marketplaceOffers"] });
      queryClient.invalidateQueries({ queryKey: ["productErpMappings"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { mutate: deleteMapping, isPending: isDeleting } = useMutation({
    mutationFn: () => api.delete(`/product-erp-mappings/${mapping!.id}`),
    onSuccess: () => {
      toast.success("Mapowanie usunięte.");
      setSymbol(""); // Wyczyść pole po usunięciu
      queryClient.invalidateQueries({ queryKey: ["marketplaceOffers"] });
      queryClient.invalidateQueries({ queryKey: ["productErpMappings"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (!erpIntegrationId || !sourceIntegrationId)
    return (
      <div className="text-xs text-muted-foreground">
        Wybierz obie integracje.
      </div>
    );

  return (
    <div className="flex w-full max-w-sm items-center gap-2">
      <div className="flex-grow">
        <SubiektProductCombobox
          erpIntegrationId={erpIntegrationId}
          value={symbol}
          onValueChange={setSymbol}
        />
      </div>
      {(isDirty || mapping) && (
        <div className="flex-shrink-0 flex items-center">
          {isDirty && (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 hover:text-primary transition-colors"
              onClick={() => saveMapping(symbol)}
              disabled={isSaving}
              title="Zapisz zmiany"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          )}
          {mapping && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-destructive transition-colors"
                  disabled={isDeleting}
                  title="Usuń mapowanie"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Czy na pewno usunąć to mapowanie?
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMapping()}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Tak, usuń
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );
}
