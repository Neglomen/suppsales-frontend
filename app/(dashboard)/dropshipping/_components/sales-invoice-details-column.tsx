"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/api";
import { Thread } from "@/types/thread";
import {
  Loader2,
  FilePlus2,
  FileText,
  User,
  Building,
  ShoppingCart,
  ScrollText,
  Truck,
  AlertCircle,
  MessageSquare,
  Edit,
  CheckCircle2,
  KeyRound,
  Sparkles,
  ChevronsUpDown,
  Check,
  Sliders,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMemo, useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatPanel } from "../../orders/[id]/_components/chat-panel";
import { EditInvoiceDataDialog } from "@/components/shared/edit-invoice-data-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapOrderToMappedDetails } from "@/lib/mappers/order-mapper";
import { MappedOrderDetails, OrderDetailsRead } from "@/types/order-schemas";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ProductErpMapping } from "@/types/product-erp-mapping";
import { ServiceIntegration } from "@/types/service-integration";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";

// ========================================================================
// === KOMPONENTY POMOCNICZE (BEZ ZMIAN) ==================================
// ========================================================================

interface SalesInvoiceDetailsProps {
  selectedOrderId: string | null;
}

function InvoicePreview({ invoice }: { invoice: any }) {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-bold mb-1">
          Faktura nr {invoice.invoiceNumber}
        </h2>
        <p className="text-sm text-muted-foreground">
          Wystawiono dnia:{" "}
          {new Date(invoice.issueDate).toLocaleDateString("pl-PL")}
        </p>
      </div>
      <div className="mt-6 p-8 border-2 border-dashed rounded-lg text-center flex-grow flex items-center justify-center">
        <div className="text-muted-foreground">
          <FileText className="mx-auto h-16 w-16 mb-4" />
          <p>Podgląd wygenerowanego PDF pojawi się tutaj w przyszłości.</p>
        </div>
      </div>
      <div className="mt-6 flex-shrink-0 space-x-2">
        <Button disabled>Pobierz PDF</Button>
        <Button variant="outline" disabled>
          Wyślij e-mail
        </Button>
      </div>
    </div>
  );
}

// ========================================================================
// === NOWY KOMPONENT: Inteligentne pole do wyszukiwania produktów =======
// ========================================================================

interface ErpProduct {
  id: number;
  symbol: string;
  name: string | null;
}

interface SubiektProductComboboxProps {
  erpIntegrationId: number;
  value: string;
  onValueChange: (value: string) => void;
}

function SubiektProductCombobox({
  erpIntegrationId,
  value,
  onValueChange,
}: SubiektProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const { data: products, isLoading: isProductsLoading } = useQuery<
    ErpProduct[]
  >({
    queryKey: ["subiektProducts", erpIntegrationId, debouncedSearchQuery],
    queryFn: async () => {
      const response = await api.get(
        `/erp-proxy/integrations/${erpIntegrationId}/products`,
        { params: { q: debouncedSearchQuery } }
      );
      return response.data;
    },
    enabled: !!erpIntegrationId && open,
  });

  const selectedProduct = useMemo(() => {
    return products?.find(
      (p) => p.symbol.toUpperCase() === value.toUpperCase()
    );
  }, [products, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 text-xs font-normal"
        >
          <span className="truncate">
            {value
              ? selectedProduct
                ? `${selectedProduct.symbol} - ${selectedProduct.name}`
                : value
              : "Wyszukaj lub wpisz symbol..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Szukaj po symbolu lub nazwie..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isProductsLoading ? "Ładowanie..." : "Brak wyników."}
            </CommandEmpty>
            <CommandGroup>
              {products?.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.symbol}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue.toUpperCase());
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toUpperCase() === product.symbol.toUpperCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{product.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ========================================================================
// === GŁÓWNY KOMPONENT ===================================================
// ========================================================================

export function SalesInvoiceDetailsColumn({
  selectedOrderId,
}: SalesInvoiceDetailsProps) {
  const queryClient = useQueryClient();
  const [isEditInvoiceOpen, setEditInvoiceOpen] = useState(false);
  const [productMappings, setProductMappings] = useState<
    Record<string, string>
  >({});
  const [autoFilledMappings, setAutoFilledMappings] = useState<Set<string>>(
    new Set()
  );

  const [referenceTemplate, setReferenceTemplate] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const {
    data: order,
    isLoading: isOrderLoading,
    isError,
    refetch: refetchOrder,
  } = useQuery<OrderDetailsRead>({
    queryKey: ["orderDetails", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) throw new Error("No order ID");
      const res = await api.get(`/orders/${selectedOrderId}`);
      return res.data;
    },
    enabled: !!selectedOrderId,
  });

  const { data: erpIntegrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations"],
    queryFn: async () =>
      (await api.get("/service-integrations")).data,
  });

  const subiektIntegration = useMemo(() => {
    return erpIntegrations?.find((int) => int.provider_type === "SUBIEKT_GT");
  }, [erpIntegrations]);

  const { isEnabled: printHubEnabled, status: printHubStatus, printHubExcludeNip, printHubExcludeB2c } = usePrintHub();

  const { data: subiektAgentConfig } = useQuery<{ agent_url: string; api_key: string } | null>({
    queryKey: ["subiektAgentConfig"],
    queryFn: async () => {
      try {
        const res = await api.get("/service-integrations/subiekt-gt/agent-config");
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!subiektIntegration && printHubEnabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const subiektIntegrationId = subiektIntegration?.id;

  useEffect(() => {
    if (subiektIntegration?.sync_config?.erp_sales_reference_template) {
      setReferenceTemplate(subiektIntegration.sync_config.erp_sales_reference_template);
    } else {
      setReferenceTemplate("{order_id}");
    }
  }, [subiektIntegration]);

  const handleSaveSettings = async () => {
    if (!subiektIntegrationId) return;
    try {
      setIsSavingSettings(true);
      const patchPayload = {
        sync_config: {
          ...(subiektIntegration?.sync_config || {}),
          erp_sales_reference_template: referenceTemplate,
        }
      };
      await api.patch(`/service-integrations/${subiektIntegrationId}`, patchPayload);
      toast.success("Ustawienia nabijania zostały zapisane.");
      queryClient.invalidateQueries({
        queryKey: ["serviceIntegrations"],
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || "Nieznany błąd";
      toast.error(`Nie udało się zapisać ustawień: ${errMsg}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const { data: existingMappings } = useQuery<
    Record<string, ProductErpMapping>
  >({
    queryKey: ["productErpMappings", selectedOrderId, order?.lineItems],
    queryFn: async () => {
      if (
        !order?.lineItems ||
        order.lineItems.length === 0 ||
        !subiektIntegrationId ||
        !order.serviceIntegration
      ) {
        return {};
      }
      const offerIds = order.lineItems
        .map((item) => item.offer?.id)
        .filter((id): id is string => !!id);
      if (offerIds.length === 0) return {};

      const params = new URLSearchParams();
      offerIds.forEach((id) => params.append("offer_ids", id));
      params.append(
        "source_integration_id",
        String(order.serviceIntegration.id)
      );
      params.append("erp_integration_id", String(subiektIntegrationId));

      const res = await api.get(
        `/product-erp-mappings/by-offers-and-integrations?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!order && !!subiektIntegrationId,
  });

  const { data: subiektStock } = useQuery<any>({
    queryKey: ["subiektStock", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await api.get(`/orders/${selectedOrderId}/subiekt-stock`);
      return res.data;
    },
    enabled: !!selectedOrderId && !!subiektIntegrationId,
  });

  const updateMappingMutation = useMutation({
    mutationFn: async ({ offerId, erpSymbol }: { offerId: string; erpSymbol: string }) => {
      if (!subiektIntegrationId || !order?.serviceIntegration) {
        throw new Error("Brak integracji ERP lub źródłowej.");
      }
      const existing = existingMappings?.[offerId];
      const payload = {
        source_integration_id: order.serviceIntegration.id,
        erp_integration_id: subiektIntegrationId,
        marketplace_offer_id: offerId,
        erp_product_symbol: erpSymbol,
      };
      if (existing?.id) {
        return api.put(`/product-erp-mappings/${existing.id}`, payload);
      } else {
        return api.post("/product-erp-mappings", payload);
      }
    },
    onSuccess: () => {
      toast.success("Zapisano mapowanie w ERP.");
      queryClient.invalidateQueries({
        queryKey: ["productErpMappings", selectedOrderId],
      });
      queryClient.invalidateQueries({
        queryKey: ["subiektStock", selectedOrderId],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Nie udało się zapisać mapowania.");
    }
  });


  useEffect(() => {
    if (existingMappings && Object.keys(existingMappings).length > 0) {
      const newMappings: Record<string, string> = {};
      const newAutoFilled = new Set<string>();

      order?.lineItems?.forEach((item) => {
        const offerId = item.offer?.id;
        if (offerId && existingMappings[offerId]) {
          // Pobieramy TYLKO symbol z obiektu
          newMappings[offerId] = existingMappings[offerId].erp_product_symbol;
          newAutoFilled.add(offerId);
        }
      });

      setProductMappings((prev) => ({ ...prev, ...newMappings }));
      setAutoFilledMappings(newAutoFilled);
    }
  }, [existingMappings, order?.lineItems]);

  useEffect(() => {
    setProductMappings({});
    setAutoFilledMappings(new Set());
  }, [selectedOrderId]);

  const { data: threads } = useQuery<Thread[]>({
    queryKey: ["orderThreads", selectedOrderId],
    queryFn: async () => {
      if (!order?.buyerLogin || !order.serviceIntegration) return [];
      const response = await api.get("/threads/by-buyer-login", {
        params: {
          buyer_login: order.buyerLogin,
          integration_id: order.serviceIntegration.id,
        },
      });
      return response.data;
    },
    enabled: !!order,
  });

  const handleMappingChange = (offerId: string, erpSymbol: string) => {
    setProductMappings((prev) => ({
      ...prev,
      [offerId]: erpSymbol.toUpperCase(),
    }));
    setAutoFilledMappings((prev) => {
      const newSet = new Set(prev);
      newSet.delete(offerId);
      return newSet;
    });
  };

  const pollTaskStatus = (taskId: string): Promise<{ document_number: string }> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes timeout
      const interval = setInterval(async () => {
        try {
          if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            reject(new Error("Przekroczono limit czasu oczekiwania na wystawienie faktury."));
            return;
          }
          const statusRes = await api.get(`/tasks/${taskId}/status`);
          const data = statusRes.data;
          if (data.status === "SUCCESS") {
            clearInterval(interval);
            const docNumber = data.result?.result?.document_number || data.result?.document_number;
            if (!docNumber) {
              reject(new Error("Faktura wystawiona, ale brak numeru dokumentu w odpowiedzi serwera."));
              return;
            }
            resolve({
              document_number: docNumber,
            });
          } else if (data.status === "FAILURE" || data.status === "FAILED") {
            clearInterval(interval);
            const errMsg = data.result?.result?.error || data.result?.error || "Błąd podczas tworzenia faktury w Subiekcie GT.";
            reject(new Error(errMsg));
          }
        } catch (err: any) {
          clearInterval(interval);
          const errMsg = getErrorMessage(err);
          reject(new Error(errMsg));
        }
      }, 2000);
    });
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (mappings: Record<string, string>) => {
      if (!selectedOrderId) throw new Error("Nie wybrano zamówienia!");

      // Walidacja używa teraz `mappedDetails`, które ma bezpieczne `offerId`
      const allItemsMapped = mappedDetails?.lineItems?.every((item) => {
        if (!item.offerId) return false;
        return !!mappings[item.offerId]?.trim();
      });

      if (!allItemsMapped) {
        toast.error("Wprowadź symbole Subiekta dla wszystkich pozycji.");
        throw new Error("Validation failed");
      }

      const payload = { product_mappings: mappings };
      const url = `/sales-invoices/orders/${selectedOrderId}/create-sales-invoice`;
      
      const res = await api.post(url, payload);
      const taskId = res.data.task_id;
      if (!taskId) {
        throw new Error("Nie otrzymano identyfikatora zadania z serwera.");
      }
      
      const pollResult = await pollTaskStatus(taskId);
      
      // ── Automatyczny wydruk faktury FS przez PrintHub ──
      const taxId = order?.invoice_address?.tax_id || (order as any)?.invoiceAddress?.tax_id || (order as any)?.invoiceAddress?.taxId;
      const hasNip = !!(taxId && taxId.trim());
      const isExcluded = (hasNip && printHubExcludeNip) || (!hasNip && printHubExcludeB2c);

      if (printHubEnabled && printHubStatus === "connected" && pollResult.document_number && !isExcluded) {
        try {
          const configRes = await api.get("/service-integrations/subiekt-gt/agent-config");
          const config = configRes.data;
          if (config?.agent_url && config?.api_key) {
            printHubService.printSalesInvoice(
              pollResult.document_number,
              config.agent_url,
              config.api_key
            );
            console.log(
              `[DetailsColumn] Zlecono wydruk faktury FS: ${pollResult.document_number}`
            );
          } else {
            console.warn("[DetailsColumn] Brak konfiguracji agenta Subiekta dla wydruku.");
          }
        } catch (printErr) {
          console.warn("[DetailsColumn] Nie udało się zlecić wydruku faktury FS:", printErr);
        }
      }
      
      return pollResult;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Faktura ${data.document_number} wystawiona pomyślnie!`
      );
      queryClient.invalidateQueries({
        queryKey: ["orderDetails", selectedOrderId],
      });
      refetchOrder();
    },
    onError: (error: any) => {
      if (error.message !== "Validation failed") {
        toast.error(`Błąd: ${getErrorMessage(error)}`);
      }
    },
  });

  const totalMessages = useMemo(
    () =>
      threads?.reduce(
        (sum, thread) => sum + (thread.messages?.length || 0),
        0
      ) ?? 0,
    [threads]
  );

  const mappedDetails = useMemo<MappedOrderDetails | null>(() => {
    if (!order) return null;
    return mapOrderToMappedDetails(order);
  }, [order]);

  if (!selectedOrderId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <FilePlus2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Wybierz zamówienie</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Aby wyświetlić dane do faktury, wybierz zrealizowane zamówienie z
          listy.
        </p>
      </div>
    );
  }

  if (isOrderLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (isError || !order || !mappedDetails) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-destructive">
        <AlertCircle className="mx-auto h-12 w-12" />
        <h3 className="mt-4 text-lg font-semibold">Błąd</h3>
        <p className="mt-2 text-sm">
          Nie udało się załadować danych zamówienia.
        </p>
      </div>
    );
  }

  const { buyerDetails, deliveryDetails, deliveryCost } = mappedDetails;

  return (
    <>
      <div className="p-6 h-full flex flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <h2 className="text-2xl font-bold mb-1">Nowa faktura sprzedaży</h2>
          <p className="text-sm text-muted-foreground">
            Zamówienie: {order.externalOrderId}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto mt-6 space-y-6 pr-4 -mr-4">
          {deliveryDetails?.address && (
            <section>
              <h3 className="text-lg font-semibold flex items-center mb-2">
                <Truck className="mr-2 h-5 w-5 text-primary" /> Dostawa do
              </h3>
              <div className="pl-7 text-sm space-y-1">
                <p className="font-medium">
                  {deliveryDetails.address.company_name ||
                    `${deliveryDetails.address.first_name || ""} ${
                      deliveryDetails.address.last_name || ""
                    }`.trim()}
                </p>
                <p className="text-muted-foreground">
                  {deliveryDetails.address.street}
                </p>
                <p className="text-muted-foreground">
                  {deliveryDetails.address.zip_code}{" "}
                  {deliveryDetails.address.city}
                </p>
              </div>
            </section>
          )}
          <Separator />
          <section>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold flex items-center">
                {buyerDetails?.isCompany ? <Building /> : <User />}
                <span className="ml-2">Nabywca (dane do faktury)</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditInvoiceOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            {buyerDetails ? (
              <div className="pl-7 text-sm space-y-1">
                <p className="font-medium">{buyerDetails.name}</p>
                {buyerDetails.taxId && (
                  <p className="text-muted-foreground">
                    NIP: {buyerDetails.taxId}
                  </p>
                )}
                {buyerDetails.address && (
                  <>
                    <p className="text-muted-foreground">
                      {buyerDetails.address.street}
                    </p>
                    <p className="text-muted-foreground">
                      {buyerDetails.address.zip_code}{" "}
                      {buyerDetails.address.city}
                    </p>
                  </>
                )}
                {buyerDetails.source === "delivery" && (
                  <p className="text-xs text-amber-600 mt-2">
                    (Uwaga: Użyto danych z adresu dostawy)
                  </p>
                )}
              </div>
            ) : (
              <p className="pl-7 text-sm text-destructive">
                Brak danych nabywcy w zamówieniu!
              </p>
            )}
          </section>
          <Separator />
          <section>
            <h3 className="text-lg font-semibold flex items-center mb-3">
              <ShoppingCart className="mr-2 h-5 w-5 text-primary" /> Pozycje
            </h3>
            {subiektStock && !subiektStock.is_connected && (
              <Alert variant="destructive" className="mb-4 bg-red-950/20 border-red-500/20 text-red-400">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertTitle className="text-xs font-semibold">Brak połączenia z ERP</AlertTitle>
                <AlertDescription className="text-xs">
                  {subiektStock.reason || "Nie można sprawdzić stanów magazynowych w Subiekcie."}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 pl-7 text-sm">
              {mappedDetails.lineItems?.map((item) => {
                const stockInfo = subiektStock?.items?.find(
                  (s: any) => s.offer_id === item.offerId
                );
                return (
                  <div key={item.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div className="pr-4">
                        <p className="font-medium">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} szt. x {item.price}
                          </p>
                          {subiektStock?.is_connected && stockInfo && (
                            <span className="inline-flex items-center">
                              {stockInfo.is_service ? (
                                <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-400 border-blue-500/20 font-normal">
                                  Usługa ERP
                                </Badge>
                              ) : !stockInfo.has_mapping ? (
                                <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20 font-normal">
                                  Brak mapowania ERP
                                </Badge>
                              ) : stockInfo.has_sufficient_stock ? (
                                <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal">
                                  W ERP: {stockInfo.quantity_available} szt.
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-5 bg-rose-500/10 text-rose-400 border-rose-500/20 font-medium">
                                  Brak w ERP (dostępne: {stockInfo.quantity_available ?? 0} szt.)
                                </Badge>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-right flex-shrink-0">
                        {(
                          item.quantity * parseFloat(item.price.split(" ")[0])
                        ).toFixed(2)}{" "}
                        {item.price.split(" ")[1]}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Label
                        htmlFor={`symbol-${item.id}`}
                        className="text-xs text-muted-foreground whitespace-nowrap"
                      >
                        Symbol w Subiekt GT:
                      </Label>

                      {subiektIntegrationId && item.offerId ? (
                        <SubiektProductCombobox
                          erpIntegrationId={subiektIntegrationId}
                          value={productMappings[item.offerId] || ""}
                          onValueChange={(symbol) => {
                            handleMappingChange(item.offerId!, symbol);
                            updateMappingMutation.mutate({ offerId: item.offerId!, erpSymbol: symbol });
                          }}
                        />
                      ) : (
                        <div className="text-xs text-muted-foreground w-full">
                          Brak ID oferty lub integracji ERP...
                        </div>
                      )}

                      {autoFilledMappings.has(item.offerId!) && (
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                );
              })}

              {deliveryCost && deliveryCost.amount > 0 && (
                <div className="flex justify-between items-center pt-2">
                  <p className="font-medium">Dostawa</p>
                  <p className="font-semibold text-right flex-shrink-0">
                    {deliveryCost.amount.toFixed(2)} {deliveryCost.currency}
                  </p>
                </div>
              )}
            </div>
          </section>
          <Separator />
          <section>
            <h3 className="text-lg font-semibold flex items-center mb-3">
              <ScrollText className="mr-2 h-5 w-5 text-primary" /> Podsumowanie
            </h3>
            <div className="pl-7 text-sm space-y-2">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Razem do zapłaty:</span>
                <span>
                  {order.totalToPay?.toLocaleString("pl-PL", {
                    style: "currency",
                    currency: "PLN",
                  })}
                </span>
              </div>
            </div>
          </section>
          {(subiektIntegrationId || totalMessages > 0) && (
            <Accordion type="single" collapsible defaultValue="billing-settings" className="w-full">
              {subiektIntegrationId && (
                <AccordionItem value="billing-settings">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-primary" />
                      <span>Ustawienia nabijania</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/10 mt-1">
                      <div className="space-y-2">
                        <Label htmlFor="reference-template" className="text-sm font-medium">
                          Szablon referencji dokumentu sprzedaży
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="reference-template"
                            value={referenceTemplate}
                            onChange={(e) => setReferenceTemplate(e.target.value)}
                            placeholder="{order_id} - {login}"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="shrink-0"
                          >
                            {isSavingSettings ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            Zapisz
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Szablon używany do automatycznego wypełniania pola referencji w Subiekcie. 
                          Dostępne tagi: <code className="bg-muted px-1 py-0.5 rounded font-mono">{`{order_id}`}</code>,{" "}
                          <code className="bg-muted px-1 py-0.5 rounded font-mono">{`{login}`}</code>,{" "}
                          <code className="bg-muted px-1 py-0.5 rounded font-mono">{`{name}`}</code>,{" "}
                          <code className="bg-muted px-1 py-0.5 rounded font-mono">{`{products}`}</code>,{" "}
                          <code className="bg-muted px-1 py-0.5 rounded font-mono">{`{source}`}</code>.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {totalMessages > 0 && (
                <AccordionItem value="chat-history">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <span>Historia Rozmowy</span>
                      <Badge>{totalMessages}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border-t max-h-[500px] overflow-y-auto">
                      {order.buyerLogin && order.serviceIntegration && (
                        <ChatPanel
                          buyerLogin={order.buyerLogin}
                          integrationId={order.serviceIntegration.id}
                          currentOrderId={order.id}
                          myLogin={order.serviceIntegration.external_user_id}
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </div>
        <div className="mt-6 flex-shrink-0">
          {order.erp_sales_document_number ? (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <span className="font-semibold">
                  Faktura istnieje w Subiekcie:
                </span>
                <span className="ml-2 font-mono">
                  {order.erp_sales_document_number}
                </span>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => createInvoiceMutation.mutate(productMappings)}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Przetwarzanie...
                </>
              ) : (
                "Wystaw fakturę w Subiekt GT"
              )}
            </Button>
          )}
        </div>
      </div>
      <EditInvoiceDataDialog
        isOpen={isEditInvoiceOpen}
        onClose={() => setEditInvoiceOpen(false)}
        onSuccess={() => {
          setEditInvoiceOpen(false);
          refetchOrder();
        }}
        order={order}
      />
    </>
  );
}
