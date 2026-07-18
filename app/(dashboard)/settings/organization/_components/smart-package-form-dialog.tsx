"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import toast from "react-hot-toast";

import { PackageMappingRule } from "@/types/package-mapping-rule";
import { PackageDefinition } from "@/types/package-definition";
import { ServiceIntegration } from "@/types/service-integration";
import { SubiektProductCombobox } from "@/components/shared/subiekt-product-combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, Package, Sliders, Box, Layers, Settings, HelpCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SmartPackageFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
  rule: PackageMappingRule | null;
}

interface FormValues {
  name: string;
  priority: string;
  courier_integration_id: string;
  courier_service_code: string;
  product_identifier_type: string;
  min_quantity: string;
  min_weight_kg: string;
  max_weight_kg: string;
  min_total_quantity: string;
  package_definition_id: string;
}

export function SmartPackageFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  rule,
}: SmartPackageFormDialogProps) {
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [couriers, setCouriers] = useState<ServiceIntegration[]>([]);
  const [erpIntegrationId, setErpIntegrationId] = useState<number | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stany dla wielu identyfikatorów produktów
  const [productIdentifiers, setProductIdentifiers] = useState<string[]>([]);
  const [newIdentifierInput, setNewIdentifierInput] = useState("");
  const [selectedErpSymbol, setSelectedErpSymbol] = useState("");

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      priority: "0",
      courier_integration_id: "NONE",
      courier_service_code: "",
      product_identifier_type: "SKU",
      min_quantity: "",
      min_weight_kg: "",
      max_weight_kg: "",
      min_total_quantity: "",
      package_definition_id: "",
    },
  });

  const isEditing = !!rule;
  const watchPackageId = form.watch("package_definition_id");
  const watchProductType = form.watch("product_identifier_type");

  // Znajdź wybrane opakowanie do wizualizacji w czasie rzeczywistym
  const selectedPackageDef = packages.find((p) => p.id === watchPackageId);

  // Pobierz dane pomocnicze
  useEffect(() => {
    if (isOpen) {
      const fetchMetadata = async () => {
        setIsLoadingMetadata(true);
        try {
          const [pkgsRes, couriersRes, integrationsRes] = await Promise.all([
            api.get<PackageDefinition[]>("/package-definitions"),
            api.get<ServiceIntegration[]>("/service-integrations", {
              params: { canBeCourier: "true" },
            }),
            api.get<ServiceIntegration[]>("/service-integrations"),
          ]);
          setPackages(pkgsRes.data);
          setCouriers(couriersRes.data);

          // Szukamy aktywnej integracji z Subiekt GT
          const erpInteg = integrationsRes.data.find(
            (i) => i.provider_type === "SUBIEKT_GT" && i.is_active
          );
          if (erpInteg) {
            setErpIntegrationId(erpInteg.id);
          }
        } catch (e) {
          toast.error("Nie udało się załadować danych pomocniczych.");
        } finally {
          setIsLoadingMetadata(false);
        }
      };
      fetchMetadata();
    }
  }, [isOpen]);

  // Ustawienie wartości w formularzu
  useEffect(() => {
    if (isOpen) {
      if (rule) {
        form.reset({
          name: rule.name,
          priority: String(rule.priority),
          courier_integration_id: rule.courier_integration_id
            ? String(rule.courier_integration_id)
            : "NONE",
          courier_service_code: rule.courier_service_code || "",
          product_identifier_type: rule.product_identifier_type || "SKU",
          min_quantity: rule.min_quantity ? String(rule.min_quantity) : "",
          min_weight_kg: rule.min_weight_kg ? String(rule.min_weight_kg) : "",
          max_weight_kg: rule.max_weight_kg ? String(rule.max_weight_kg) : "",
          min_total_quantity: rule.min_total_quantity
            ? String(rule.min_total_quantity)
            : "",
          package_definition_id: rule.package_definition_id,
        });
        setProductIdentifiers(rule.product_identifiers || []);
      } else {
        form.reset({
          name: "",
          priority: "0",
          courier_integration_id: "NONE",
          courier_service_code: "",
          product_identifier_type: "SKU",
          min_quantity: "",
          min_weight_kg: "",
          max_weight_kg: "",
          min_total_quantity: "",
          package_definition_id: "",
        });
        setProductIdentifiers([]);
      }
      setNewIdentifierInput("");
      setSelectedErpSymbol("");
    }
  }, [rule, form, isOpen]);

  // Dodawanie identyfikatora do listy
  const handleAddIdentifier = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (productIdentifiers.includes(trimmed)) {
      toast.error("Ten identyfikator jest już na liście.");
      return;
    }
    setProductIdentifiers([...productIdentifiers, trimmed]);
    setNewIdentifierInput("");
    setSelectedErpSymbol("");
  };

  const handleRemoveIdentifier = (index: number) => {
    setProductIdentifiers(productIdentifiers.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FormValues) => {
    if (!values.package_definition_id) {
      toast.error("Wybierz opakowanie docelowe.");
      return;
    }

    setIsSubmitting(true);

    // Automatycznie dodaj nieskomitowany input, jeśli użytkownik wpisał, ale zapomniał kliknąć "+"
    let finalIdentifiers = [...productIdentifiers];
    if (watchProductType === "ERP_SYMBOL") {
      if (selectedErpSymbol.trim() && !finalIdentifiers.includes(selectedErpSymbol.trim())) {
        finalIdentifiers.push(selectedErpSymbol.trim());
      }
    } else {
      if (newIdentifierInput.trim() && !finalIdentifiers.includes(newIdentifierInput.trim())) {
        finalIdentifiers.push(newIdentifierInput.trim());
      }
    }

    const payload = {
      name: values.name,
      priority: parseInt(values.priority) || 0,
      package_definition_id: values.package_definition_id,
      courier_integration_id:
        values.courier_integration_id === "NONE"
          ? null
          : parseInt(values.courier_integration_id),
      courier_service_code: values.courier_service_code || null,
      product_identifiers: finalIdentifiers.length > 0 ? finalIdentifiers : null,
      product_identifier_type: finalIdentifiers.length > 0 ? values.product_identifier_type : null,
      min_quantity: values.min_quantity ? parseInt(values.min_quantity) : null,
      min_weight_kg: values.min_weight_kg
        ? parseFloat(values.min_weight_kg.replace(",", "."))
        : null,
      max_weight_kg: values.max_weight_kg
        ? parseFloat(values.max_weight_kg.replace(",", "."))
        : null,
      min_total_quantity: values.min_total_quantity
        ? parseInt(values.min_total_quantity)
        : null,
    };

    try {
      if (isEditing) {
        await api.put(`/package-mapping-rules/${rule.id}`, payload);
        toast.success("Reguła pomyślnie zaktualizowana.");
      } else {
        await api.post("/package-mapping-rules", payload);
        toast.success("Reguła pomyślnie utworzona.");
      }
      onSuccess();
      setIsOpen(false);
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail || "Wystąpił błąd podczas zapisu reguły."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Heurystyka do sprawdzania czy opakowanie to paleta
  const isPallet = selectedPackageDef
    ? selectedPackageDef.name.toLowerCase().includes("palet") ||
      selectedPackageDef.courier_code === "PAL" ||
      parseFloat(String(selectedPackageDef.length_cm)) >= 80
    : false;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto bg-background/95 backdrop-blur-lg border border-primary/20 shadow-2xl shadow-primary/10 rounded-2xl p-6 transition-all duration-300">
        
        {/* Dekoracja z gradientem w tle */}
        <div className="absolute top-0 right-0 -z-10 w-48 h-48 bg-gradient-to-tr from-primary/10 via-indigo-500/5 to-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            {isEditing ? "Edycja inteligentnej reguły" : "Nowa inteligentna reguła"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Skonfiguruj warunki automatycznego dobierania optymalnego opakowania. 
          </DialogDescription>
        </DialogHeader>

        {isLoadingMetadata ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
              
              {/* Sekcja 1: Podstawowe informacje i wizualizacja */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-stretch">
                
                {/* Lewa strona: Nazwa, Opakowanie, Priorytet */}
                <div className="md:col-span-3 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nazwa reguły</FormLabel>
                        <FormControl>
                          <Input placeholder="Np. Wysyłka paletowa dla dużych produktów" className="rounded-xl border-primary/10 focus:border-primary focus:ring-primary/20 transition-all duration-200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="package_definition_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opakowanie docelowe</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-xl border-primary/10 transition-all duration-200">
                                <SelectValue placeholder="Wybierz opakowanie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              {packages.map((pkg) => (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {pkg.name}
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
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priorytet reguły</FormLabel>
                          <FormControl>
                            <Input type="number" className="rounded-xl border-primary/10 transition-all duration-200" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Prawa strona: Wizualizacja Opakowania WOW */}
                <div className="md:col-span-2 flex flex-col justify-between p-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-indigo-500/5 via-primary/5 to-purple-500/5 backdrop-blur-sm relative overflow-hidden transition-all duration-300">
                  <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
                  
                  {selectedPackageDef ? (
                    <div className="space-y-3 flex flex-col items-center text-center h-full justify-center">
                      <div className="p-3 bg-primary/10 rounded-full border border-primary/20 animate-pulse">
                        {isPallet ? (
                          <Layers className="h-8 w-8 text-indigo-500" />
                        ) : (
                          <Box className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Docelowe opakowanie</div>
                        <div className="font-semibold text-sm text-foreground truncate max-w-[180px]">{selectedPackageDef.name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-2xs bg-background/50 p-2 rounded-xl border border-primary/5 w-full">
                        <div>
                          <span className="text-muted-foreground block uppercase">Wymiary</span>
                          <span className="font-bold">{selectedPackageDef.length_cm}x{selectedPackageDef.width_cm}x{selectedPackageDef.height_cm} cm</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block uppercase">Waga</span>
                          <span className="font-bold">{selectedPackageDef.weight_kg} kg</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 flex flex-col items-center justify-center text-center h-full py-6">
                      <HelpCircle className="h-8 w-8 text-muted-foreground/40" />
                      <div className="text-xs text-muted-foreground/60 max-w-[150px]">
                        Wybierz opakowanie po lewej stronie, aby zobaczyć jego parametry.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sekcja 2: Warunki kurierskie */}
              <div className="p-4 rounded-2xl border border-primary/5 bg-background/40 space-y-4">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  <Sliders className="h-4 w-4 text-primary" />
                  1. Warunek dostawy
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="courier_integration_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Kurier / Przewoźnik</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-primary/10">
                              <SelectValue placeholder="Dowolny" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="NONE">Dowolny kurier</SelectItem>
                            {couriers.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name} ({c.provider_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courier_service_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Dokładna nazwa usługi kurierskiej (opcjonalnie)</FormLabel>
                        <FormControl>
                          <Input placeholder="Np. Allegro Paczkomaty InPost" className="rounded-xl border-primary/10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sekcja 3: Warunki produktowe z Tagami i ERP Combobox */}
              <div className="p-4 rounded-2xl border border-primary/5 bg-background/40 space-y-4">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  <Package className="h-4 w-4 text-violet-500" />
                  2. Warunek towarów w zamówieniu
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="product_identifier_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Typ dopasowania produktu</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            setSelectedErpSymbol("");
                            setNewIdentifierInput("");
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-primary/10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="SKU">SKU produktu</SelectItem>
                            <SelectItem value="OFFER_ID">ID oferty Allegro</SelectItem>
                            <SelectItem value="ERP_SYMBOL">Symbol ERP (Subiekt GT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Input do dodawania produktów */}
                  <div className="md:col-span-2 space-y-2">
                    <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Wyszukaj i dodaj produkt do reguły
                    </FormLabel>
                    
                    {watchProductType === "ERP_SYMBOL" && erpIntegrationId ? (
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <SubiektProductCombobox
                            erpIntegrationId={erpIntegrationId}
                            value={selectedErpSymbol}
                            onValueChange={(val) => {
                              setSelectedErpSymbol(val);
                              // Automatycznie dodawaj po wybraniu z comboboxa
                              if (val) handleAddIdentifier(val);
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder={watchProductType === "OFFER_ID" ? "Np. 12469837110" : "Np. TOWAR-SKU-12"}
                          value={newIdentifierInput}
                          onChange={(e) => setNewIdentifierInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddIdentifier(newIdentifierInput);
                            }
                          }}
                          className="rounded-xl border-primary/10 flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleAddIdentifier(newIdentifierInput)}
                          className="rounded-xl"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Dodaj
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista dodanych produktów (Tagi WOW) */}
                {productIdentifiers.length > 0 && (
                  <div className="space-y-2 bg-background/20 p-3 rounded-xl border border-primary/5">
                    <div className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Wybrane produkty do reguły ({productIdentifiers.length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {productIdentifiers.map((ident, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="flex items-center gap-1 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-primary border-primary/20 py-1 pl-2.5 pr-1 rounded-xl text-xs hover:border-red-500/40 hover:bg-red-500/5 group transition-all duration-200"
                        >
                          {ident}
                          <button
                            type="button"
                            onClick={() => handleRemoveIdentifier(idx)}
                            className="p-0.5 rounded-full hover:bg-red-500/20 text-muted-foreground group-hover:text-red-500 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Minimalna ilość sztuk */}
                {productIdentifiers.length > 0 && (
                  <div className="w-1/2">
                    <FormField
                      control={form.control}
                      name="min_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Minimalna ilość pasującego produktu</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Np. 10 sztuk (pełna paleta)" className="rounded-xl border-primary/10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Sekcja 4: Inne progi */}
              <div className="p-4 rounded-2xl border border-primary/5 bg-background/40 space-y-4">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  <Settings className="h-4 w-4 text-emerald-500" />
                  3. Pozostałe progi zamówienia (opcjonalne)
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="min_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Całkowita waga min (kg)</FormLabel>
                        <FormControl>
                          <Input placeholder="Np. 150" className="rounded-xl border-primary/10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Całkowita waga max (kg)</FormLabel>
                        <FormControl>
                          <Input placeholder="Np. 1000" className="rounded-xl border-primary/10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_total_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Łączna ilość min (szt.)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Np. 50" className="rounded-xl border-primary/10" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl"
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90 text-white font-medium shadow-lg shadow-primary/20">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz regułę
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
