"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/api";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSearchCombobox } from "./ProductSearchCombobox";
import { Separator } from "@/components/ui/separator";

// --- Typy ---
interface PaymentForm {
  id: number;
  name: string;
}

interface ServiceMappings {
  delivery_prepaid: string;
  delivery_cod: string;
  additional_services: Record<string, string>;
}

interface MappingsConfig {
  payment_type_mappings: Record<string, string>;
  service_mappings: ServiceMappings;
  product_mappings: Record<string, string>;
  distributed_costs_keywords: string[];
}

interface SubiektMappingsTabProps {
  integrationId: number;
}

// --- Komponent Główny ---
export function SubiektMappingsTab({ integrationId }: SubiektMappingsTabProps) {
  const queryClient = useQueryClient();
  const isIdValid = typeof integrationId === "number" && !isNaN(integrationId) && integrationId > 0;

  const { data: currentConfig, isLoading: configLoading, isError: configError } = useQuery<MappingsConfig>({
    queryKey: ["subiektMappingsConfig", integrationId],
    queryFn: async () => {
      if (!isIdValid) throw new Error("Invalid integration ID");
      const response = await api.get(`/erp-proxy/integrations/${integrationId}/mappings-config`);
      // Zapewniamy domyślne struktury, jeśli backend jeszcze ich nie ma
      return {
        payment_type_mappings: response.data.payment_type_mappings || {},
        service_mappings: response.data.service_mappings || { delivery_prepaid: "", delivery_cod: "", additional_services: {} },
        product_mappings: response.data.product_mappings || {},
        distributed_costs_keywords: response.data.distributed_costs_keywords || []
      } as MappingsConfig;
    },
    enabled: isIdValid,
  });

  const { data: paymentForms, isLoading: paymentFormsLoading } = useQuery<PaymentForm[]>({
    queryKey: ["subiektPaymentForms", integrationId],
    queryFn: async () => {
      const response = await api.get(`/erp-proxy/integrations/${integrationId}/payment-forms`);
      return response.data;
    },
    enabled: isIdValid,
  });

  // Mutacja do zapisywania konfiguracji
  const saveConfigMutation = useMutation({
    mutationFn: async (updatedConfig: MappingsConfig) => {
      await api.post(`/erp-proxy/integrations/${integrationId}/mappings-config`, updatedConfig);
    },
    onSuccess: () => {
      toast.success("Konfiguracja została zapisana.");
      queryClient.invalidateQueries({ queryKey: ["subiektMappingsConfig", integrationId] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  if (configError) {
    return (
      <div className="text-destructive p-4 border border-destructive/20 rounded-md bg-destructive/5 mt-4">
        Wystąpił błąd podczas ładowania konfiguracji. Sprawdź połączenie z agentem Subiekta GT.
      </div>
    );
  }

  if (configLoading || paymentFormsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentConfig) return null;

  return (
    <div className="space-y-8 mt-4 pb-12">
      <SectionProductMappings 
        integrationId={integrationId} 
        currentConfig={currentConfig} 
        onSave={(newMappings) => saveConfigMutation.mutate({ ...currentConfig, product_mappings: newMappings })} 
        isSaving={saveConfigMutation.isPending} 
      />
      
      <SectionDistributedCosts 
        currentConfig={currentConfig} 
        onSave={(newKeywords) => saveConfigMutation.mutate({ ...currentConfig, distributed_costs_keywords: newKeywords })} 
        isSaving={saveConfigMutation.isPending} 
      />
      
      <SectionPaymentAndServiceMappings 
        paymentForms={paymentForms || []} 
        currentConfig={currentConfig} 
        onSave={(newPayment, newService) => saveConfigMutation.mutate({ 
          ...currentConfig, 
          payment_type_mappings: newPayment, 
          service_mappings: newService 
        })} 
        isSaving={saveConfigMutation.isPending} 
      />
    </div>
  );
}

// ============================================================================
// SEKCJA 1: MAPOWANIA TOWARÓW
// ============================================================================
function SectionProductMappings({ 
  integrationId, 
  currentConfig, 
  onSave, 
  isSaving 
}: { 
  integrationId: number; 
  currentConfig: MappingsConfig; 
  onSave: (m: Record<string, string>) => void; 
  isSaving: boolean;
}) {
  const [items, setItems] = useState<{ ksefName: string; symbol: string }[]>([]);

  // Synchronizuj lokalny stan przy zmianie z serwera
  useEffect(() => {
    const list = Object.entries(currentConfig.product_mappings).map(([k, v]) => ({ ksefName: k, symbol: v }));
    setItems(list);
  }, [currentConfig.product_mappings]);

  const handleAdd = () => setItems([...items, { ksefName: "", symbol: "" }]);
  const handleRemove = (index: number) => setItems(items.filter((_, i) => i !== index));
  const handleChange = (index: number, field: "ksefName" | "symbol", value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSave = () => {
    const newRecord: Record<string, string> = {};
    for (const item of items) {
      if (item.ksefName.trim() && item.symbol.trim()) {
        newRecord[item.ksefName.trim()] = item.symbol.trim();
      }
    }
    onSave(newRecord);
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle>Mapowania towarów (KSeF / Inne)</CardTitle>
        <CardDescription>
          Przypisz nazwy towarów (np. z faktur KSeF) do konkretnych symboli w kartotece Subiekta GT.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-md bg-muted/20">
            Brak zdefiniowanych mapowań. Kliknij "Dodaj wiersz", aby rozpocząć.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-3 px-2 pb-2 text-xs font-semibold text-muted-foreground">
              <div className="col-span-5">Nazwa zewnętrzna (np. KSeF)</div>
              <div className="col-span-6">Symbol w Subiekcie</div>
              <div className="col-span-1 text-right">Akcja</div>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-card p-1">
                <div className="col-span-5">
                  <Input 
                    placeholder="Np. Mysz komputerowa" 
                    value={item.ksefName} 
                    onChange={(e) => handleChange(idx, "ksefName", e.target.value)} 
                  />
                </div>
                <div className="col-span-6">
                  <ProductSearchCombobox 
                    integrationId={integrationId}
                    value={item.symbol}
                    onChange={(sym) => handleChange(idx, "symbol", sym)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemove(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between items-center pt-2">
          <Button variant="outline" size="sm" onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Dodaj wiersz
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Zapisz mapowania towarów
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SEKCJA 2: KOSZTY ROZDZIELANE
// ============================================================================
function SectionDistributedCosts({ 
  currentConfig, 
  onSave, 
  isSaving 
}: { 
  currentConfig: MappingsConfig; 
  onSave: (kw: string[]) => void; 
  isSaving: boolean;
}) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setKeywords(currentConfig.distributed_costs_keywords || []);
  }, [currentConfig.distributed_costs_keywords]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const val = inputValue.trim().toLowerCase();
      if (!keywords.includes(val)) setKeywords([...keywords, val]);
      setInputValue("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle>Koszty rozdzielane</CardTitle>
        <CardDescription>
          Wpisz słowa kluczowe (np. <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">opłata transportowa</span>). 
          Jeśli pozycja na fakturze KSeF zawiera tę frazę, Agent nie zaksięguje jej jako osobny towar, lecz proporcjonalnie wliczy jej wartość w cenę pozostałych produktów z tej faktury.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Input 
              placeholder="Wpisz frazę i naciśnij Enter..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="max-w-sm"
            />
            <Button type="button" variant="secondary" onClick={() => {
              if (inputValue.trim()) {
                const val = inputValue.trim().toLowerCase();
                if (!keywords.includes(val)) setKeywords([...keywords, val]);
                setInputValue("");
              }
            }}>
              Dodaj
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-muted/20 border rounded-md">
            {keywords.length === 0 ? (
              <span className="text-sm text-muted-foreground flex items-center">Brak słów kluczowych. Wpisz coś wyżej.</span>
            ) : (
              keywords.map(kw => (
                <div key={kw} className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20">
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} className="text-primary/70 hover:text-primary transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={() => onSave(keywords)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Zapisz listę
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SEKCJA 3: FORMY PŁATNOŚCI I USŁUGI (Połączone stare sekcje)
// ============================================================================
function SectionPaymentAndServiceMappings({ 
  paymentForms,
  currentConfig, 
  onSave, 
  isSaving 
}: { 
  paymentForms: PaymentForm[];
  currentConfig: MappingsConfig; 
  onSave: (p: Record<string, string>, s: ServiceMappings) => void; 
  isSaving: boolean;
}) {
  const [payments, setPayments] = useState<{key: string, value: string}[]>([]);
  const [services, setServices] = useState<ServiceMappings>({ delivery_prepaid: "", delivery_cod: "", additional_services: {} });

  useEffect(() => {
    const pList = Object.entries(currentConfig.payment_type_mappings).map(([k, v]) => ({ key: k, value: v }));
    if (pList.length === 0) {
      pList.push({ key: "ONLINE", value: "" }, { key: "CASH_ON_DELIVERY", value: "" });
    }
    setPayments(pList);
    setServices({
      delivery_prepaid: currentConfig.service_mappings.delivery_prepaid || "",
      delivery_cod: currentConfig.service_mappings.delivery_cod || "",
      additional_services: currentConfig.service_mappings.additional_services || { CARRY_IN: "" }
    });
  }, [currentConfig.payment_type_mappings, currentConfig.service_mappings]);

  const handleSave = () => {
    const newPay: Record<string, string> = {};
    for (const p of payments) {
      if (p.key.trim() && p.value.trim()) newPay[p.key.trim()] = p.value.trim();
    }
    onSave(newPay, services);
  };

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle>Mapowanie płatności i usług (Allegro / BaseLinker)</CardTitle>
        <CardDescription>
          Konfiguracja form płatności oraz usług kurierskich dla faktur sprzedażowych.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-8">
        {/* PŁATNOŚCI */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
            Formy płatności
            <Button variant="ghost" size="sm" onClick={() => setPayments([...payments, {key: "", value: ""}])}>
              <Plus className="h-4 w-4 mr-1" /> Dodaj formę
            </Button>
          </h3>
          <div className="grid grid-cols-12 gap-3 px-2 pb-1 text-xs font-semibold text-muted-foreground">
            <div className="col-span-5">Klucz systemu (np. ONLINE)</div>
            <div className="col-span-6">Nazwa płatności w Subiekcie</div>
            <div className="col-span-1 text-right">Akcja</div>
          </div>
          {payments.map((p, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-5">
                <Input value={p.key} onChange={(e) => {
                  const arr = [...payments]; arr[idx].key = e.target.value; setPayments(arr);
                }} placeholder="np. ONLINE" />
              </div>
              <div className="col-span-6">
                <Input value={p.value} onChange={(e) => {
                  const arr = [...payments]; arr[idx].value = e.target.value; setPayments(arr);
                }} placeholder="Zwykły tekst (dokładna nazwa z Subiekta)" />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setPayments(payments.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* USŁUGI */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Symbole usług dostawy w Subiekcie</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dostawa opłacona (z góry)</label>
              <Input value={services.delivery_prepaid} onChange={e => setServices({...services, delivery_prepaid: e.target.value})} placeholder="np. TRANSPORT" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dostawa za pobraniem</label>
              <Input value={services.delivery_cod} onChange={e => setServices({...services, delivery_cod: e.target.value})} placeholder="np. POBRANIE" />
            </div>
            <div className="space-y-1.5 col-span-2 mt-2">
              <label className="text-xs font-medium text-muted-foreground">Usługa "Wniesienie" (dla Allegro CARRY_IN)</label>
              <Input 
                value={services.additional_services["CARRY_IN"] || ""} 
                onChange={e => setServices({...services, additional_services: { ...services.additional_services, CARRY_IN: e.target.value }})} 
                placeholder="np. WNIESIENIE" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Zapisz płatności i usługi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
