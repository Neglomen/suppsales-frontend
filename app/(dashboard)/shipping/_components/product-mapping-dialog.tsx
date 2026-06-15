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
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, RefreshCw, Package, Tag, Link2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      <Button variant="outline" size="sm" disabled className="h-7 text-xs border-dashed">
        Brak integracji ERP
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={currentMapping ? "outline" : "default"} 
          size="sm" 
          className={`h-7 text-xs gap-1 transition-all ${
            currentMapping 
              ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          {currentMapping ? "Zmień powiązanie" : "Powiąż z ERP"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-slate-800 text-white overflow-hidden p-0 rounded-2xl shadow-2xl">
        <div className="p-6 pb-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Link2 className="h-5 w-5 text-primary" />
              Mapowanie produktu do ERP (Subiekt GT)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Połącz ofertę z serwisu marketplace z fizycznym kartotekowym towarem w systemie ERP.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Marketplace Item Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-300" />
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">OFERTA MARKETPLACE</p>
                <h4 className="text-sm font-semibold text-slate-100 leading-snug truncate" title={offerName}>
                  {offerName}
                </h4>
                <div className="flex items-center gap-2 pt-0.5">
                  <Badge variant="secondary" className="bg-slate-900 text-slate-400 border-slate-800 text-[10px] py-0 px-1.5 font-mono">
                    ID: {offerId}
                  </Badge>
                  {currentMapping && (
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] py-0 px-1.5">
                      Obecny symbol: {currentMapping.erp_product_symbol}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search section */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Szukaj w kartotece Subiekta
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
              <Input
                placeholder="Wpisz symbol, kod EAN lub nazwę towaru..."
                className="pl-10 h-11 bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Search results box */}
            <div className="border border-slate-800/80 rounded-xl bg-slate-950/40 overflow-hidden min-h-[200px] max-h-[280px] flex flex-col">
              {searchTerm.length < 2 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center p-6 text-slate-500">
                  <Info className="h-8 w-8 mb-2 text-slate-600" />
                  <p className="text-xs font-medium max-w-[280px] leading-relaxed">
                    Wpisz przynajmniej 2 znaki, aby przeszukać kartotekę towarów w systemie ERP.
                  </p>
                </div>
              ) : isSearching ? (
                <div className="flex flex-col items-center justify-center flex-1 p-6 text-slate-400">
                  <Loader2 className="animate-spin h-7 w-7 text-primary mb-2" />
                  <span className="text-xs">Wyszukiwanie w Subiekcie...</span>
                </div>
              ) : searchResults?.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center p-6 text-slate-500">
                  <p className="text-xs">Brak wyników spełniających podane kryteria.</p>
                </div>
              ) : (
                <div className="overflow-y-auto p-2 space-y-1 flex-1 divide-y divide-slate-900/60">
                  {searchResults?.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2.5 hover:bg-slate-850/80 active:bg-slate-850/90 rounded-lg group cursor-pointer border border-transparent hover:border-slate-800 transition-all"
                      onClick={() => !isUpdating && updateMapping(item.symbol)}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="font-medium text-xs text-slate-200 truncate group-hover:text-white transition-colors">
                          {item.name || item.symbol}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Tag className="h-3 w-3 text-slate-600" />
                          <span className="text-[10px] text-slate-500 font-mono">
                            Symbol: <strong className="text-slate-400 font-semibold">{item.symbol}</strong>
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 group-hover:scale-100 scale-95 transition-all"
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
