"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  X, 
  Info, 
  SlidersHorizontal, 
  CreditCard, 
  Truck, 
  Coins, 
  Package, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Save,
  HelpCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProductSearchCombobox } from "./ProductSearchCombobox";

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
  ksef_enabled?: boolean;
  fiscalization_enabled?: boolean;
  fiscal_printer_id?: number | null;
  payment_type_mappings: Record<string, string>;
  service_mappings: ServiceMappings;
  product_mappings: Record<string, string>;
  distributed_costs_keywords: string[];
}

interface SubiektMappingsTabProps {
  integrationId: number;
}

export function SubiektMappingsTab({ integrationId }: SubiektMappingsTabProps) {
  const queryClient = useQueryClient();
  const isIdValid = typeof integrationId === "number" && !isNaN(integrationId) && integrationId > 0;

  const [configState, setConfigState] = useState<MappingsConfig | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  const { data: currentConfig, isLoading: configLoading, isError: configError } = useQuery<MappingsConfig>({
    queryKey: ["subiektMappingsConfig", integrationId],
    queryFn: async () => {
      if (!isIdValid) throw new Error("Invalid integration ID");
      const response = await api.get(`/erp-proxy/integrations/${integrationId}/mappings-config`);
      return {
        ksef_enabled: response.data.ksef_enabled || false,
        fiscalization_enabled: response.data.fiscalization_enabled || false,
        fiscal_printer_id: response.data.fiscal_printer_id !== undefined && response.data.fiscal_printer_id !== null ? response.data.fiscal_printer_id : null,
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

  // Synchronizacja stanu lokalnego z pobranym configiem
  useEffect(() => {
    if (currentConfig) {
      setConfigState({
        ksef_enabled: currentConfig.ksef_enabled || false,
        fiscalization_enabled: currentConfig.fiscalization_enabled || false,
        fiscal_printer_id: currentConfig.fiscal_printer_id !== undefined && currentConfig.fiscal_printer_id !== null ? currentConfig.fiscal_printer_id : null,
        payment_type_mappings: currentConfig.payment_type_mappings || {},
        service_mappings: {
          delivery_prepaid: currentConfig.service_mappings.delivery_prepaid || "",
          delivery_cod: currentConfig.service_mappings.delivery_cod || "",
          additional_services: currentConfig.service_mappings.additional_services || {}
        },
        product_mappings: currentConfig.product_mappings || {},
        distributed_costs_keywords: currentConfig.distributed_costs_keywords || []
      });
    }
  }, [currentConfig]);

  // Mutacja do zapisywania konfiguracji
  const saveConfigMutation = useMutation({
    mutationFn: async (updatedConfig: MappingsConfig) => {
      await api.post(`/erp-proxy/integrations/${integrationId}/mappings-config`, updatedConfig);
    },
    onSuccess: () => {
      toast.success("Konfiguracja biznesowa została zapisana w Aplikacji Matce.");
      queryClient.invalidateQueries({ queryKey: ["subiektMappingsConfig", integrationId] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  if (configError) {
    return (
      <div className="text-destructive p-5 border border-destructive/20 rounded-xl bg-destructive/5 mt-4 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Błąd komunikacji</h4>
          <p className="text-sm mt-1 text-destructive/80">
            Wystąpił błąd podczas ładowania konfiguracji. Upewnij się, że lokalny agent Subiekta działa i jest podłączony do sieci.
          </p>
        </div>
      </div>
    );
  }

  if (configLoading || paymentFormsLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md animate-pulse" />
          <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Pobieranie konfiguracji z agenta...</p>
      </div>
    );
  }

  if (!configState) return null;

  const handleSaveAll = () => {
    saveConfigMutation.mutate(configState);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 mt-4 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1 rounded-xl border mb-6">
            <TabsTrigger value="general" className="rounded-lg gap-2 text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0" /> Ogólne & KSeF
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg gap-2 text-xs sm:text-sm">
              <CreditCard className="h-4 w-4 shrink-0" /> Płatności
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-lg gap-2 text-xs sm:text-sm">
              <Truck className="h-4 w-4 shrink-0" /> Usługi kurierskie
            </TabsTrigger>
            <TabsTrigger value="costs" className="rounded-lg gap-2 text-xs sm:text-sm">
              <Coins className="h-4 w-4 shrink-0" /> Koszty transportu
            </TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg gap-2 text-xs sm:text-sm">
              <Package className="h-4 w-4 shrink-0" /> Towary
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {/* ZAKŁADKA 1: OGÓLNE I KSEF */}
              <TabsContent value="general">
                <Card className="border-border/60 shadow-md">
                  <CardHeader className="pb-4 border-b">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>Główne ustawienia integracji</CardTitle>
                        <CardDescription>
                          Zarządzaj globalnymi przełącznikami i integracją z Krajowym Systemem e-Faktur.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-primary/10 bg-primary/5">
                      <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">Włącz integrację z KSeF</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Gdy włączysz tę opcję, dokumenty z podanym NIP będą rejestrowane w formie elektronicznej zgodnej z KSeF.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Faktury B2B (zawierające NIP klienta) będą w Subiekcie od razu oznaczane jako e-Faktury do wysyłki KSeF.
                        </p>
                      </div>
                      <Switch
                        checked={configState.ksef_enabled || false}
                        onCheckedChange={(checked) => setConfigState({ ...configState, ksef_enabled: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-primary/10 bg-primary/5">
                      <div className="space-y-1 pr-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">Włącz automatyczną fiskalizację (dla klientów detalicznych)</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Po włączeniu tej opcji, zamówienia detaliczne (bez podanego NIP-u) będą automatycznie rejestrowane i drukowane jako paragony fiskalne.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Obsługuje automatyczne drukowanie paragonów fiskalnych w tle na wybranej drukarce.
                        </p>
                      </div>
                      <Switch
                        checked={configState.fiscalization_enabled || false}
                        onCheckedChange={(checked) => setConfigState({ 
                          ...configState, 
                          fiscalization_enabled: checked,
                          fiscal_printer_id: checked ? (configState.fiscal_printer_id || null) : null
                        })}
                      />
                    </div>

                    {configState.fiscalization_enabled && (
                      <div className="space-y-1.5 p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          ID Drukarki Fiskalnej w Subiekcie
                          <span className="text-destructive">*</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                                <HelpCircle className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Podaj identyfikator drukarki fiskalnej zdefiniowany w systemie Subiekt GT.
                            </TooltipContent>
                          </Tooltip>
                        </label>
                        <Input
                          type="number"
                          placeholder="np. 1"
                          value={configState.fiscal_printer_id !== null && configState.fiscal_printer_id !== undefined ? configState.fiscal_printer_id : ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                            setConfigState({ ...configState, fiscal_printer_id: isNaN(val as number) ? null : val });
                          }}
                          required
                        />
                      </div>
                    )}

                    <div className="rounded-xl border border-border/80 bg-card p-4 flex gap-3.5">
                      <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Hybrydowy podział ról</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Aplikacja główna (Matka) zarządza konfiguracją biznesową i przetwarza dane w chmurze. Lokalny agent
                          jest odpowiedzialny wyłącznie za bezpośrednią komunikację z lokalną bazą danych SQL Subiekta GT.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ZAKŁADKA 2: MAPOWANIE PŁATNOŚCI */}
              <TabsContent value="payments">
                <SectionPaymentMappings
                  paymentForms={paymentForms || []}
                  config={configState}
                  onChange={(newPayments) => setConfigState({ ...configState, payment_type_mappings: newPayments })}
                />
              </TabsContent>

              {/* ZAKŁADKA 3: MAPOWANIE USŁUG DODATKOWYCH */}
              <TabsContent value="services">
                <SectionServiceMappings
                  config={configState}
                  onChange={(newServices) => setConfigState({ ...configState, service_mappings: newServices })}
                />
              </TabsContent>

              {/* ZAKŁADKA 4: KOSZTY DYSTRYBUCYJNE */}
              <TabsContent value="costs">
                <SectionDistributedCosts
                  config={configState}
                  onChange={(newKeywords) => setConfigState({ ...configState, distributed_costs_keywords: newKeywords })}
                />
              </TabsContent>

              {/* ZAKŁADKA 5: MAPOWANIE TOWARÓW */}
              <TabsContent value="products">
                <SectionProductMappings
                  integrationId={integrationId}
                  config={configState}
                  onChange={(newProducts) => setConfigState({ ...configState, product_mappings: newProducts })}
                />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>

        {/* PRZYCISK ZAPISU W STOPCE PANELU */}
        <div className="sticky bottom-0 bg-background/90 backdrop-blur-md py-4 border-t flex items-center justify-between gap-4 z-10 -mx-6 px-6 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            Wszystkie zmiany zapisywane są centralnie w Aplikacji Matce.
          </span>
          <Button 
            type="button"
            onClick={handleSaveAll} 
            disabled={saveConfigMutation.isPending}
            className="shadow-lg shadow-primary/15 hover:shadow-primary/20 transition-all gap-2"
          >
            {saveConfigMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Zapisz konfigurację agenta
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// MAPOWANIE PŁATNOŚCI
// ============================================================================
function SectionPaymentMappings({
  paymentForms,
  config,
  onChange
}: {
  paymentForms: PaymentForm[];
  config: MappingsConfig;
  onChange: (p: Record<string, string>) => void;
}) {
  const [mappings, setMappings] = useState<{ platformStatus: string; subiektForm: string }[]>([]);
  const [customRows, setCustomRows] = useState<Record<number, boolean>>({});
  const lastSentRef = useRef<Record<string, string> | null>(null);

  const PREDEFINED_KEYS = [
    { value: "ONLINE", label: "Płatność online (szybki przelew, Blik, karta)" },
    { value: "CASH_ON_DELIVERY", label: "Pobranie - Domyślne (wszyscy kurierzy)" },
    { value: "CASH_ON_DELIVERY:SUUS", label: "Pobranie - Rohlig Suus (SUUS)" },
    { value: "CASH_ON_DELIVERY:GEIS", label: "Pobranie - Geis (GEIS)" },
    { value: "CASH_ON_DELIVERY:APACZKA", label: "Pobranie - Apaczka (APACZKA)" },
    { value: "CASH_ON_DELIVERY:DPD", label: "Pobranie - DPD" },
    { value: "CASH_ON_DELIVERY:DHL", label: "Pobranie - DHL" },
    { value: "CASH_ON_DELIVERY:INPOST", label: "Pobranie - Paczkomaty / Kurier InPost" },
    { value: "CASH_ON_DELIVERY:GLS", label: "Pobranie - GLS" },
    { value: "CASH_ON_DELIVERY:UPS", label: "Pobranie - UPS" },
    { value: "CASH_ON_DELIVERY:FEDEX", label: "Pobranie - FedEx" },
    { value: "CASH_ON_DELIVERY:ONE", label: "Pobranie - Allegro One (ONE)" },
    { value: "CASH_ON_DELIVERY:ORLEN", label: "Pobranie - ORLEN Paczka (ORLEN)" },
    { value: "CASH_ON_DELIVERY:POCZTA", label: "Pobranie - Poczta Polska / Pocztex" },
  ];

  useEffect(() => {
    // Sprawdzamy, czy zmiana pochodzi z naszego własnego wpisywania
    if (lastSentRef.current) {
      const currentEntries = Object.entries(config.payment_type_mappings);
      const lastEntries = Object.entries(lastSentRef.current);
      if (currentEntries.length === lastEntries.length) {
        const isSame = currentEntries.every(([k, v]) => lastSentRef.current?.[k] === v);
        if (isSame) {
          return;
        }
      }
    }

    const list = Object.entries(config.payment_type_mappings).map(([k, v]) => ({
      platformStatus: k,
      subiektForm: v
    }));
    if (list.length === 0) {
      list.push({ platformStatus: "ONLINE", subiektForm: "" });
      list.push({ platformStatus: "CASH_ON_DELIVERY", subiektForm: "" });
    }
    setMappings(list);
  }, [config.payment_type_mappings]);

  const handleAdd = () => {
    setMappings([...mappings, { platformStatus: "ONLINE", subiektForm: "" }]);
  };

  const handleRemove = (idx: number) => {
    const updated = mappings.filter((_, i) => i !== idx);
    setMappings(updated);
    triggerChange(updated);
    // Usuwamy stan custom dla tego wiersza
    const newCustomRows = { ...customRows };
    delete newCustomRows[idx];
    setCustomRows(newCustomRows);
  };

  const handleFieldChange = (idx: number, field: "platformStatus" | "subiektForm", value: string) => {
    const updated = [...mappings];
    updated[idx][field] = value;
    setMappings(updated);
    triggerChange(updated);
  };

  const triggerChange = (list: { platformStatus: string; subiektForm: string }[]) => {
    const record: Record<string, string> = {};
    for (const item of list) {
      if (item.platformStatus.trim()) {
        record[item.platformStatus.trim().toUpperCase()] = item.subiektForm.trim();
      }
    }
    lastSentRef.current = record;
    onChange(record);
  };

  return (
    <Card className="border-border/60 shadow-md">
      <CardHeader className="pb-4 border-b flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            Mapowanie form płatności
          </CardTitle>
          <CardDescription>
            Powiąż statusy płatności z platformy (np. Allegro, Shopify) z formami płatności zdefiniowanymi w Subiekcie GT.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Dodaj mapowanie
        </Button>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="flex gap-3 p-3.5 rounded-xl border border-indigo-500/15 bg-indigo-500/5 text-xs text-muted-foreground leading-relaxed">
          <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground font-semibold block mb-0.5">Wskazówka: Mapowanie pobrań według kuriera</strong>
            Aby przypisać unikalną formę płatności w Subiekcie w zależności od kuriera realizującego pobranie (COD), dodaj mapowanie wpisując klucz w formacie:{" "}
            <code className="bg-slate-950/40 px-1 py-0.5 rounded font-mono text-white text-[10px]">CASH_ON_DELIVERY:KOD_KURIERA</code>{" "}
            (np. <code className="bg-slate-950/40 px-1 py-0.5 rounded font-mono text-white text-[10px]">CASH_ON_DELIVERY:SUUS</code>,{" "}
            <code className="bg-slate-950/40 px-1 py-0.5 rounded font-mono text-white text-[10px]">CASH_ON_DELIVERY:GEIS</code> lub{" "}
            <code className="bg-slate-950/40 px-1 py-0.5 rounded font-mono text-white text-[10px]">CASH_ON_DELIVERY:APACZKA</code>).{" "}
            Brak dedykowanego wpisu spowoduje automatyczny fallback do domyślnego klucza <code className="bg-slate-950/40 px-1 py-0.5 rounded font-mono text-white text-[10px]">CASH_ON_DELIVERY</code>.
          </div>
        </div>

        {mappings.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
            Brak zdefiniowanych mapowań płatności. Kliknij przycisk powyżej, aby dodać pierwsze powiązanie.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-1/2">Status płatności z platformy (klucz)</TableHead>
                  <TableHead className="w-1/2">Forma płatności w Subiekt GT</TableHead>
                  <TableHead className="w-[80px] text-right">Akcja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, idx) => {
                  const isCustom =
                    customRows[idx] ||
                    (mapping.platformStatus !== "" &&
                      !PREDEFINED_KEYS.some((k) => k.value === mapping.platformStatus));

                  return (
                    <TableRow key={idx} className="hover:bg-muted/10">
                      <TableCell className="align-middle">
                        {isCustom ? (
                          <div className="relative flex items-center gap-1.5 w-full">
                            <Input
                              placeholder="np. CASH_ON_DELIVERY:GEODIS"
                              value={mapping.platformStatus}
                              onChange={(e) => handleFieldChange(idx, "platformStatus", e.target.value)}
                              className="font-mono text-xs pr-9 h-9"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCustomRows((prev) => ({ ...prev, [idx]: false }));
                                handleFieldChange(idx, "platformStatus", "ONLINE");
                              }}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
                              title="Wybierz z listy popularnych"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={mapping.platformStatus}
                            onValueChange={(val) => {
                              if (val === "custom") {
                                setCustomRows((prev) => ({ ...prev, [idx]: true }));
                                handleFieldChange(idx, "platformStatus", "");
                              } else {
                                handleFieldChange(idx, "platformStatus", val);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue placeholder="Wybierz typ płatności..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/35 bg-[#0a0c16]/95 backdrop-blur-lg">
                              {PREDEFINED_KEYS.map((k) => (
                                <SelectItem key={k.value} value={k.value} className="text-xs">
                                  {k.label}
                                </SelectItem>
                              ))}
                              <div className="h-px bg-border/40 my-1" />
                              <SelectItem value="custom" className="text-xs font-semibold text-indigo-400">
                                Niestandardowy klucz (wpisz ręcznie)...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        {paymentForms.length > 0 ? (
                          <Select
                            value={mapping.subiektForm}
                            onValueChange={(val) => handleFieldChange(idx, "subiektForm", val)}
                          >
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue placeholder="Wybierz formę płatności..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/35 bg-[#0a0c16]/95 backdrop-blur-lg">
                              {paymentForms.map((form) => (
                                <SelectItem key={form.id} value={form.name} className="text-xs">
                                  {form.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Dokładna nazwa formy w Subiekcie"
                            value={mapping.subiektForm}
                            onChange={(e) => handleFieldChange(idx, "subiektForm", e.target.value)}
                            className="h-9 text-xs"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                          onClick={() => handleRemove(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAPOWANIE USŁUG DODATKOWYCH
// ============================================================================
function SectionServiceMappings({
  config,
  onChange
}: {
  config: MappingsConfig;
  onChange: (s: ServiceMappings) => void;
}) {
  const [fixedServices, setFixedServices] = useState({ delivery_prepaid: "", delivery_cod: "" });
  const [dynamicServices, setDynamicServices] = useState<{ code: string; symbol: string }[]>([]);
  const lastSentRef = useRef<ServiceMappings | null>(null);

  useEffect(() => {
    // Sprawdzamy, czy zmiana pochodzi z naszego własnego wpisywania
    if (lastSentRef.current) {
      const current = config.service_mappings;
      const last = lastSentRef.current;
      if (
        current.delivery_prepaid === last.delivery_prepaid &&
        current.delivery_cod === last.delivery_cod
      ) {
        const currentEntries = Object.entries(current.additional_services || {});
        const lastEntries = Object.entries(last.additional_services || {});
        if (currentEntries.length === lastEntries.length) {
          const isSame = currentEntries.every(([k, v]) => last.additional_services?.[k] === v);
          if (isSame) {
            return;
          }
        }
      }
    }

    setFixedServices({
      delivery_prepaid: config.service_mappings.delivery_prepaid || "",
      delivery_cod: config.service_mappings.delivery_cod || ""
    });
    const dyn = Object.entries(config.service_mappings.additional_services || {}).map(([k, v]) => ({
      code: k,
      symbol: v
    }));
    setDynamicServices(dyn);
  }, [config.service_mappings]);

  const handleFixedChange = (field: "delivery_prepaid" | "delivery_cod", val: string) => {
    const updated = { ...fixedServices, [field]: val };
    setFixedServices(updated);
    triggerChange(updated, dynamicServices);
  };

  const handleAddDynamic = () => {
    setDynamicServices([...dynamicServices, { code: "", symbol: "" }]);
  };

  const handleRemoveDynamic = (idx: number) => {
    const updated = dynamicServices.filter((_, i) => i !== idx);
    setDynamicServices(updated);
    triggerChange(fixedServices, updated);
  };

  const handleDynamicChange = (idx: number, field: "code" | "symbol", val: string) => {
    const updated = [...dynamicServices];
    updated[idx][field] = val;
    setDynamicServices(updated);
    triggerChange(fixedServices, updated);
  };

  const triggerChange = (
    fixed: typeof fixedServices,
    dyn: { code: string; symbol: string }[]
  ) => {
    const additional: Record<string, string> = {};
    for (const item of dyn) {
      if (item.code.trim()) {
        additional[item.code.trim()] = item.symbol.trim();
      }
    }
    const payload = {
      delivery_prepaid: fixed.delivery_prepaid.trim(),
      delivery_cod: fixed.delivery_cod.trim(),
      additional_services: additional
    };
    lastSentRef.current = payload;
    onChange(payload);
  };

  return (
    <Card className="border-border/60 shadow-md">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Mapowanie usług dodatkowych i logistycznych</CardTitle>
            <CardDescription>
              Skonfiguruj symbole usług wysyłkowych i opcjonalnych (np. wniesienie, montaż) przypisanych do kartoteki Subiekta GT.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-8">
        {/* USŁUGI LOGISTYCZNE - STAŁE */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Stałe usługi logistyczne
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Te symbole zostaną dopasowane w Subiekcie do rozliczenia kosztów dostawy w zależności od wybranej płatności.
              </TooltipContent>
            </Tooltip>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Usługa: Przesyłka opłacona z góry
              </label>
              <Input
                value={fixedServices.delivery_prepaid}
                onChange={(e) => handleFixedChange("delivery_prepaid", e.target.value)}
                placeholder="np. KURIER PREPAID lub WYSYŁKA KURIERSKA"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Usługa: Przesyłka pobraniowa
              </label>
              <Input
                value={fixedServices.delivery_cod}
                onChange={(e) => handleFixedChange("delivery_cod", e.target.value)}
                placeholder="np. KURIER COD lub KOSZT POBRANIA"
              />
            </div>
          </div>
        </div>

        {/* USŁUGI DYNAMICZNE */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Dynamiczne usługi (np. Allegro)
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-primary transition-colors">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Powiąż niestandardowe kody usług przekazywane przez platformę (np. CARRY_IN, ASSEMBLY) z symbolami usług w Subiekcie.
                </TooltipContent>
              </Tooltip>
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddDynamic} className="gap-1.5">
              <Plus className="h-4 w-4" /> Dodaj usługę dynamiczną
            </Button>
          </div>

          {dynamicServices.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-xs">
              Brak dynamicznych mapowań. Kliknij przycisk obok, aby dodać np. wniesienie (CARRY_IN).
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-1/2">Kod usługi z platformy (np. CARRY_IN)</TableHead>
                    <TableHead className="w-1/2">Symbol usługi w Subiekcie</TableHead>
                    <TableHead className="w-[80px] text-right">Akcja</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dynamicServices.map((service, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/10">
                      <TableCell className="align-middle">
                        <Input
                          placeholder="np. CARRY_IN"
                          value={service.code}
                          onChange={(e) => handleDynamicChange(idx, "code", e.target.value)}
                          className="font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell className="align-middle">
                        <Input
                          placeholder="np. WNIESIENIE TOWARU"
                          value={service.symbol}
                          onChange={(e) => handleDynamicChange(idx, "symbol", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                          onClick={() => handleRemoveDynamic(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// KOSZTY DYSTRYBUCYJNE (TAG INPUT)
// ============================================================================
function SectionDistributedCosts({
  config,
  onChange
}: {
  config: MappingsConfig;
  onChange: (k: string[]) => void;
}) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setKeywords(config.distributed_costs_keywords || []);
  }, [config.distributed_costs_keywords]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const val = inputValue.trim().toLowerCase();
      if (!keywords.includes(val)) {
        const updated = [...keywords, val];
        setKeywords(updated);
        onChange(updated);
      }
      setInputValue("");
    }
  };

  const removeKeyword = (kw: string) => {
    const updated = keywords.filter((k) => k !== kw);
    setKeywords(updated);
    onChange(updated);
  };

  const addPresetKeyword = (preset: string) => {
    const val = preset.toLowerCase();
    if (!keywords.includes(val)) {
      const updated = [...keywords, val];
      setKeywords(updated);
      onChange(updated);
    }
  };

  const presets = ["opłata transportowa", "koszt przesyłki", "dostawa", "transport", "paczka"];

  return (
    <Card className="border-border/60 shadow-md">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Dystrybucja kosztów logistycznych</CardTitle>
            <CardDescription>
              Wpisz słowa kluczowe. Jeśli nazwa pozycji zamówienia pasuje do jednego ze słów, jej koszt zostanie proporcjonalnie rozdzielony na ceny pozostałych towarów.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        <div className="space-y-3">
          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="Wpisz słowo/frazę i kliknij Enter..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (inputValue.trim()) {
                  const val = inputValue.trim().toLowerCase();
                  if (!keywords.includes(val)) {
                    const updated = [...keywords, val];
                    setKeywords(updated);
                    onChange(updated);
                  }
                  setInputValue("");
                }
              }}
            >
              Dodaj
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[50px] p-3 bg-muted/20 border border-dashed rounded-xl">
            {keywords.length === 0 ? (
              <span className="text-sm text-muted-foreground self-center italic px-1">
                Brak filtrów. Wpisz frazę i zatwierdź Enterem.
              </span>
            ) : (
              keywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm font-normal gap-1.5 transition-colors"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="text-primary/70 hover:text-primary transition-colors focus:outline-none"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* SUGESTIE / DOMYŚLNE */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Popularne szablony słów
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const exists = keywords.includes(p.toLowerCase());
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => addPresetKeyword(p)}
                  disabled={exists}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                    exists
                      ? "bg-muted text-muted-foreground/50 border-transparent cursor-not-allowed"
                      : "bg-background text-foreground hover:bg-muted hover:border-border/80 border-border/60"
                  }`}
                >
                  + {p}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAPOWANIE TOWARÓW (WYSZUKIWARKA + PAGINACJA)
// ============================================================================
function SectionProductMappings({
  integrationId,
  config,
  onChange
}: {
  integrationId: number;
  config: MappingsConfig;
  onChange: (m: Record<string, string>) => void;
}) {
  const [items, setItems] = useState<{ ksefName: string; symbol: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [newKsefName, setNewKsefName] = useState("");
  const [newSymbol, setNewSymbol] = useState("");

  // Sync z configiem wejściowym
  useEffect(() => {
    const list = Object.entries(config.product_mappings || {}).map(([k, v]) => ({
      ksefName: k,
      symbol: v
    }));
    setItems(list);
  }, [config.product_mappings]);

  const handleAdd = () => {
    if (!newKsefName.trim() || !newSymbol.trim()) {
      toast.error("Podaj nazwę zewnętrzną oraz wybierz symbol z Subiekta.");
      return;
    }

    if (items.some(i => i.ksefName.toLowerCase() === newKsefName.trim().toLowerCase())) {
      toast.error("Mapowanie dla tej nazwy zewnętrznej już istnieje.");
      return;
    }

    const updated = [...items, { ksefName: newKsefName.trim(), symbol: newSymbol.trim() }];
    setItems(updated);
    setNewKsefName("");
    setNewSymbol("");
    triggerChange(updated);
    toast.success("Dodano nowe mapowanie towaru.");
  };

  const handleRemove = (kName: string) => {
    const updated = items.filter(i => i.ksefName !== kName);
    setItems(updated);
    triggerChange(updated);
  };

  const triggerChange = (list: typeof items) => {
    const record: Record<string, string> = {};
    for (const item of list) {
      if (item.ksefName.trim() && item.symbol.trim()) {
        record[item.ksefName.trim()] = item.symbol.trim();
      }
    }
    onChange(record);
  };

  // Filtrowanie wyszukiwarki
  const filteredItems = items.filter(
    (item) =>
      item.ksefName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginacja
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Zresetuj stronę na zmianę wyszukiwania
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <Card className="border-border/60 shadow-md">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Nadpisania asortymentu (Product Mappings)</CardTitle>
            <CardDescription>
              Mapowanie nazw z Aplikacji Matki lub faktur KSeF na konkretne symbole w kartotece asortymentowej Subiekta GT.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        
        {/* PANEL DODAWANIA MAPOWANIA */}
        <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Dodaj nowe powiązanie towaru
          </span>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nazwa/Symbol zewnętrzny (Matka/KSeF)</label>
              <Input
                placeholder="np. Myszka Bezprzewodowa XYZ"
                value={newKsefName}
                onChange={(e) => setNewKsefName(e.target.value)}
              />
            </div>
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Odpowiednik w Subiekcie GT (Szukaj)</label>
              <ProductSearchCombobox
                integrationId={integrationId}
                value={newSymbol}
                onChange={setNewSymbol}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="button" onClick={handleAdd} className="w-full gap-1">
                <Plus className="h-4 w-4" /> Dodaj
              </Button>
            </div>
          </div>
        </div>

        {/* WYSZUKIWARKA W TABELI */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Wyszukaj zmapowane towary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Wszystkich pozycji: {filteredItems.length} {searchQuery && `(odfiltrowano z ${items.length})`}
          </span>
        </div>

        {/* TABELA Z TOWARAMI */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[50%]">Symbol/Nazwa z systemu Matki (KSeF)</TableHead>
                <TableHead className="w-[40%]">Symbol w Subiekcie GT</TableHead>
                <TableHead className="w-[10%] text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic text-sm">
                    Brak wyników do wyświetlenia.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.ksefName} className="hover:bg-muted/10">
                    <TableCell className="font-medium align-middle">{item.ksefName}</TableCell>
                    <TableCell className="align-middle">
                      <code className="text-xs bg-muted border rounded px-1.5 py-0.5 font-mono text-indigo-500">
                        {item.symbol}
                      </code>
                    </TableCell>
                    <TableCell className="text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                        onClick={() => handleRemove(item.ksefName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINACJA */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-xs text-muted-foreground">
              Strona {currentPage} z {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
