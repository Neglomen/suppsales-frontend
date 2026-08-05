"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Settings2,
  RefreshCw,
  Plus,
  Package,
  Layers,
  Search,
  ShoppingCart,
  ExternalLink,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { LinkOfferDialog } from "../_components/link-offer-dialog";
import { OfferConfigModal } from "../_components/offer-config-modal";
import { ConfirmDeleteModal } from "../_components/confirm-delete-modal";
import { SyncLogsCard } from "./_components/sync-logs-card";
import { ProductSalesCard } from "./_components/product-sales-card";

const formSchema = z.object({
  sku: z.string().min(1, "Symbol SKU z ERP jest wymagany"),
  name: z.string().min(1, "Nazwa jest wymagana"),
  stock_quantity: z.coerce.number().min(0, "Ilość nie może być ujemna"),
  base_price: z.coerce.number().min(0, "Cena nie może być ujemna").optional(),
  stock_management_mode: z.string().default("ERP_LOCK"),
});

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"sales" | "logs">("sales");

  // Modal configuration & Delete safety modals state
  const [selectedOfferForConfig, setSelectedOfferForConfig] = useState<any>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<any>(null);
  const [isDeleteOfferModalOpen, setIsDeleteOfferModalOpen] = useState(false);

  // Live ERP Product Search States
  const [erpSearchQuery, setErpSearchQuery] = useState("");
  const [erpSearchResults, setErpSearchResults] = useState<any[]>([]);
  const [isErpSearching, setIsErpSearching] = useState(false);
  const [showErpSearchDropdown, setShowErpSearchDropdown] = useState(false);

  useEffect(() => {
    if (!erpSearchQuery || erpSearchQuery.trim().length < 2) {
      setErpSearchResults([]);
      setIsErpSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsErpSearching(true);
        const res = await api.get(`/inventory/search-erp-products?q=${encodeURIComponent(erpSearchQuery.trim())}`);
        setErpSearchResults(res.data || []);
      } catch (err) {
        console.error("Error searching ERP products:", err);
      } finally {
        setIsErpSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [erpSearchQuery]);

  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      
      let prodData = null;
      try {
        const prodRes = await api.get(`/inventory/${params.id}`);
        prodData = prodRes.data;
      } catch (err: any) {
        console.error("Error fetching product by ID", err);
      }

      if (!prodData) {
        toast.error("Produkt nie istnieje lub serwer jest nieosiągalny.");
        router.push("/inventory");
        return;
      }

      setProduct(prodData);

      try {
        const integRes = await api.get("/service-integrations");
        setIntegrations(integRes.data || []);
      } catch (integErr) {
        console.warn("Could not fetch service integrations:", integErr);
      }

      form.reset({
        sku: prodData.sku || "",
        name: prodData.name || "",
        stock_quantity: prodData.stock_quantity ?? 0,
        base_price: prodData.base_price || 0,
        stock_management_mode: prodData.stock_management_mode || "ERP_LOCK",
      });
    } catch (error) {
      console.error("Failed to fetch product details", error);
      toast.error("Nie udało się załadować produktu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const onSubmit = async (data: any) => {
    const values = data as z.infer<typeof formSchema>;
    try {
      setIsSaving(true);
      await api.put(`/inventory/${params.id}`, values);
      toast.success("Dane produktu zostały zaktualizowane i zlecono synchronizację.");
      fetchProduct();
    } catch (error) {
      toast.error("Nie udało się zapisać zmian.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    try {
      await api.delete(`/inventory/${params.id}`);
      toast.success(`Produkt ${product?.sku} został pomyślnie usunięty z magazynu.`);
      router.push("/inventory");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Nie udało się usunąć produktu.");
    }
  };

  const handleConfirmDeleteOffer = async () => {
    if (!offerToDelete) return;
    try {
      await api.delete(`/inventory/${params.id}/channel-offers/${offerToDelete.id}`);
      toast.success("Powiązanie z aukcją zostało usunięte.");
      setOfferToDelete(null);
      fetchProduct();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Nie udało się usunąć powiązania.");
    }
  };

  const triggerManualSync = async () => {
    try {
      toast.loading("Wysyłanie synchronizacji do kanałów...", { id: "manual-sync" });
      await api.post(`/inventory/${params.id}/sync`);
      toast.success("Synchronizacja została zlecona!", { id: "manual-sync" });
      fetchProduct();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Błąd podczas zlecania synchronizacji.", { id: "manual-sync" });
    }
  };

  const getIntegrationName = (integId: number) => {
    const found = integrations.find((i) => i.id === integId);
    if (!found) return `Integracja #${integId}`;
    return `${found.name} (${found.provider_type})`;
  };

  const renderPriceRuleBadge = (offer: any) => {
    const rule = offer.price_rule || "BASE";
    const baseP = Number(product?.base_price) || 0;

    if (rule === "ADD_AMOUNT") {
      const added = Number(offer.price_markup_amount) || 0;
      const total = (baseP + added).toFixed(2);
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs font-medium">
          + {added} zł ({total} zł)
        </Badge>
      );
    } else if (rule === "SUB_AMOUNT") {
      const subbed = Number(offer.price_markup_amount) || 0;
      const total = Math.max(0.01, baseP - subbed).toFixed(2);
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs font-medium">
          - {subbed} zł ({total} zł)
        </Badge>
      );
    } else if (rule === "ADD_PERCENT") {
      const pct = Number(offer.price_markup_percent) || 0;
      const total = (baseP * (1 + pct / 100)).toFixed(2);
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs font-medium">
          + {pct}% ({total} zł)
        </Badge>
      );
    } else if (rule === "SUB_PERCENT") {
      const pct = Number(offer.price_markup_percent) || 0;
      const total = Math.max(0.01, baseP * (1 - pct / 100)).toFixed(2);
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs font-medium">
          - {pct}% ({total} zł)
        </Badge>
      );
    } else if (rule === "FIXED" && offer.override_price != null) {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
          Stała {Number(offer.override_price).toFixed(2)} zł
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        1:1 ({baseP.toFixed(2)} zł)
      </Badge>
    );
  };

  const renderStockRuleBadge = (offer: any) => {
    const rule = offer.sync_rule || "ERP_MIRROR";
    if (rule === "BUFFER") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
          Bufor -{offer.safety_buffer || 0} szt.
        </Badge>
      );
    } else if (rule === "FIXED_CAP") {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
          Max {offer.max_auction_quantity || 1} szt.
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Lustro 1:1
      </Badge>
    );
  };

  const renderOfferStatusBadge = (offer: any) => {
    const status = offer.offer_status || "ACTIVE";
    if (status === "ENDED" || (product?.effective_available_stock === 0 && offer.sync_stock_enabled !== false)) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] font-semibold flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span> Zamknięta (0 szt.)
        </Badge>
      );
    } else if (status === "PAUSED") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Wstrzymana
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Aktywna
      </Badge>
    );
  };

  const handleToggleProductActive = async (newVal: boolean) => {
    try {
      toast.loading(newVal ? "Włączanie synchronizacji produktu..." : "Dezaktywacja synchronizacji produktu...", { id: "toggle-active" });
      await api.put(`/inventory/${params.id}`, { is_active: newVal });
      toast.success(newVal ? "Produkt został aktywowany (synchronizacja włączona)." : "Produkt został wyłączony z synchronizacji.", { id: "toggle-active" });
      fetchProduct();
    } catch (err: any) {
      toast.error("Nie udało się zmienić statusu aktywacji produktu.", { id: "toggle-active" });
    }
  };

  const handleToggleOfferSync = async (offer: any, type: "stock" | "price", enabled: boolean) => {
    try {
      const payload: any = {};
      if (type === "stock") payload.sync_stock_enabled = enabled;
      if (type === "price") payload.sync_price_enabled = enabled;

      toast.loading(`Aktualizowanie opcji sync dla aukcji ${offer.external_offer_id}...`, { id: "toggle-offer-sync" });
      await api.put(`/inventory/channel-offers/${offer.id}/rule`, payload);
      toast.success(enabled ? "Włączono synchronizację dla źródła!" : "Wyłączono synchronizację dla źródła!", { id: "toggle-offer-sync" });
      fetchProduct();
    } catch (err: any) {
      toast.error("Nie udało się zaktualizować ustawień aukcji.", { id: "toggle-offer-sync" });
    }
  };

  const handleFetchErpStock = async () => {
    if (product?.stock_management_mode === "RESERVATION") {
      const confirmSync = window.confirm(
        "Uwaga: Jesteś w trybie rezerwacji. Pobranie stanu z ERP nadpisze lokalną ilość, a rezerwacje dla niezrealizowanych zamówień zostaną przeliczone na nowo. Czy chcesz kontynuować?"
      );
      if (!confirmSync) return;
    }

    try {
      toast.loading("Pobieranie stanu z Subiekt GT...", { id: "fetch-erp-stock" });
      const res = await api.post(`/inventory/${params.id}/fetch-erp-stock`);
      toast.success(res.data.message || "Pobrano stan z ERP!", { id: "fetch-erp-stock" });
      fetchProduct();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Błąd pobierania stanu z Subiekt GT.", { id: "fetch-erp-stock" });
    }
  };

  if (isLoading && !product) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-36 bg-muted/70 rounded-lg" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-muted/80 rounded-lg" />
              <div className="h-4 w-32 bg-muted/50 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-40 bg-muted/60 rounded-lg" />
            <div className="h-9 w-44 bg-muted/60 rounded-lg" />
          </div>
        </div>

        {/* Layout Skeleton */}
        <div className="grid gap-6 md:grid-cols-5">
          <Card className="md:col-span-2 shadow-sm border">
            <CardHeader className="space-y-2">
              <div className="h-6 w-36 bg-muted/80 rounded" />
              <div className="h-4 w-52 bg-muted/50 rounded" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 bg-muted/40 rounded-lg" />
              <div className="h-10 bg-muted/40 rounded-lg" />
              <div className="h-10 bg-muted/40 rounded-lg" />
              <div className="h-24 bg-muted/30 rounded-lg mt-4" />
            </CardContent>
          </Card>

          <Card className="md:col-span-3 shadow-sm border">
            <CardHeader className="space-y-2 flex flex-row items-center justify-between">
              <div>
                <div className="h-6 w-48 bg-muted/80 rounded" />
                <div className="h-4 w-64 bg-muted/50 rounded mt-1" />
              </div>
              <div className="h-8 w-32 bg-muted/60 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-14 bg-muted/40 rounded-lg" />
              <div className="h-14 bg-muted/40 rounded-lg" />
              <div className="h-14 bg-muted/40 rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {/* Sleek, Compact Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/inventory")} className="h-8 px-2 hover:bg-muted" title="Wróć do magazynu">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Produkt: <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary font-bold">{product?.sku}</code>
              </h2>
              <Badge variant="secondary" className="text-[9px] uppercase font-bold tracking-wider px-1.5 h-4 bg-muted/60 text-muted-foreground">
                Karta
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[280px] sm:max-w-md mt-0.5" title={product?.name}>
              {product?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Global Product Active Toggle */}
          <div className="flex items-center gap-2 bg-card border border-border/30 px-2.5 py-1 rounded-md shadow-sm h-8">
            <Switch
              id="product-active-switch"
              checked={product?.is_active !== false}
              onCheckedChange={handleToggleProductActive}
              className="scale-75"
            />
            <Label htmlFor="product-active-switch" className="cursor-pointer text-[10px] font-bold select-none whitespace-nowrap">
              {product?.is_active !== false ? (
                <span className="text-emerald-500 flex items-center gap-1">
                  Sync WŁ
                </span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1">
                  Sync WYŁ
                </span>
              )}
            </Label>
          </div>

          <Button 
            onClick={handleFetchErpStock} 
            variant="outline" 
            size="sm"
            className="h-8 px-2.5 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 text-xs font-semibold"
          >
            <RefreshCw className="mr-1 h-3 w-3" /> Subiekt
          </Button>
          
          <Button 
            onClick={triggerManualSync} 
            size="sm"
            className="h-8 px-2.5 bg-primary hover:bg-primary/95 text-xs font-semibold text-white"
          >
            <RefreshCw className="mr-1 h-3 w-3" /> Wyślij sync
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteProductModalOpen(true)}
            className="h-8 px-2.5 bg-red-600 hover:bg-red-700 text-xs font-semibold text-white"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Usuń
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Left Column: Product Info Form */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Dane Produktu
            </CardTitle>
            <CardDescription className="text-xs">
              Zmiana symbolu ERP, ilości lub ceny bazowej przeliczy ceny i stany na aukcjach.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel className="text-xs font-semibold flex items-center justify-between">
                        <span>Symbol Towaru z ERP (Subiekt GT)</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Wyszukaj z bazy ERP 🔍</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            value={(field.value as any) ?? ""}
                            onChange={(e) => {
                              field.onChange(e);
                              setErpSearchQuery(e.target.value);
                              setShowErpSearchDropdown(true);
                            }}
                            onFocus={() => {
                              if (field.value) {
                                setErpSearchQuery(field.value);
                              }
                              setShowErpSearchDropdown(true);
                            }}
                            className="font-mono text-sm pr-8"
                            placeholder="Wpisz lub wyszukaj symbol Subiekt GT..."
                          />
                          {isErpSearching ? (
                            <RefreshCw className="h-4 w-4 absolute right-2.5 top-2.5 text-muted-foreground animate-spin" />
                          ) : (
                            <Search className="h-4 w-4 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                          )}
                        </div>
                      </FormControl>

                      {/* ERP Search Dropdown */}
                      {showErpSearchDropdown && erpSearchResults.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-[68px] bg-popover border rounded-lg shadow-xl max-h-60 overflow-y-auto p-1 text-xs">
                          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase border-b mb-1 flex items-center justify-between">
                            <span>Znalezione towary w Subiekt GT ({erpSearchResults.length})</span>
                            <button
                              type="button"
                              onClick={() => setShowErpSearchDropdown(false)}
                              className="text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              Zamknij ✕
                            </button>
                          </div>
                          {erpSearchResults.map((erpItem) => (
                            <div
                              key={erpItem.id}
                              className="p-2 hover:bg-accent rounded-md cursor-pointer transition-colors flex items-center justify-between"
                              onClick={() => {
                                form.setValue("sku", erpItem.symbol);
                                if (!form.getValues("name") || form.getValues("name") === product?.name) {
                                  if (erpItem.name) {
                                    form.setValue("name", erpItem.name);
                                  }
                                }
                                setShowErpSearchDropdown(false);
                                toast.success(`Wybrano symbol ${erpItem.symbol} z Subiekt GT!`);
                              }}
                            >
                              <div>
                                <div className="font-mono font-bold text-primary text-xs">{erpItem.symbol}</div>
                                {erpItem.name && <div className="text-[11px] text-muted-foreground truncate max-w-[220px]">{erpItem.name}</div>}
                              </div>
                              <Badge variant="outline" className="text-[9px]">Subiekt GT</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Nazwa Produktu</FormLabel>
                      <FormControl>
                        <Input {...field} value={(field.value as any) ?? ""} className="text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Stan Magazynowy (szt.)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} value={(field.value as any) ?? ""} className="font-mono text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="base_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Cena Bazowa (PLN)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} value={(field.value as any) ?? ""} className="font-mono text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="stock_management_mode"
                  render={({ field }) => (
                    <FormItem className="space-y-2 mt-3">
                      <FormLabel className="text-xs">Tryb Zarządzania Magazynem</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => field.onChange("ERP_LOCK")}
                            className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-28 hover:shadow-md hover:border-primary/50 ${
                              field.value === "ERP_LOCK"
                                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                : "border-border/60 bg-card text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                              <span>🔒</span> Zestrojony z ERP
                            </div>
                            <span className="text-[10px] leading-relaxed mt-1 text-muted-foreground">
                              Stan ściśle z Subiekt GT. Rezerwacje odejmowane dynamicznie w locie.
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => field.onChange("RESERVATION")}
                            className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-28 hover:shadow-md hover:border-primary/50 ${
                              field.value === "RESERVATION"
                                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                : "border-border/60 bg-card text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                              <span>📦</span> Tryb rezerwacji
                            </div>
                            <span className="text-[10px] leading-relaxed mt-1 text-muted-foreground">
                              Trwałe rezerwowanie sztuk od razu po zamówieniu. FV zwalnia rezerwację.
                            </span>
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isSaving} className="w-full bg-primary hover:bg-primary/90 mt-2">
                  {isSaving ? "Zapisywanie..." : "Zapisz i Prześlij do Kanałów"}
                </Button>
              </form>
            </Form>

            {/* Dynamic ERP Stock & Pending Sales Breakdown */}
            <div className="mt-6 pt-4 border-t border-border/10 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5 text-primary">
                  <RefreshCw className="h-3.5 w-3.5 text-primary" /> Stan & Rezerwacje
                </span>
                <Button variant="ghost" size="sm" onClick={handleFetchErpStock} className="h-7 px-2 text-[11px] text-primary hover:bg-primary/5 transition-all">
                  Odśwież z ERP
                </Button>
              </div>

              {product?.stock_management_mode === "RESERVATION" ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 rounded-xl bg-card border border-border/20 shadow-sm flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Fizyczny w ERP</span>
                      <span className="font-mono font-extrabold text-lg text-foreground mt-1">
                        {(product?.stock_quantity ?? 0) + (product?.reserved_quantity ?? 0)}
                      </span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">sztuk</span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold opacity-80 tracking-wide">Rezerwacje</span>
                      <span className="font-mono font-extrabold text-lg mt-1">
                        -{product?.reserved_quantity ?? 0}
                      </span>
                      <span className="text-[9px] opacity-80 mt-0.5">sztuk</span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold opacity-80 tracking-wide">Na aukcje</span>
                      <span className="font-mono font-extrabold text-lg mt-1">
                        {product?.stock_quantity ?? 0}
                      </span>
                      <span className="text-[9px] opacity-80 mt-0.5">sztuk</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight text-center italic">
                    * W trybie rezerwacji stan na aukcjach jest na sztywno pomniejszany o zarezerwowane sztuki w bazie danych.
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 rounded-xl bg-card border border-border/20 shadow-sm flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Fizyczny w ERP</span>
                      <span className="font-mono font-extrabold text-lg text-foreground mt-1">
                        {product?.stock_quantity ?? 0}
                      </span>
                      <span className="text-[9px] text-muted-foreground mt-0.5">sztuk</span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold opacity-80 tracking-wide">Rezerwacje</span>
                      <span className="font-mono font-extrabold text-lg mt-1">
                        -{product?.uninvoiced_sold_quantity ?? 0}
                      </span>
                      <span className="text-[9px] opacity-80 mt-0.5">sztuk</span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold opacity-80 tracking-wide">Na aukcje</span>
                      <span className="font-mono font-extrabold text-lg mt-1">
                        {product?.effective_available_stock ?? product?.stock_quantity ?? 0}
                      </span>
                      <span className="text-[9px] opacity-80 mt-0.5">sztuk</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight text-center italic">
                    * Rezerwacje odejmują się od stanu z Subiekta do momentu wystawienia faktury/WZ w ERP.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Linked Offers Table */}
        <Card className="md:col-span-3 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-500" /> Powiązane Aukcje & Reguły ({product?.channel_offers?.length || 0})
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Konfiguruj ID aukcji, narzuty cenowe, niezależne włączanie/wyłączanie synchronizacji ceny i stanów.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsLinkDialogOpen(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> Podepnij Aukcję
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {product?.channel_offers?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs border border-dashed border-white/5 rounded-2xl bg-slate-950/20">
                  Brak podpiętych aukcji. Kliknij <b className="text-primary font-semibold cursor-pointer" onClick={() => setIsLinkDialogOpen(true)}>+ Podepnij Aukcję</b>, aby powiązać ofertę Allegro/Empik.
                </div>
              ) : (
                product?.channel_offers?.map((offer: any) => {
                  const integration = integrations.find((i) => i.id === offer.service_integration_id);
                  const providerType = integration?.provider_type || "UNKNOWN";
                  const integrationName = integration ? integration.name : `Integracja #${offer.service_integration_id}`;
                  
                  const offerLink = providerType === "ALLEGRO" 
                    ? `https://allegro.pl/oferta/${offer.external_offer_id}`
                    : providerType === "EMPIK"
                    ? `https://www.empik.com/p,${offer.external_offer_id}`
                    : null;

                  const providerStyle = providerType === "ALLEGRO"
                    ? { bg: "bg-orange-500/10 border-orange-500/20 text-orange-500", label: "Allegro" }
                    : providerType === "EMPIK"
                    ? { bg: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 dark:text-yellow-400", label: "Empik" }
                    : { bg: "bg-blue-500/10 border-blue-500/20 text-blue-400", label: providerType };

                  return (
                    <div 
                      key={offer.id} 
                      className="p-4 rounded-xl border border-white/5 bg-slate-950/20 hover:bg-slate-950/40 hover:border-white/10 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: Provider & Links */}
                      <div className="space-y-2.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`${providerStyle.bg} font-bold px-2 py-0.5 text-[10px] tracking-wider uppercase`}>
                            {providerStyle.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium truncate max-w-[200px]" title={integrationName}>
                            {integrationName}
                          </span>
                          {renderOfferStatusBadge(offer)}
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">ID Oferty:</span>
                            {offerLink ? (
                              <a
                                href={offerLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold font-mono text-primary hover:underline flex items-center gap-1 group"
                              >
                                {offer.external_offer_id}
                                <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <span className="text-xs font-bold font-mono text-slate-200">{offer.external_offer_id}</span>
                            )}
                          </div>

                          {offer.channel_sku && offer.channel_sku !== offer.external_offer_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted-foreground">SKU w Kanale:</span>
                              <span className="text-[11px] font-mono text-slate-300 font-medium truncate">{offer.channel_sku}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Rules & Synchronizations */}
                      <div className="flex flex-wrap items-center gap-4 lg:justify-center">
                        {/* Rules badging */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cena:</span>
                            {renderPriceRuleBadge(offer)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Stan:</span>
                            {renderStockRuleBadge(offer)}
                          </div>
                        </div>

                        {/* Sync Toggles as Pill Buttons */}
                        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/50 border border-white/5">
                          <button
                            type="button"
                            onClick={() => handleToggleOfferSync(offer, "price", offer.sync_price_enabled === false)}
                            className={`text-[10px] px-2.5 py-1 rounded-md transition-all cursor-pointer font-bold ${
                              offer.sync_price_enabled !== false
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                : "text-muted-foreground opacity-50 hover:opacity-100"
                            }`}
                            title="Kliknij, aby przełączyć synchronizację ceny"
                          >
                            Cena: {offer.sync_price_enabled !== false ? "WŁ" : "WYŁ"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleOfferSync(offer, "stock", offer.sync_stock_enabled === false)}
                            className={`text-[10px] px-2.5 py-1 rounded-md transition-all cursor-pointer font-bold ${
                              offer.sync_stock_enabled !== false
                                ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                                : "text-muted-foreground opacity-50 hover:opacity-100"
                            }`}
                            title="Kliknij, aby przełączyć synchronizację stanu"
                          >
                            Stan: {offer.sync_stock_enabled !== false ? "WŁ" : "WYŁ"}
                          </button>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center justify-end gap-1 border-t border-white/5 pt-3 lg:pt-0 lg:border-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOfferForConfig(offer);
                            setIsConfigModalOpen(true);
                          }}
                          className="h-8 text-xs text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                        >
                          <Settings2 className="h-3.5 w-3.5" /> Edytuj
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setOfferToDelete(offer);
                            setIsDeleteOfferModalOpen(true);
                          }}
                          className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sleek bottom Tabbed panel for Logs vs Sales History */}
      <div className="space-y-4 mt-6">
        <div className="flex border-b border-border/20 pb-px gap-2">
          <button
            onClick={() => setBottomTab("sales")}
            className={cn(
              "px-5 py-2.5 text-sm font-bold transition-all border-b-2 -mb-px flex items-center gap-2",
              bottomTab === "sales"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            Ruch na Towarze & Sprzedaż
          </button>
          <button
            onClick={() => setBottomTab("logs")}
            className={cn(
              "px-5 py-2.5 text-sm font-bold transition-all border-b-2 -mb-px flex items-center gap-2",
              bottomTab === "logs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <RefreshCw className="h-4 w-4" />
            Historia Synchronizacji
          </button>
        </div>

        <div className="transition-all duration-300">
          {bottomTab === "sales" ? (
            <ProductSalesCard productId={params.id as string} />
          ) : (
            <SyncLogsCard productId={params.id as string} />
          )}
        </div>
      </div>

      {/* Dialog for linking a new offer */}
      <LinkOfferDialog
        productId={params.id as string}
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        onSuccess={fetchProduct}
      />

      {/* Modal for editing offer ID, price rules (+5 PLN, +15%), and stock rules */}
      {selectedOfferForConfig && (
        <OfferConfigModal
          offer={selectedOfferForConfig}
          basePrice={Number(product?.base_price) || 0}
          baseStock={Number(product?.stock_quantity) || 0}
          open={isConfigModalOpen}
          onOpenChange={setIsConfigModalOpen}
          onSuccess={fetchProduct}
        />
      )}

      {/* Safety Confirmation Modal: Delete Entire Product */}
      <ConfirmDeleteModal
        title="Czy na pewno chcesz usunąć ten produkt z magazynu?"
        description={`Usunięcie produktu zniknie go bezpowrotnie z systemu wraz ze wszystkimi (${product?.channel_offers?.length || 0}) powiązanymi aukcjami oraz historią zdarzeń synchronizacji.`}
        itemName={product?.name}
        itemSku={product?.sku}
        requireTypedConfirmation={true}
        confirmationText="USUŃ"
        open={isDeleteProductModalOpen}
        onOpenChange={setIsDeleteProductModalOpen}
        onConfirm={handleConfirmDeleteProduct}
      />

      {/* Safety Confirmation Modal: Delete Offer Link */}
      <ConfirmDeleteModal
        title="Usunąć powiązanie z aukcją?"
        description={`Odpięcie aukcji ID "${offerToDelete?.external_offer_id}" sprawi, że stany magazynowe z SuppSales przestaną się na niej automatycznie aktualizować.`}
        itemName={`Aukcja ID: ${offerToDelete?.external_offer_id}`}
        requireTypedConfirmation={false}
        open={isDeleteOfferModalOpen}
        onOpenChange={setIsDeleteOfferModalOpen}
        onConfirm={handleConfirmDeleteOffer}
      />
    </div>
  );
}
