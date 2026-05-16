"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import toast from "react-hot-toast";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, RefreshCw } from "lucide-react";

interface ProductMappingDialogProps {
  offerId: string;
  offerName: string;
  currentMapping: any;
  sourceIntegrationId?: number;
  erpIntegrationId?: number;
  onMappingUpdated: () => void;
}

export function ProductMappingDialog({
  offerId,
  offerName,
  currentMapping,
  sourceIntegrationId,
  erpIntegrationId,
  onMappingUpdated,
}: ProductMappingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  const { data: searchResults, isLoading: isSearching } = useQuery<{ id: number; symbol: string; name: string }[]>({
    queryKey: ["erpProductSearch", erpIntegrationId, debouncedSearch],
    queryFn: async () => {
      if (!erpIntegrationId || !debouncedSearch) return [];
      const res = await api.get(`/erp-proxy/integrations/${erpIntegrationId}/products`, {
        params: { q: debouncedSearch },
      });
      return res.data;
    },
    enabled: isOpen && !!erpIntegrationId && debouncedSearch.length >= 2,
  });

  const { mutate: updateMapping, isPending: isUpdating } = useMutation({
    mutationFn: async (erpSymbol: string) => {
      if (!sourceIntegrationId || !erpIntegrationId) throw new Error("Brak ustawień integracji");
      const payload = {
        source_integration_id: sourceIntegrationId,
        erp_integration_id: erpIntegrationId,
        marketplace_offer_id: offerId,
        erp_product_symbol: erpSymbol,
      };
      
      // Jeśli mapowanie już istnieje dla tego offerId + integracji, musimy użyć PUT do nadpisania
      // Ale nie mamy tutaj mapping_id. Backend używa POST z obsługą Conflict?
      // O nie, wg backendu: jeśli istnieje to 409 Conflict. Więc jeśli currentMapping to musi być PUT z currentMapping.id.
      if (currentMapping?.id) {
        return api.put(`/product-erp-mappings/${currentMapping.id}`, payload);
      } else {
        return api.post("/product-erp-mappings", payload);
      }
    },
    onSuccess: () => {
      toast.success("Mapowanie zaktualizowane pomyślnie");
      onMappingUpdated();
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Błąd podczas zapisu mapowania");
    },
  });

  if (!sourceIntegrationId || !erpIntegrationId) {
    return (
      <Button variant="outline" size="sm" disabled className="h-7 text-xs">
        Brak integracji ERP
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="h-7 text-xs bg-muted/50 hover:bg-muted/80">
          {currentMapping ? "Zmień" : "Mapuj"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mapuj produkt do Subiekta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium text-foreground mb-1">{offerName}</p>
            <p className="text-muted-foreground text-xs">SKU (ID oferty): {offerId}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Wyszukaj towar w Subiekcie (min. 2 znaki):</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Wpisz symbol lub nazwę z ERP..."
                className="pl-8"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="border rounded-md min-h-[200px] max-h-[300px] overflow-y-auto p-2">
              {searchTerm.length < 2 ? (
                <div className="flex items-center justify-center h-full min-h-[150px] text-sm text-muted-foreground text-center px-4">
                  Wpisz przynajmniej 2 znaki, aby rozpocząć wyszukiwanie w Subiekcie powiązanym z kontem.
                </div>
              ) : isSearching ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="animate-spin text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">Szukam w ERP...</span>
                </div>
              ) : searchResults?.length === 0 ? (
                <div className="text-center p-8 text-sm text-muted-foreground">
                  Nie znaleziono produktów spełniających podane kryteria.
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults?.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md group cursor-pointer"
                      onClick={() => !isUpdating && updateMapping(item.symbol)}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="font-medium text-sm text-foreground truncate">{item.name || item.symbol}</div>
                        <div className="text-xs text-muted-foreground font-mono">Symbol: {item.symbol}</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 h-7"
                        disabled={isUpdating}
                      >
                        {isUpdating ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Wybierz"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
