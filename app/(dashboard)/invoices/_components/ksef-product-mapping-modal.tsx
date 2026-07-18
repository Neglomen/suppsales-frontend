"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  missingProducts: { name: string; invoices: { id: string; num: string }[] }[];
  failedInvoices: { id: string; num: string }[];
  onRetry: (invoiceIds: string[]) => void;
}

// Pojedynczy wiersz mapowania z Comboboxem
function ProductMappingRow({ 
  ksefName, 
  invoices,
  integrationId,
  selectedSymbol,
  onSelect 
}: { 
  ksefName: string;
  invoices: { id: string; num: string }[];
  integrationId: number;
  selectedSymbol: string | null;
  onSelect: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["erp-products", integrationId, debouncedSearch],
    queryFn: async () => {
      const res = await api.get(`/erp-proxy/integrations/${integrationId}/products`, {
        params: { q: debouncedSearch || undefined }
      });
      return res.data as { id: number; symbol: string; name: string }[];
    },
    enabled: open && !!integrationId,
  });

  return (
    <div className="flex items-center justify-between p-3 border rounded-md gap-4 bg-card/50">
      <div className="flex-1 overflow-hidden">
        <div className="font-medium text-sm break-words">{ksefName}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate" title={invoices.map(i => i.num).join(", ")}>
          FV: {invoices.map(i => i.num).join(", ")}
        </div>
      </div>
      <div className="flex-1 max-w-[300px]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {selectedSymbol ? (
                <span className="truncate">{selectedSymbol}</span>
              ) : (
                <span className="text-muted-foreground">Wybierz produkt...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Szukaj w Subiekcie..." 
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    "Nie znaleziono produktów."
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {products?.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.symbol}
                      onSelect={(currentValue) => {
                        onSelect(product.symbol);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedSymbol === product.symbol ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold">{product.symbol}</span>
                        <span className="text-xs text-muted-foreground truncate">{product.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function KsefProductMappingModal({
  isOpen,
  onClose,
  missingProducts,
  failedInvoices,
  onRetry
}: Props) {
  // Mapowanie: Nazwa KSeF -> Symbol Subiekta
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [activeInvoiceIds, setActiveInvoiceIds] = useState<Set<string>>(new Set());

  // Reset mapowań po otwarciu
  useEffect(() => {
    if (isOpen) {
      setMappings({});
      setActiveInvoiceIds(new Set(failedInvoices.map(i => i.id)));
    }
  }, [isOpen, failedInvoices]);

  // Pobierz ID integracji Subiekta
  const { data: subiektIntegration } = useQuery({
    queryKey: ["subiekt-integration"],
    queryFn: async () => {
      const res = await api.get("/service-integrations", { params: { category: "ERP" } });
      return (res.data as any[]).find((i) => i.provider_type === "SUBIEKT_GT");
    },
    enabled: isOpen,
  });

  const integrationId = subiektIntegration?.id;

  // Zapisywanie mapowań
  const saveMappingsMutation = useMutation({
    mutationFn: async () => {
      if (!integrationId) throw new Error("Brak integracji Subiekta.");
      
      // Pobierz aktualną konfigurację
      const configRes = await api.get(`/erp-proxy/integrations/${integrationId}/mappings-config`);
      const currentConfig = configRes.data;

      // Zaktualizuj product_mappings
      const newConfig = {
        ...currentConfig,
        product_mappings: {
          ...(currentConfig.product_mappings || {}),
          ...mappings,
        }
      };

      // Zapisz nową konfigurację
      await api.post(`/erp-proxy/integrations/${integrationId}/mappings-config`, newConfig);
    },
    onSuccess: () => {
      toast.success("Zapisano mapowania!");
      onClose();
      // Ponów eksport tylko dla aktywnych faktur
      onRetry(Array.from(activeInvoiceIds));
    },
    onError: (err: any) => {
      toast.error(`Błąd zapisu mapowań: ${err.message || "Nieznany błąd"}`);
    }
  });

  const activeProducts = missingProducts.filter(p => p.invoices.some(inv => activeInvoiceIds.has(inv.id)));
  const isComplete = activeProducts.length > 0 && activeProducts.every((p) => mappings[p.name]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mapowanie nierozpoznanych towarów</DialogTitle>
          <DialogDescription>
            Niektóre towary z faktur KSeF nie zostały odnalezione w Twoim Subiekcie GT. 
            Przypisz je ręcznie, aby system zapamiętał Twój wybór i wznowił eksport.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
          {failedInvoices.length > 0 && (
            <div className="bg-muted/30 p-3 rounded-md border text-sm">
              <p className="font-medium mb-2 text-muted-foreground">Faktury do ponowienia:</p>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                {failedInvoices.map(inv => (
                  <label key={inv.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={activeInvoiceIds.has(inv.id)} 
                      onChange={(e) => {
                        const newSet = new Set(activeInvoiceIds);
                        if (e.target.checked) newSet.add(inv.id);
                        else newSet.delete(inv.id);
                        setActiveInvoiceIds(newSet);
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className={cn(activeInvoiceIds.has(inv.id) ? "text-foreground" : "text-muted-foreground line-through")}>
                      {inv.num}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!integrationId ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeProducts.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground text-sm">
              Brak nierozpoznanych towarów dla aktualnie zaznaczonych faktur. Możesz kontynuować, aby ponowić eksport.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Nierozpoznane towary ({activeProducts.length}):</p>
              {activeProducts.map((product) => (
                <ProductMappingRow
                  key={product.name}
                  ksefName={product.name}
                  invoices={product.invoices}
                  integrationId={integrationId}
                  selectedSymbol={mappings[product.name] || null}
                  onSelect={(symbol) => setMappings(prev => ({ ...prev, [product.name]: symbol }))}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saveMappingsMutation.isPending}>
            Anuluj
          </Button>
          <Button 
            onClick={() => {
              if (activeProducts.length > 0) {
                saveMappingsMutation.mutate();
              } else {
                // Jeśli nie ma produktów do zmapowania (bo odznaczono wszystkie FV lub produkty nie wymagają mapowania)
                // po prostu ponawiamy
                onClose();
                onRetry(Array.from(activeInvoiceIds));
              }
            }} 
            disabled={(!isComplete && activeProducts.length > 0) || activeInvoiceIds.size === 0 || saveMappingsMutation.isPending}
            className="min-w-[140px]"
          >
            {saveMappingsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Zapisz i ponów eksport"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
