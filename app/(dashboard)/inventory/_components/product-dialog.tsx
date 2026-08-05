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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Database,
  Sparkles,
  Search,
  RefreshCw,
  Zap,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

const formSchema = z.object({
  sku: z.string().min(1, "SKU jest wymagane"),
  name: z.string().min(1, "Nazwa jest wymagana"),
  stock_quantity: z.coerce.number().min(0, "Ilość nie może być ujemna"),
  base_price: z.coerce.number().min(0, "Cena nie może być ujemna"),
});

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProductDialog({ open, onOpenChange, onSuccess }: ProductDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [isLoading, setIsLoading] = useState(false);

  // Subiekt GT Search state
  const [erpIntegrations, setErpIntegrations] = useState<any[]>([]);
  const [selectedErpIntegId, setSelectedErpIntegId] = useState<number | null>(null);
  const [erpSearchQuery, setErpSearchQuery] = useState("");
  const [erpResults, setErpResults] = useState<any[]>([]);
  const [isSearchingErp, setIsSearchingErp] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "",
      name: "",
      stock_quantity: 0,
      base_price: 0,
    },
  });

  useEffect(() => {
    if (open) {
      // Fetch available service integrations
      api.get("/service-integrations").then((res) => {
        const erp = res.data.filter((i: any) => i.provider_type === "SUBIEKT_GT" && i.is_active);
        setErpIntegrations(erp);
        if (erp.length > 0) setSelectedErpIntegId(erp[0].id);
      });
    }
  }, [open]);

  // LIVE DEBOUNCED SEARCH for Subiekt GT ERP
  useEffect(() => {
    if (!selectedErpIntegId || !open) return;

    if (!erpSearchQuery.trim()) {
      setErpResults([]);
      setIsSearchingErp(false);
      return;
    }

    setIsSearchingErp(true);
    const handler = setTimeout(async () => {
      try {
        const res = await api.get(`/erp-proxy/integrations/${selectedErpIntegId}/products`, {
          params: { q: erpSearchQuery },
        });
        setErpResults(res.data || []);
      } catch (error) {
        console.error("ERP live search failed", error);
      } finally {
        setIsSearchingErp(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [erpSearchQuery, selectedErpIntegId, open]);

  // Generate random unique SKU helper
  const generateRandomSku = () => {
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const sku = `PROD-${randomPart}`;
    form.setValue("sku", sku);
    toast.success(`Wygenerowano symbol SKU: ${sku}`);
  };

  // Select item from ERP
  const handleSelectErpProduct = (item: any) => {
    form.setValue("sku", item.symbol || `ERP-${item.id}`);
    form.setValue("name", item.name || "");
    form.setValue("stock_quantity", item.stock_quantity || 0);
    form.setValue("base_price", item.price || 0);
    setActiveTab("manual");
    toast.success(`Wypełniono dane z Subiekt GT: ${item.symbol}`);
  };

  // Submit product creation
  async function onSubmit(data: any) {
    const values = data as z.infer<typeof formSchema>;
    try {
      setIsLoading(true);
      await api.post("/inventory/", values);
      toast.success(`Dodano produkt centralny: ${values.sku}`);
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Nie udało się dodać produktu.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Dodaj Produkt Centralny</DialogTitle>
              <DialogDescription className="mt-0.5">
                Stwórz wpis w magazynie centralnym ręcznie lub wyszukaj na żywo w Subiekt GT.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Formularz Ręczny
            </TabsTrigger>
            <TabsTrigger value="erp" className="flex items-center gap-1.5 text-xs">
              <Database className="h-3.5 w-3.5 text-primary" /> Szukaj w Subiekt GT (Live)
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Manual Form */}
          <TabsContent value="manual" className="space-y-4 pt-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Symbol / SKU</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateRandomSku}
                          className="h-6 text-[11px] text-primary hover:bg-primary/10"
                        >
                          <Zap className="h-3 w-3 mr-1" /> Wygeneruj SKU
                        </Button>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="np. PROD-1024 lub symbol z ERP"
                          {...field}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormDescription className="text-[11px]">
                        Unikalny identyfikator towaru (SKU) używany do łączenia z Allegro/ERP.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa Produktu</FormLabel>
                      <FormControl>
                        <Input placeholder="np. Słuchawki Bezprzewodowe ANC Pro" {...field} />
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
                        <FormLabel>Stan Magazynowy (szt.)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...field}
                            value={(field.value as any) ?? ""}
                            className="font-mono"
                          />
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
                        <FormLabel>Cena Bazowa (PLN)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            value={(field.value as any) ?? ""}
                            className="font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
                    {isLoading ? "Dodawanie..." : "Dodaj produkt do magazynu"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* TAB 2: LIVE Import from Subiekt GT */}
          <TabsContent value="erp" className="space-y-4 pt-3">
            {erpIntegrations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="font-semibold text-sm">Brak aktywnej integracji Subiekt GT</p>
                <p className="text-xs mt-1">Skonfiguruj agenta Subiekt GT w zakładce Integracje.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Live Input Field with integrated Spinner & Search Icon */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Wpisz nazwę lub symbol towaru z Subiekt GT (wyszukiwanie na żywo)..."
                    value={erpSearchQuery}
                    onChange={(e) => setErpSearchQuery(e.target.value)}
                    className="pl-9 pr-9 text-sm bg-background"
                    autoFocus
                  />
                  {isSearchingErp && (
                    <RefreshCw className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary" />
                  )}
                </div>

                <div className="max-h-[260px] overflow-y-auto border rounded-lg p-1 bg-card">
                  {isSearchingErp && erpResults.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Wyszukiwanie w bazie Subiekt GT na żywo...
                    </div>
                  ) : !erpSearchQuery.trim() ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Zacznij pisać nazwę lub symbol towaru, aby zobaczyć propozycje z Subiekt GT.
                    </div>
                  ) : erpResults.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Brak wyników dla frazy „{erpSearchQuery}” w Subiekt GT.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {erpResults.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectErpProduct(item)}
                          className="p-3 hover:bg-primary/5 rounded-md cursor-pointer transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-2">
                              <span>Symbol:</span>
                              <Badge variant="outline" className="bg-background">
                                {item.symbol}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-xs text-primary group-hover:bg-primary/10">
                            Wybierz <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
