// src/app/(dashboard)/orders/_components/manual-order-dialog.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ManualOrderSchema, ManualOrderSchemaType } from "@/lib/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ServiceIntegration } from "@/types/service-integration";
import { cn } from "@/lib/utils";

import {
  Trash2,
  Loader2,
  User,
  MapPin,
  Receipt,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Info,
  Package,
  Sparkles,
} from "lucide-react";

interface ManualOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
}

// Subcomponent: Address Fields styled beautifully
const AddressFields = ({ prefix }: { prefix: "delivery_address" }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      name={`${prefix}.first_name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Imię *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.last_name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Nazwisko *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.street`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-xs font-semibold text-muted-foreground">Ulica i numer *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.postal_code`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Kod pocztowy *</FormLabel>
          <FormControl>
            <Input placeholder="00-000" className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.city`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Miasto *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.phone_number`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-xs font-semibold text-muted-foreground">Numer telefonu *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  </div>
);

// Subcomponent: Pickup Point Fields
const PickupPointFields = ({ prefix }: { prefix: "pickup_point" }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      name={`${prefix}.point_id`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">ID Punktu Odbioru *</FormLabel>
          <FormControl>
            <Input placeholder="np. APM-123" className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Nazwa punktu *</FormLabel>
          <FormControl>
            <Input placeholder="np. Paczkomat WAW01A" className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.street`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-xs font-semibold text-muted-foreground">Ulica i numer *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.postal_code`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Kod pocztowy *</FormLabel>
          <FormControl>
            <Input placeholder="00-000" className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.city`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Miasto *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.description`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-xs font-semibold text-muted-foreground">Opis (opcjonalnie)</FormLabel>
          <FormControl>
            <Input placeholder="np. obok sklepu" className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  </div>
);

// Subcomponent: Invoice Address Fields
const InvoiceFields = ({ prefix }: { prefix: "invoice_address" }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField
      name={`${prefix}.company_name`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-xs font-semibold text-muted-foreground">Nazwa firmy</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.first_name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Imię</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.last_name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Nazwisko</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.tax_id`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-xs font-semibold text-muted-foreground">NIP</FormLabel>
          <FormControl>
            <Input placeholder="123-456-78-90" className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.street`}
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-xs font-semibold text-muted-foreground">Ulica i numer *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.postal_code`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Kod pocztowy *</FormLabel>
          <FormControl>
            <Input placeholder="00-000" className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
    <FormField
      name={`${prefix}.city`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-semibold text-muted-foreground">Miasto *</FormLabel>
          <FormControl>
            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
          </FormControl>
          <FormMessage className="text-[10px]" />
        </FormItem>
      )}
    />
  </div>
);

export function ManualOrderDialog({
  isOpen,
  setIsOpen,
  onSuccess,
}: ManualOrderDialogProps) {
  const methods = useForm<ManualOrderSchemaType>({
    resolver: zodResolver(ManualOrderSchema),
    defaultValues: {
      reference_number: "",
      buyer_login: "",
      buyer_email: "",
      line_items: [],
      deliveryType: "address",
      delivery_address: {
        first_name: "",
        last_name: "",
        street: "",
        city: "",
        postal_code: "",
        phone_number: "",
        country: "Polska",
      },
      has_invoice_address: false,
      note: "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: methods.control,
    name: "line_items",
  });

  const watchDeliveryType = methods.watch("deliveryType");
  const watchHasInvoice = methods.watch("has_invoice_address");

  // States for ERP / Inventory search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [subiektId, setSubiektId] = useState<number | null>(null);

  // Find Subiekt GT integration
  useEffect(() => {
    if (!isOpen) return;
    const checkSubiekt = async () => {
      try {
        const response = await api.get<ServiceIntegration[]>("/service-integrations");
        const subiekt = response.data.find((i) => i.provider_type === "SUBIEKT_GT");
        if (subiekt) {
          setSubiektId(subiekt.id);
        }
      } catch (e) {
        console.error("Nie udało się pobrać integracji dla autouzupełniania", e);
      }
    };
    checkSubiekt();
  }, [isOpen]);

  // Debounced search logic for ERP & Inventory
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (subiektId) {
          try {
            const response = await api.get<any[]>(`/erp-proxy/integrations/${subiektId}/products`, {
              params: { q: searchQuery },
            });
            setSearchResults(
              response.data.map((p) => ({
                id: p.id,
                name: p.name || "Brak nazwy",
                sku: p.symbol,
                price: 0.01,
                source: "ERP",
              }))
            );
          } catch (erpError) {
            console.warn("Błąd połączenia z ERP agentem, fallback na bazę lokalną", erpError);
            await fallbackLocalSearch();
          }
        } else {
          await fallbackLocalSearch();
        }
      } catch (e) {
        console.error("Błąd wyszukiwania produktów:", e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);

    async function fallbackLocalSearch() {
      const response = await api.get<any[]>("/inventory");
      const filtered = response.data.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(
        filtered.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.base_price || 0.01,
          source: "Magazyn",
        }))
      );
    }
  }, [searchQuery, subiektId]);

  // Handle adding product from search results to form list
  const handleAddProduct = (product: any) => {
    const existingIndex = fields.findIndex((f) => f.name === product.name);
    if (existingIndex > -1) {
      const currentQty = methods.getValues(`line_items.${existingIndex}.quantity`) || 0;
      methods.setValue(`line_items.${existingIndex}.quantity`, currentQty + 1);
    } else {
      append({
        name: product.name,
        quantity: 1,
        price: product.price || 0.01,
      });
    }
    setSearchQuery("");
    setSearchResults([]);
    toast.success(`Dodano: ${product.name}`);
  };

  // Sync state and fields when switching delivery type
  useEffect(() => {
    if (watchDeliveryType === "address") {
      methods.setValue("pickup_point", undefined);
      if (!methods.getValues("delivery_address")) {
        methods.setValue("delivery_address", {
          first_name: "",
          last_name: "",
          street: "",
          city: "",
          postal_code: "",
          phone_number: "",
          country: "Polska",
        });
      }
    } else if (watchDeliveryType === "pickup_point") {
      methods.setValue("delivery_address", undefined);
      if (!methods.getValues("pickup_point")) {
        methods.setValue("pickup_point", {
          point_id: "",
          name: "",
          street: "",
          city: "",
          postal_code: "",
          description: "",
        });
      }
    }
  }, [watchDeliveryType, methods]);

  useEffect(() => {
    if (!watchHasInvoice) {
      methods.setValue("invoice_address", undefined);
    } else {
      if (!methods.getValues("invoice_address")) {
        methods.setValue("invoice_address", {
          company_name: "",
          first_name: "",
          last_name: "",
          tax_id: "",
          street: "",
          city: "",
          postal_code: "",
          country: "Polska",
        });
      }
    }
  }, [watchHasInvoice, methods]);

  // live cart summary calculation
  const liveItems = methods.watch("line_items") || [];
  const cartTotal = useMemo(() => {
    return liveItems.reduce((acc, item) => {
      const q = Number(item?.quantity) || 0;
      const p = Number(item?.price) || 0;
      return acc + q * p;
    }, 0);
  }, [liveItems]);

  const onSubmit = async (values: ManualOrderSchemaType) => {
    if (values.line_items.length === 0) {
      toast.error("Wybierz lub dodaj przynajmniej jeden produkt.");
      return;
    }

    const payload = { ...values };
    if (values.deliveryType === "address") {
      payload.pickup_point = undefined;
    } else {
      payload.delivery_address = undefined;
    }
    if (!values.has_invoice_address) {
      payload.invoice_address = undefined;
    }
    // @ts-ignore
    delete payload.deliveryType;

    await toast.promise(api.post("/orders/manual", payload), {
      loading: "Tworzenie zamówienia...",
      success: () => {
        onSuccess();
        setIsOpen(false);
        methods.reset();
        return "Zamówienie ręczne zostało pomyślnie dodane!";
      },
      error: (err: any) =>
        err.response?.data?.detail || "Nie udało się zapisać zamówienia.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-6xl w-full bg-[#090b11]/98 border-white/10 backdrop-blur-3xl text-white shadow-2xl overflow-hidden p-0 rounded-3xl">
        {/* Glowing Ambient Background */}
        <div className="absolute -top-[150px] -right-[150px] w-[350px] h-[350px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-[150px] -left-[150px] w-[350px] h-[350px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="p-6 md:p-8 border-b border-white/5 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/20">
          <div>
            <DialogTitle className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Nowe zamówienie ręczne
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Wprowadź dane klienta i skompletuj zamówienie wybierając towary bezpośrednio z ERP lub magazynu.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-slate-950/40 border-white/5 text-muted-foreground">
              Status: MANUALNY
            </Badge>
          </div>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-8 max-h-[65vh] overflow-y-auto pr-4 scrollbar-thin">
              
              {/* LEWA KOLUMNA: Klient, Dostawa i Faktura (7/12) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Dane Kupującego */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-400" />
                    Dane kupującego
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      name="buyer_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">E-mail *</FormLabel>
                          <FormControl>
                            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="buyer_login"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">Login Allegro (opcjonalnie)</FormLabel>
                          <FormControl>
                            <Input className="h-9 text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 2. Dane Dostawy */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-400" />
                      Dostawa zamówienia
                    </h3>
                    <FormField
                      name="deliveryType"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex gap-2"
                            >
                              <FormItem className="flex items-center space-x-1.5 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="address" className="h-3.5 w-3.5" />
                                </FormControl>
                                <FormLabel className="text-xs font-bold text-muted-foreground cursor-pointer">Kurier</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-1.5 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="pickup_point" className="h-3.5 w-3.5" />
                                </FormControl>
                                <FormLabel className="text-xs font-bold text-muted-foreground cursor-pointer">Paczkomat/Punkt</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchDeliveryType === "address" && (
                    <AddressFields prefix="delivery_address" />
                  )}
                  {watchDeliveryType === "pickup_point" && (
                    <PickupPointFields prefix="pickup_point" />
                  )}
                </div>

                {/* 3. Dane do Faktury */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-indigo-400" />
                      Chcę otrzymać fakturę
                    </h3>
                    <FormField
                      name="has_invoice_address"
                      render={({ field }) => (
                        <FormItem className="space-y-0 flex items-center">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchHasInvoice && (
                    <div className="pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                      <InvoiceFields prefix="invoice_address" />
                    </div>
                  )}
                </div>

                {/* 4. Uwagi do zamówienia */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <Info className="h-4 w-4 text-indigo-400" />
                    Uwagi i komentarze
                  </h3>
                  <FormField
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Wpisz uwagi wewnętrzne lub życzenia klienta..."
                            className="text-xs bg-slate-950/40 border-white/10 hover:bg-slate-950/60 focus:ring-primary/30 transition-all rounded-xl min-h-[70px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* PRAWA KOLUMNA: Wyszukiwarka, Koszyk i Podsumowanie (5/12) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 1. Koszyk i Wyszukiwanie */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/20 p-5 space-y-4 flex flex-col min-h-[350px]">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-indigo-400" />
                    Pozycje zamówienia
                  </h3>

                  {/* Smart Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder="Wyszukaj produkt z ERP (Subiekt) lub bazy..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs bg-slate-950/50 border-white/10 focus-visible:ring-primary/20 hover:border-white/20 transition-all rounded-xl placeholder:text-muted-foreground/40"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground/60" />
                    )}

                    {/* Auto-suggest dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1.5 border border-white/10 rounded-2xl bg-slate-950/95 backdrop-blur-2xl max-h-52 overflow-y-auto divide-y divide-white/5 shadow-2xl p-1">
                        {searchResults.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleAddProduct(product)}
                            className="w-full text-left px-3 py-2 text-[11px] hover:bg-white/5 transition-all rounded-lg flex items-center justify-between group gap-2"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-white group-hover:text-primary transition-colors truncate">
                                {product.name}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-mono truncate">
                                SKU: {product.sku}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {product.source === "ERP" ? (
                                <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] h-4">
                                  Subiekt
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] h-4">
                                  Baza
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected items list */}
                  <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1 scrollbar-thin">
                    {fields.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-44 text-muted-foreground/40 border border-dashed border-white/5 rounded-2xl p-4">
                        <Package className="h-8 w-8 mb-2" />
                        <p className="text-[11px] text-center">Brak dodanych produktów. Użyj wyszukiwarki powyżej, aby skompletować koszyk.</p>
                      </div>
                    ) : (
                      fields.map((item, index) => {
                        const qty = methods.watch(`line_items.${index}.quantity`) || 0;
                        const price = methods.watch(`line_items.${index}.price`) || 0;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/5 bg-slate-950/20 hover:border-white/10 transition-all duration-200"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs truncate text-white" title={item.name}>
                                {item.name}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {(price * qty).toFixed(2)} PLN
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Quantity selector */}
                              <div className="flex items-center gap-1 bg-slate-950/60 border border-white/5 rounded-lg p-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 rounded hover:bg-white/5"
                                  onClick={() => {
                                    const cVal = methods.getValues(`line_items.${index}.quantity`) || 1;
                                    if (cVal > 1) {
                                      methods.setValue(`line_items.${index}.quantity`, cVal - 1);
                                    }
                                  }}
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <span className="w-6 text-center text-[10px] font-bold font-mono">
                                  {qty}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 rounded hover:bg-white/5"
                                  onClick={() => {
                                    const cVal = methods.getValues(`line_items.${index}.quantity`) || 1;
                                    methods.setValue(`line_items.${index}.quantity`, cVal + 1);
                                  }}
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              </div>

                              {/* Price input */}
                              <div className="relative w-16">
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-6 text-[10px] font-mono font-bold text-right pl-1 pr-1 bg-slate-950/40 border-white/5 focus-visible:ring-primary/20 rounded-lg"
                                  {...methods.register(`line_items.${index}.price`, { valueAsNumber: true })}
                                />
                              </div>

                              {/* Remove item */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Summary Box */}
                  <div className="bg-gradient-to-br from-primary/10 via-indigo-500/5 to-transparent border border-primary/20 rounded-2xl p-4 mt-auto">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-widest">
                          Razem do zapłaty
                        </span>
                        <p className="text-[10px] text-muted-foreground">Suma pozycji koszyka</p>
                      </div>
                      <span className="text-xl font-black font-mono premium-gradient-text">
                        {cartTotal.toFixed(2)} PLN
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <DialogFooter className="p-6 border-t border-white/5 bg-slate-950/20 sm:justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl border border-white/5 hover:bg-white/5 text-xs text-muted-foreground hover:text-white transition-all h-9 px-4"
                onClick={() => setIsOpen(false)}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={methods.formState.isSubmitting}
                className="h-9 rounded-xl px-5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white text-xs font-bold shadow-md shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] border-none transition-all duration-300"
              >
                {methods.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Utwórz zamówienie
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
