"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import api, { getErrorMessage } from "@/lib/api";
import { PurchaseOrder, PurchaseOrderStatus } from "@/types/purchase-order";
import { ServiceIntegration } from "@/types/service-integration";
import { ProductErpMapping } from "@/types/product-erp-mapping";
import { PaginatedResponse } from "@/types/pagination";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Loader2,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  ShoppingBag,
  ExternalLink,
  ChevronsUpDown,
  Check,
  Building,
  User,
  Filter,
  Edit2,
  Trash2,
  Plus,
  Tag,
  Link2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";

// --- Typy pomocnicze ---
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

// --- Komponent wyszukiwarki produktów Subiekta ---
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
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: products, isLoading: isProductsLoading } = useQuery<ErpProduct[]>({
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
    return products?.find((p) => p.symbol.toUpperCase() === value.toUpperCase());
  }, [products, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-xs font-normal bg-background/50 border-border/50 rounded-xl"
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
      <PopoverContent className="w-[320px] p-0" align="start">
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
                    <span className="font-semibold text-sm">{product.symbol}</span>
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

// --- Główne typy dla stanu fakturowania ---
interface InvoicingTaskProgress {
  orderId: string;
  externalOrderId: string;
  buyerLogin: string;
  status: "idle" | "mapping" | "saving_mappings" | "triggering" | "running" | "success" | "failed";
  taskId?: string;
  error?: string;
}

// --- Komponent wyświetlający wiadomości z transakcji ---
function OrderMessagesSection({ buyerLogin, integrationId }: { buyerLogin?: string | null; integrationId?: number | null }) {
  const { data: threads, isLoading } = useQuery<any[]>({
    queryKey: ["orderMessages", buyerLogin, integrationId],
    queryFn: async () => {
      if (!buyerLogin || !integrationId) return [];
      const res = await api.get("/threads/by-buyer-login", {
        params: { buyer_login: buyerLogin, integration_id: integrationId }
      });
      return res.data;
    },
    enabled: !!buyerLogin && !!integrationId
  });

  if (!buyerLogin || !integrationId) {
    return <p className="text-xs text-muted-foreground">Brak powiązanych informacji o kupującym.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Ładowanie wiadomości...
      </div>
    );
  }

  const allMessages = threads
    ?.flatMap((t) => t.messages || [])
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || [];

  if (allMessages.length === 0) {
    return <p className="text-xs text-muted-foreground py-3 italic text-center border border-dashed border-border/10 rounded-2xl">Brak wiadomości od kupującego dla tej transakcji.</p>;
  }

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 mt-2 border border-border/10 p-3 rounded-2xl bg-muted/10 flex flex-col">
      {allMessages.map((msg: any) => {
        const isBuyer = msg.author_login.toLowerCase() === buyerLogin.toLowerCase();
        return (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[85%] rounded-2xl p-3 text-xs",
              isBuyer
                ? "bg-muted text-foreground self-start mr-auto rounded-tl-none border border-border/10"
                : "bg-primary/10 text-foreground self-end ml-auto rounded-tr-none border border-primary/20"
            )}
          >
            <div className="flex justify-between gap-4 mb-1">
              <span className="font-semibold truncate text-[10px] text-muted-foreground">
                {isBuyer ? "Kupujący" : "Sprzedawca"} ({msg.author_login})
              </span>
              <span className="text-[9px] text-muted-foreground shrink-0">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="whitespace-pre-line text-foreground/90 break-words leading-relaxed">{msg.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// --- Komponent wyświetlający produkty, mapowania ERP oraz stany magazynowe ---
function OrderProductsSection({
  po,
  subiektIntegration,
}: {
  po: PurchaseOrder;
  subiektIntegration: any;
}) {
  const queryClient = useQueryClient();
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  const mo = po.marketplace_order;
  const sourceIntegrationId = mo?.service_integration_id || mo?.service_integration?.id;
  const erpIntegrationId = subiektIntegration?.id;

  // 1. Zbieramy offer_ids
  const lineItems = (mo?.line_items || []) as any[];
  const offerIds = useMemo(() => {
    return lineItems
      .map((item) => item.offer?.id || item.offer_id)
      .filter(Boolean) as string[];
  }, [lineItems]);

  // 2. Query: Pobieramy mapowania
  const { data: mappings, isLoading: isLoadingMappings } = useQuery<Record<string, any>>({
    queryKey: ["productMappings", sourceIntegrationId, erpIntegrationId, offerIds],
    queryFn: async () => {
      if (!sourceIntegrationId || !erpIntegrationId || offerIds.length === 0) return {};
      const params = new URLSearchParams();
      params.append("source_integration_id", String(sourceIntegrationId));
      params.append("erp_integration_id", String(erpIntegrationId));
      offerIds.forEach((id) => params.append("offer_ids", id));

      const res = await api.get("/product-erp-mappings/by-offers-and-integrations", { params });
      return res.data;
    },
    enabled: !!sourceIntegrationId && !!erpIntegrationId && offerIds.length > 0,
  });

  // 3. Query: Pobieramy stany magazynowe Subiekta
  const orderId = mo?.id || po.marketplace_order_id;
  const { data: stockData, isLoading: isLoadingStock } = useQuery<any>({
    queryKey: ["orderSubiektStock", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await api.get(`/orders/${orderId}/subiekt-stock`);
      return res.data;
    },
    enabled: !!orderId,
  });

  // 4. Mutation: Zapisz mapowanie
  const saveMappingMutation = useMutation({
    mutationFn: async ({ offerId, symbol }: { offerId: string; symbol: string }) => {
      if (!sourceIntegrationId || !erpIntegrationId) throw new Error("Brak integracji");
      const currentMapping = mappings?.[offerId];
      const payload = {
        source_integration_id: sourceIntegrationId,
        erp_integration_id: erpIntegrationId,
        marketplace_offer_id: offerId,
        erp_product_symbol: symbol,
      };

      if (currentMapping?.id) {
        return api.put(`/product-erp-mappings/${currentMapping.id}`, payload);
      } else {
        return api.post("/product-erp-mappings", payload);
      }
    },
    onSuccess: () => {
      toast.success("Zapisano mapowanie produktu.");
      setEditingOfferId(null);
      queryClient.invalidateQueries({ queryKey: ["productMappings", sourceIntegrationId, erpIntegrationId, offerIds] });
      queryClient.invalidateQueries({ queryKey: ["orderSubiektStock", orderId] });
      queryClient.invalidateQueries({ queryKey: ["invoiceablePurchaseOrdersTable"] });
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err) || "Błąd podczas zapisu mapowania.");
    }
  });

  if (isLoadingMappings || isLoadingStock) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Ładowanie produktów i stanów...
      </div>
    );
  }

  return (
    <div className="border border-border/10 rounded-2xl overflow-hidden bg-muted/5 divide-y divide-border/10">
      {lineItems.map((item: any, idx: number) => {
        const offerId = item.offer?.id || item.offer_id;
        const mapping = mappings?.[offerId];
        const stockItem = stockData?.items?.find((s: any) => s.offer_id === offerId);
        
        return (
          <div key={idx} className="p-4 text-xs space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-foreground leading-normal">{item.offer?.name || item.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">ID oferty: {offerId}</p>
              </div>
              <div className="text-right shrink-0 font-bold text-foreground">
                x{item.quantity}
              </div>
            </div>

            {/* Linia mapowania ERP i stany magazynowe */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status mapowania */}
                {mapping ? (
                  <Badge variant="outline" className="text-[10px] h-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold px-2.5 rounded-xl flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    ERP: {mapping.erp_product_symbol}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-6 bg-destructive/10 text-destructive border-destructive/20 font-semibold px-2.5 rounded-xl flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    Brak mapowania ERP
                  </Badge>
                )}

                {/* Stan magazynowy z Subiekta */}
                {stockItem && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] h-6 font-semibold px-2.5 rounded-xl flex items-center gap-1.5",
                      stockItem.has_sufficient_stock
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}
                  >
                    Magazyn: {stockItem.quantity_available !== null ? stockItem.quantity_available : 0} (Wymagane: {stockItem.quantity_required})
                  </Badge>
                )}
              </div>

              {/* Akcja zmiany/dodania mapowania */}
              {erpIntegrationId && (
                <div className="shrink-0">
                  {editingOfferId === offerId ? (
                    <div className="flex items-center gap-2 w-[240px]">
                      <div className="flex-1">
                        <SubiektProductCombobox
                          erpIntegrationId={erpIntegrationId}
                          value={mapping?.erp_product_symbol || ""}
                          onValueChange={(symbol) => saveMappingMutation.mutate({ offerId, symbol })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs rounded-lg"
                        onClick={() => setEditingOfferId(null)}
                      >
                        Anuluj
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-primary hover:text-primary-hover px-2 rounded-lg gap-1 border border-primary/20 hover:bg-primary/5"
                      onClick={() => setEditingOfferId(offerId)}
                    >
                      <Link2 className="h-3 w-3" /> {mapping ? "Zmień" : "Powiąż z ERP"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DropshippingOrdersTab() {
  const isMobile = useMobile(768);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("ALL");

  // Szczegóły zlecenia (Sheet)
  const [selectedPoForDetails, setSelectedPoForDetails] = useState<PurchaseOrder | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    company_name: "",
    tax_id: "",
    first_name: "",
    last_name: "",
    street: "",
    zip_code: "",
    city: "",
  });
  const [newFlag, setNewFlag] = useState("");

  const openDetailsSheet = (po: PurchaseOrder) => {
    setSelectedPoForDetails(po);
    setIsDetailsSheetOpen(true);
  };

  useEffect(() => {
    if (selectedPoForDetails?.marketplace_order?.invoice_address) {
      const addr = selectedPoForDetails.marketplace_order.invoice_address as any;
      setInvoiceForm({
        company_name: addr.company_name || "",
        tax_id: addr.tax_id || "",
        first_name: addr.first_name || "",
        last_name: addr.last_name || "",
        street: addr.street || "",
        zip_code: addr.zip_code || "",
        city: addr.city || "",
      });
    } else {
      setInvoiceForm({
        company_name: "",
        tax_id: "",
        first_name: "",
        last_name: "",
        street: "",
        zip_code: "",
        city: "",
      });
    }
    setIsEditingInvoice(false);
  }, [selectedPoForDetails]);

  const updateInvoiceMutation = useMutation({
    mutationFn: async (payload: typeof invoiceForm) => {
      const orderId = selectedPoForDetails?.marketplace_order?.id || selectedPoForDetails?.marketplace_order_id;
      if (!orderId) throw new Error("Brak ID zamówienia marketplace");
      const res = await api.patch(`/orders/${orderId}/invoice-address`, payload);
      return res.data;
    },
    onSuccess: (updatedOrder) => {
      toast.success("Dane do faktury zostały pomyślnie zaktualizowane.");
      setIsEditingInvoice(false);
      queryClient.invalidateQueries({ queryKey: ["invoiceablePurchaseOrdersTable"] });
      if (selectedPoForDetails) {
        setSelectedPoForDetails({
          ...selectedPoForDetails,
          marketplace_order: {
            ...selectedPoForDetails.marketplace_order,
            ...updatedOrder
          }
        });
      }
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err) || "Błąd podczas zapisu danych do faktury.");
    }
  });

  const addFlagMutation = useMutation({
    mutationFn: async (flagName: string) => {
      const orderId = selectedPoForDetails?.marketplace_order?.id || selectedPoForDetails?.marketplace_order_id;
      if (!orderId) throw new Error("Brak ID zamówienia marketplace");
      const res = await api.post(`/orders/${orderId}/flags`, { flag: flagName });
      return res.data;
    },
    onSuccess: (updatedOrder) => {
      toast.success("Dodano oznaczenie.");
      setNewFlag("");
      queryClient.invalidateQueries({ queryKey: ["invoiceablePurchaseOrdersTable"] });
      if (selectedPoForDetails) {
        setSelectedPoForDetails({
          ...selectedPoForDetails,
          marketplace_order: {
            ...selectedPoForDetails.marketplace_order,
            ...updatedOrder
          }
        });
      }
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err) || "Błąd podczas dodawania oznaczenia.");
    }
  });

  const removeFlagMutation = useMutation({
    mutationFn: async (flagName: string) => {
      const orderId = selectedPoForDetails?.marketplace_order?.id || selectedPoForDetails?.marketplace_order_id;
      if (!orderId) throw new Error("Brak ID zamówienia marketplace");
      const res = await api.delete(`/orders/${orderId}/flags/${flagName}`);
      return res.data;
    },
    onSuccess: (updatedOrder) => {
      toast.success("Usunięto oznaczenie.");
      queryClient.invalidateQueries({ queryKey: ["invoiceablePurchaseOrdersTable"] });
      if (selectedPoForDetails) {
        setSelectedPoForDetails({
          ...selectedPoForDetails,
          marketplace_order: {
            ...selectedPoForDetails.marketplace_order,
            ...updatedOrder
          }
        });
      }
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err) || "Błąd podczas usuwania oznaczenia.");
    }
  });

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  });

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Dialog masowego fakturowania
  const [isInvoicingDialogOpen, setInvoicingDialogOpen] = useState(false);
  const [selectedOrdersForInvoicing, setSelectedOrdersForInvoicing] = useState<PurchaseOrder[]>([]);
  const [unmappedProducts, setUnmappedProducts] = useState<any[]>([]);
  const [bulkMappings, setBulkMappings] = useState<Record<string, string>>({}); // offerId -> symbol
  const [isResolvingMappings, setResolvingMappings] = useState(false);

  // Stan postępu fakturowania
  const [isProcessingInvoices, setProcessingInvoices] = useState(false);
  const [invoicingProgress, setInvoicingProgress] = useState<Record<string, InvoicingTaskProgress>>({});

  // Debounce wyszukiwania
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Pobierz integracje (do wyboru Subiekta GT oraz filtru hurtowni)
  const { data: integrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations"],
    queryFn: async () => (await api.get("/service-integrations")).data,
  });

  const subiektIntegration = useMemo(() => {
    return integrations?.find((int) => int.provider_type === "SUBIEKT_GT");
  }, [integrations]);

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

  const wholesaleIntegrations = useMemo(() => {
    return integrations?.filter((int) => int.category === "WHOLESALE") || [];
  }, [integrations]);

  // Pobierz zlecenia gotowe do zafakturowania
  const { data: purchaseOrdersData, isLoading: isOrdersLoading, isFetching: isOrdersFetching } = useQuery({
    queryKey: ["invoiceablePurchaseOrdersTable", pagination, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(pagination.pageIndex + 1));
      params.append("size", String(pagination.pageSize));
      if (debouncedSearch) params.append("search", debouncedSearch);

      const response = await api.get(`/purchase-orders/invoiceable`, { params });
      return response.data as PaginatedResponse<PurchaseOrder>;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });

  // Filtrowanie zleceń na froncie po wybranej hurtowni
  const filteredOrders = useMemo(() => {
    const items = purchaseOrdersData?.items || [];
    if (supplierFilter === "ALL") return items;
    return items.filter((po) => String(po.supplier_integration_id) === supplierFilter);
  }, [purchaseOrdersData, supplierFilter]);

  const pageCount = useMemo(() => {
    return purchaseOrdersData?.pages || 0;
  }, [purchaseOrdersData]);

  // Funkcja pobierania PDF faktury
  const downloadInvoicePdf = async (orderId: string, documentNumber: string) => {
    const toastId = toast.loading(`Pobieranie faktury ${documentNumber}...`);
    try {
      const response = await api.get(`/orders/${orderId}/sales-invoice/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = documentNumber.replace(/\//g, "-").replace(/\s+/g, "_");
      link.href = url;
      link.download = `FS_${safeName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Plik PDF został pobrany.", { id: toastId });
    } catch (err: any) {
      toast.error("Nie udało się pobrać pliku PDF.", { id: toastId });
    }
  };

  // Uruchomienie procesu fakturowania dla pojedynczego zlecenia
  const openSingleInvoice = (po: PurchaseOrder) => {
    setSelectedOrdersForInvoicing([po]);
    setInvoicingDialogOpen(true);
  };

  // Uruchomienie procesu fakturowania dla zaznaczonych zleceń
  const openBulkInvoicing = () => {
    const selectedPOs = (purchaseOrdersData?.items || []).filter(
      (po) => rowSelection[po.id] && !po.marketplace_order?.erp_sales_document_number
    );
    if (selectedPOs.length === 0) {
      toast.error("Zaznacz zlecenia, które nie mają jeszcze wystawionej faktury.");
      return;
    }
    setSelectedOrdersForInvoicing(selectedPOs);
    setInvoicingDialogOpen(true);
  };

  // Wczytanie i sprawdzenie mapowań dla wybranych zleceń w dialogu
  useEffect(() => {
    if (!isInvoicingDialogOpen || selectedOrdersForInvoicing.length === 0 || !subiektIntegration) {
      return;
    }

    const resolveMappings = async () => {
      setResolvingMappings(true);
      setBulkMappings({});
      setUnmappedProducts([]);

      try {
        // Krok 1: Zbierz unikalne offer_id oraz zgrupuj je wg source_integration_id
        const uniqueOffersGroupedBySource: Record<number, Set<string>> = {};
        const offerToProductDetails: Record<string, { name: string; offerId: string; sourceIntegrationId: number }> = {};

        selectedOrdersForInvoicing.forEach((po) => {
          const mo = po.marketplace_order;
          if (!mo) return;

          const sourceId = mo.service_integration?.id || mo.service_integration_id;
          if (!sourceId) return;

          if (!uniqueOffersGroupedBySource[sourceId]) {
            uniqueOffersGroupedBySource[sourceId] = new Set();
          }

          const items = mo.line_items || [];
          items.forEach((item: any) => {
            const offerId = item.offer?.id || item.offer_id;
            const offerName = item.offer?.name || item.name || "Brak nazwy";
            if (!offerId) return;

            uniqueOffersGroupedBySource[sourceId].add(offerId);
            offerToProductDetails[offerId] = {
              name: offerName,
              offerId,
              sourceIntegrationId: sourceId,
            };
          });
        });

        // Krok 2: Pobierz mapowania dla każdej grupy integracji źródłowej osobno
        const fetchedMappings: Record<string, ProductErpMapping> = {};

        for (const [sourceIdStr, offerIdsSet] of Object.entries(uniqueOffersGroupedBySource)) {
          const sourceId = parseInt(sourceIdStr, 10);
          const offerIds = Array.from(offerIdsSet);
          if (offerIds.length === 0) continue;

          const params = new URLSearchParams();
          offerIds.forEach((id) => params.append("offer_ids", id));
          params.append("source_integration_id", String(sourceId));
          params.append("erp_integration_id", String(subiektIntegration.id));

          const res = await api.get(
            `/product-erp-mappings/by-offers-and-integrations?${params.toString()}`
          );
          Object.assign(fetchedMappings, res.data);
        }

        // Krok 3: Zbuduj stan mapowań i określ unmapped
        const initialMappings: Record<string, string> = {};
        const missing: any[] = [];

        Object.keys(offerToProductDetails).forEach((offerId) => {
          const mapping = fetchedMappings[offerId];
          if (mapping?.erp_product_symbol) {
            initialMappings[offerId] = mapping.erp_product_symbol;
          } else {
            // Pomijaj wirtualne pozycje (np. wysyłkę $DELIVERY)
            if (offerId.startsWith("$")) {
              initialMappings[offerId] = offerId; // Wirtualne traktowane jako zmapowane na samego siebie
            } else {
              missing.push({
                ...offerToProductDetails[offerId],
                existingMappingId: mapping?.id || null,
              });
            }
          }
        });

        setBulkMappings(initialMappings);
        setUnmappedProducts(missing);
      } catch (err) {
        toast.error("Wystąpił błąd podczas sprawdzania mapowań produktów.");
        setInvoicingDialogOpen(false);
      } finally {
        setResolvingMappings(false);
      }
    };

    resolveMappings();
  }, [isInvoicingDialogOpen, selectedOrdersForInvoicing, subiektIntegration]);

  const handleGenerateInvoices = async () => {
    if (!subiektIntegration) return;

    // Waliduj, czy wszystkie pozycje mają przypisany symbol ERP
    const allProductsMapped = selectedOrdersForInvoicing.every((po) => {
      const items = po.marketplace_order?.line_items || [];
      return items.every((item: any) => {
        const offerId = item.offer?.id || item.offer_id;
        if (!offerId) return true;
        return !!bulkMappings[offerId]?.trim();
      });
    });

    if (!allProductsMapped) {
      toast.error("Wprowadź symbole ERP dla wszystkich pozycji przed uruchomieniem procesu.");
      return;
    }

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

    setProcessingInvoices(true);

    // Krok 1: Inicjalizuj statusy
    const initialProgress: Record<string, InvoicingTaskProgress> = {};
    selectedOrdersForInvoicing.forEach((po) => {
      const extId = po.marketplace_external_order_id || po.marketplace_order?.external_order_id || po.id;
      const buyer = po.buyer_login || po.marketplace_order?.buyer_login || "—";
      initialProgress[po.id] = {
        orderId: po.marketplace_order_id || po.marketplaceOrderId || po.id,
        externalOrderId: extId,
        buyerLogin: buyer,
        status: "saving_mappings",
      };
    });
    setInvoicingProgress(initialProgress);

    // Krok 2: Przetwarzaj sekwencyjnie zlecenia
    for (const po of selectedOrdersForInvoicing) {
      const updateStatus = (status: InvoicingTaskProgress["status"], extra = {}) => {
        setInvoicingProgress((prev) => ({
          ...prev,
          [po.id]: { ...prev[po.id], status, ...extra },
        }));
      };

      try {
        const mo = po.marketplace_order;
        if (!mo) throw new Error("Brak powiązanego zamówienia marketplace.");

        const sourceId = mo.service_integration?.id || mo.service_integration_id;
        if (!sourceId) throw new Error("Brak powiązanej integracji źródłowej.");

        // Zapisz/Zaktualizuj mapowania dla po pozycji tego zlecenia, które zostały uzupełnione w UI
        updateStatus("saving_mappings");
        const items = mo.line_items || [];
        for (const item of items) {
          const offerId = item.offer?.id || item.offer_id;
          if (!offerId || offerId.startsWith("$")) continue;

          const erpSymbol = bulkMappings[offerId];
          const unmappedInfo = unmappedProducts.find((up) => up.offerId === offerId);
          if (unmappedInfo) {
            // Zapisz do bazy danych
            const payload = {
              source_integration_id: sourceId,
              erp_integration_id: subiektIntegration.id,
              marketplace_offer_id: offerId,
              erp_product_symbol: erpSymbol,
            };
            if (unmappedInfo.existingMappingId) {
              await api.put(`/product-erp-mappings/${unmappedInfo.existingMappingId}`, payload);
            } else {
              await api.post("/product-erp-mappings", payload);
            }
          }
        }

        // Wywołaj endpoint tworzenia faktury
        updateStatus("triggering");
        const triggerPayload = {
          product_mappings: items.reduce((acc: Record<string, string>, item: any) => {
            const offerId = item.offer?.id || item.offer_id;
            if (offerId) {
              acc[offerId] = bulkMappings[offerId];
            }
            return acc;
          }, {}),
        };

        const triggerRes = await api.post(
          `/sales-invoices/orders/${mo.id}/create-sales-invoice`,
          triggerPayload
        );

        const taskId = triggerRes.data.task_id;
        if (!taskId) {
          throw new Error("Nie otrzymano identyfikatora zadania z serwera.");
        }

        updateStatus("running", { taskId });
        const pollResult = await pollTaskStatus(taskId);

        updateStatus("success", { taskId });

        // ── Automatyczny wydruk faktury FS przez PrintHub ──
        const invoiceAddr = mo.invoice_address || (mo as any).invoiceAddress;
        const taxId = invoiceAddr?.tax_id || invoiceAddr?.taxId;
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
                `[BulkInvoicing] Zlecono wydruk faktury FS: ${pollResult.document_number}`
              );
            } else {
              console.warn("[BulkInvoicing] Brak konfiguracji agenta Subiekta dla wydruku.");
            }
          } catch (printErr) {
            console.warn("[BulkInvoicing] Nie udało się zlecić wydruku faktury FS:", printErr);
          }
        }
      } catch (err: any) {
        const errMsg = getErrorMessage(err);
        updateStatus("failed", { error: errMsg });
      }
    }

    setProcessingInvoices(false);
    // Odśwież listę w tle
    queryClient.invalidateQueries({ queryKey: ["invoiceablePurchaseOrdersTable"] });
    // Wyczyść zaznaczenie w tabeli
    setRowSelection({});
  };

  const getStatusVariant = (status: PurchaseOrderStatus): "success" | "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "SENT_TO_SUPPLIER":
        return "secondary";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Definicja kolumn dla DataTable
  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Zaznacz wszystko"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Zaznacz wiersz"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "po_id",
        header: "Zlecenie / Kanał",
        cell: ({ row }) => {
          const po = row.original;
          const provider = po.marketplace_order?.service_integration?.provider_type;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] text-muted-foreground">
                #{po.id.substring(0, 8)}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground mt-0.5">
                {provider === "ALLEGRO" && <AllegroIcon className="h-3 w-8" />}
                {provider === "BASELINKER" && <BaseLinkerIcon className="h-3 w-10 rounded-sm" />}
                <span className="truncate max-w-[120px]">
                  {po.marketplace_order?.service_integration?.name || "Brak"}
                </span>
              </span>
            </div>
          );
        },
      },
      {
        id: "marketplace_info",
        header: "Zamówienie / Login",
        cell: ({ row }) => {
          const po = row.original;
          const extId = po.marketplace_external_order_id || po.marketplace_order?.external_order_id;
          const buyer = po.buyer_login || po.marketplace_order?.buyer_login;
          return (
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-primary truncate max-w-[150px]">
                {extId || "—"}
              </span>
              <span className="text-[11px] text-muted-foreground truncate max-w-[130px] mt-0.5">
                {buyer || "—"}
              </span>
            </div>
          );
        },
      },
      {
        id: "supplier",
        header: "Hurtownia",
        cell: ({ row }) => {
          const po = row.original;
          return (
            <span className="text-xs font-medium text-foreground">
              {po.supplier_integration?.name || "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge variant={getStatusVariant(status)} className="text-[9px] uppercase px-1.5 py-0 h-5 font-semibold">
              {status}
            </Badge>
          );
        },
      },
      {
        id: "tracking",
        header: "Śledzenie wysyłki",
        cell: ({ row }) => {
          const po = row.original;
          const trackings = po.tracking_numbers || po.marketplace_order?.tracking_numbers;
          if (!trackings || trackings.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
          const uniqueTrackings = Array.from(new Set(trackings));
          return (
            <div className="flex flex-col gap-1 max-w-[160px]">
              {uniqueTrackings.map((t: string, idx: number) => (
                <Badge key={`${t}-${idx}`} variant="outline" className="font-mono text-[9px] w-fit truncate border-border/50 py-0 px-1 hover:bg-muted transition-colors">
                  {t}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "invoice",
        header: "Faktura ERP",
        cell: ({ row }) => {
          const po = row.original;
          const docNum = po.marketplace_order?.erp_sales_document_number;
          if (docNum) {
            return (
              <div className="flex items-center gap-1">
                <Badge variant="success" className="text-[10px] gap-1 py-0.5 h-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold rounded-lg">
                  <CheckCircle2 className="h-3 w-3" />
                  {docNum}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Pobierz PDF faktury"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadInvoicePdf(po.marketplace_order_id || po.marketplaceOrderId || po.id, docNum);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          }
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs gap-1 border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
              disabled={isMobile}
              title={isMobile ? "Wystawianie faktur zablokowane na urządzeniach mobilnych" : "Wystaw FV"}
              onClick={(e) => {
                e.stopPropagation();
                openSingleInvoice(po);
              }}
            >
              <FileText className="h-3.5 w-3.5" />
              {isMobile ? "FV zablokowane" : "Wystaw FV"}
            </Button>
          );
        },
      },
      {
        id: "created_at",
        header: "Data utworzenia",
        cell: ({ row }) => {
          const date = row.original.created_at;
          if (!date) return "—";
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(date).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Akcje",
        cell: ({ row }) => {
          const po = row.original;
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Szczegóły zlecenia"
              onClick={(e) => {
                e.stopPropagation();
                openDetailsSheet(po);
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    []
  );

  // Zliczanie zaznaczonych pozycji bez faktur
  const selectedCountWithoutInvoice = useMemo(() => {
    return (purchaseOrdersData?.items || []).filter(
      (po) => rowSelection[po.id] && !po.marketplace_order?.erp_sales_document_number
    ).length;
  }, [rowSelection, purchaseOrdersData]);

  return (
    <>
      <div className="space-y-4">
        {/* Pasek filtrowania / akcji */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-muted/20 p-4 rounded-2xl border border-border/10">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj po loginie kupującego, ID zewnętrznym..."
                className="pl-8 bg-background border-border/50 h-9 text-xs rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="bg-background border border-border/50 h-9 px-3 text-xs rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[150px]"
              >
                <option value="ALL">Wszystkie hurtownie</option>
                {wholesaleIntegrations.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {selectedCountWithoutInvoice > 0 && (
              <Button
                onClick={openBulkInvoicing}
                disabled={isMobile}
                size="sm"
                className="h-9 px-4 gap-2 bg-primary hover:bg-primary/95 text-white font-semibold text-xs rounded-xl shadow-lg shadow-primary/20"
              >
                <FileText className="h-4 w-4" />
                {isMobile ? "Masowe FV zablokowane" : `Wystaw FV masowo (${selectedCountWithoutInvoice})`}
              </Button>
            )}
          </div>
        </div>

        {/* Tabela danych */}
        <div className="rounded-2xl border border-border/15 overflow-hidden bg-card/40 backdrop-blur-sm">
          <DataTable
            columns={columns}
            data={filteredOrders}
            pageCount={pageCount}
            pagination={pagination}
            setPagination={setPagination}
            isLoading={isOrdersLoading || isOrdersFetching}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            getRowId={(row) => row.id}
            viewMode="compact"
            onRowClick={(row) => openDetailsSheet(row.original)}
          />
        </div>
      </div>

      {/* Dialog fakturowania masowego / pojedynczego */}
      <Dialog
        open={isInvoicingDialogOpen}
        onOpenChange={(open) => {
          if (!isProcessingInvoices) {
            setInvoicingDialogOpen(open);
            if (!open) {
              setInvoicingProgress({});
            }
          }
        }}
      >
        <DialogContent className="max-w-xl bg-card border border-border/20 rounded-3xl shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {selectedOrdersForInvoicing.length > 1
                ? "Masowe wystawianie faktur sprzedaży"
                : "Wystawianie faktury sprzedaży"}
            </DialogTitle>
            <DialogDescription>
              Wystawianie dokumentów FS w systemie ERP (Subiekt GT) dla zrealizowanych zamówień dropshippingowych.
            </DialogDescription>
          </DialogHeader>

          {isResolvingMappings ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <span className="text-sm text-muted-foreground font-medium">
                Sprawdzanie mapowań produktów w bazie danych...
              </span>
            </div>
          ) : Object.keys(invoicingProgress).length > 0 ? (
            // Panel postępu
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Stan operacji</span>
                  <span>
                    {Object.values(invoicingProgress).filter((p) => p.status === "success").length} z{" "}
                    {Object.keys(invoicingProgress).length} ukończono
                  </span>
                </div>
                <Progress
                  value={
                    (Object.values(invoicingProgress).filter((p) => ["success", "failed"].includes(p.status))
                      .length /
                      Object.keys(invoicingProgress).length) *
                    100
                  }
                  className="h-2 rounded-full"
                />
              </div>

              <div className="border border-border/50 rounded-2xl max-h-[250px] overflow-y-auto divide-y divide-border/20 bg-background/50">
                {Object.entries(invoicingProgress).map(([poId, progress]) => (
                  <div key={poId} className="flex justify-between items-center p-3 text-xs">
                    <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                      <span className="font-semibold truncate text-foreground">
                        {progress.externalOrderId}
                      </span>
                      <span className="text-muted-foreground truncate">
                        Kupujący: {progress.buyerLogin}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {progress.status === "saving_mappings" && (
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="animate-spin h-3.5 w-3.5 text-primary" /> Zapisywanie mapowań
                        </span>
                      )}
                      {progress.status === "triggering" && (
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Loader2 className="animate-spin h-3.5 w-3.5 text-primary" /> Wystawianie FS...
                        </span>
                      )}
                      {progress.status === "success" && (
                        <Badge variant="success" className="gap-1 rounded-lg">
                          <CheckCircle2 className="h-3 w-3" /> Wystawiono
                        </Badge>
                      )}
                      {progress.status === "failed" && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-rose-400 gap-1 hover:bg-rose-500/10">
                              <AlertCircle className="h-3.5 w-3.5" /> Błąd
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 text-xs bg-red-950/90 text-red-100 border-red-500/30 rounded-xl">
                            <p className="font-semibold mb-1">Szczegóły błędu:</p>
                            <p>{progress.error || "Nieznany błąd serwera."}</p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Lista brakujących mapowań do uzupełnienia
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Przed wystawieniem faktury upewnij się, że pozycje w zamówieniach są poprawnie powiązane z symbolami towarów w ERP Subiekt GT.</span>
              </div>

              {unmappedProducts.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    Wymagane mapowania produktów ({unmappedProducts.length})
                  </h4>
                  <div className="border border-border/50 rounded-2xl p-4 space-y-4 max-h-[300px] overflow-y-auto bg-background/30">
                    {unmappedProducts.map((prod) => (
                      <div key={prod.offerId} className="flex flex-col gap-1.5 border-b border-border/10 pb-4 last:border-0 last:pb-0">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground leading-snug">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID Oferty: {prod.offerId}
                          </span>
                        </div>
                        {subiektIntegration && (
                          <div className="mt-1">
                            <SubiektProductCombobox
                              erpIntegrationId={subiektIntegration.id}
                              value={bulkMappings[prod.offerId] || ""}
                              onValueChange={(symbol) => {
                                setBulkMappings((prev) => ({
                                  ...prev,
                                  [prod.offerId]: symbol,
                                }));
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>Wszystkie produkty w zaznaczonych zamówieniach posiadają aktywne mapowania ERP.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            {!isProcessingInvoices && Object.keys(invoicingProgress).length === 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setInvoicingDialogOpen(false)}
                  className="rounded-xl h-9 text-xs"
                >
                  Anuluj
                </Button>
                <Button
                  onClick={handleGenerateInvoices}
                  disabled={
                    unmappedProducts.some((up) => !bulkMappings[up.offerId]?.trim()) ||
                    !subiektIntegration
                  }
                  className="rounded-xl h-9 text-xs gap-1.5 bg-primary hover:bg-primary/95 text-white"
                >
                  Generuj faktury ({selectedOrdersForInvoicing.length})
                </Button>
              </>
            ) : (
              // Po zakończeniu przetwarzania
              !isProcessingInvoices && (
                <Button
                  onClick={() => {
                    setInvoicingDialogOpen(false);
                    setInvoicingProgress({});
                  }}
                  className="rounded-xl h-9 text-xs bg-primary hover:bg-primary/95 text-white"
                >
                  Zamknij
                </Button>
              )
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isDetailsSheetOpen} onOpenChange={setIsDetailsSheetOpen}>
        <SheetContent className="w-[500px] sm:max-w-[550px] overflow-y-auto border-l border-border/15 bg-card/95 backdrop-blur-md p-6">
          <SheetHeader className="p-0 border-b border-border/10 pb-4 mb-6">
            <div>
              <SheetTitle className="text-lg font-bold text-foreground">
                Szczegóły Zlecenia
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-1">
                Zlecenie #{selectedPoForDetails?.id.substring(0, 8)} dla zamówienia {selectedPoForDetails?.marketplace_order?.external_order_id || "—"}
              </SheetDescription>
            </div>
          </SheetHeader>

          {selectedPoForDetails && (
            <div className="space-y-6 text-sm">
              {/* Sekcja przycisków akcji */}
              <div className="flex gap-2.5">
                <Link
                  href={`/orders/${selectedPoForDetails.marketplace_order_id || selectedPoForDetails.marketplace_order?.id || selectedPoForDetails.id}`}
                  passHref
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full justify-center gap-2 rounded-xl text-xs h-9 bg-background/50">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Przejdź do zamówienia
                  </Button>
                </Link>
                {selectedPoForDetails.marketplace_order?.erp_sales_document_number ? (
                  <Button
                    variant="outline"
                    className="flex-1 justify-center gap-2 rounded-xl text-xs h-9 border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                    onClick={() => {
                      const docNum = selectedPoForDetails.marketplace_order?.erp_sales_document_number;
                      if (docNum) {
                        downloadInvoicePdf(selectedPoForDetails.marketplace_order_id || selectedPoForDetails.id, docNum);
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Pobierz PDF FV
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="flex-1 justify-center gap-2 rounded-xl text-xs h-9"
                    disabled={isMobile}
                    onClick={() => {
                      setIsDetailsSheetOpen(false);
                      openSingleInvoice(selectedPoForDetails);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {isMobile ? "FV zablokowane na mobile" : "Wystaw FV"}
                  </Button>
                )}
              </div>

              {/* Informacje o zleceniu */}
              <div className="grid grid-cols-2 gap-4 border border-border/10 p-3 rounded-2xl bg-muted/5">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Status Zlecenia</span>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(selectedPoForDetails.status)} className="text-[10px] uppercase font-bold py-0 h-5">
                      {selectedPoForDetails.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Hurtownia</span>
                  <div className="text-xs font-semibold text-foreground mt-1.5">
                    {selectedPoForDetails.supplier_integration?.name || "—"}
                  </div>
                </div>
                {selectedPoForDetails.supplier_address_code && (
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Kod Adresu Dostawcy</span>
                    <div className="font-mono text-xs text-foreground mt-1">
                      {selectedPoForDetails.supplier_address_code}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Metoda Dostawy</span>
                  <div className="text-xs text-foreground mt-1">
                    {selectedPoForDetails.marketplace_order?.details_payload?.delivery?.method?.name || "Domyślna"}
                  </div>
                </div>
              </div>

              {/* Sekcja Produkty i stany magazynowe ERP */}
              <div>
                <h4 className="text-xs uppercase font-bold text-muted-foreground mb-2.5 tracking-wider">Produkty i stany magazynowe ERP</h4>
                <OrderProductsSection
                  po={selectedPoForDetails}
                  subiektIntegration={subiektIntegration}
                />
              </div>

              {/* Sekcja Dane do Faktury */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Dane do Faktury</h4>
                  {!isEditingInvoice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-primary hover:text-primary-hover px-2 rounded-lg gap-1"
                      onClick={() => setIsEditingInvoice(true)}
                    >
                      <Edit2 className="h-3 w-3" /> Edytuj
                    </Button>
                  )}
                </div>

                {isEditingInvoice ? (
                  <div className="space-y-3 border border-border/15 p-4 rounded-2xl bg-muted/10">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">Nazwa Firmy</label>
                        <Input
                          value={invoiceForm.company_name}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, company_name: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">NIP / Tax ID</label>
                        <Input
                          value={invoiceForm.tax_id}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_id: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">Imię</label>
                        <Input
                          value={invoiceForm.first_name}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, first_name: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">Nazwisko</label>
                        <Input
                          value={invoiceForm.last_name}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, last_name: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-semibold">Ulica i numer</label>
                      <Input
                        value={invoiceForm.street}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, street: e.target.value })}
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">Kod pocztowy</label>
                        <Input
                          value={invoiceForm.zip_code}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, zip_code: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground font-semibold">Miasto</label>
                        <Input
                          value={invoiceForm.city}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, city: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs rounded-lg px-3"
                        onClick={() => setIsEditingInvoice(false)}
                        disabled={updateInvoiceMutation.isPending}
                      >
                        Anuluj
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 text-xs rounded-lg px-3 gap-1"
                        onClick={() => updateInvoiceMutation.mutate(invoiceForm)}
                        disabled={updateInvoiceMutation.isPending || !invoiceForm.first_name || !invoiceForm.last_name || !invoiceForm.street || !invoiceForm.zip_code || !invoiceForm.city}
                      >
                        {updateInvoiceMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                        Zapisz
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-border/10 p-3 rounded-2xl bg-muted/5 text-xs space-y-1.5">
                    {selectedPoForDetails.marketplace_order?.invoice_address ? (
                      <>
                        {selectedPoForDetails.marketplace_order.invoice_address.company_name && (
                          <p className="font-semibold text-foreground">{selectedPoForDetails.marketplace_order.invoice_address.company_name}</p>
                        )}
                        {selectedPoForDetails.marketplace_order.invoice_address.tax_id && (
                          <p className="text-muted-foreground">NIP: <span className="font-mono text-foreground font-semibold">{selectedPoForDetails.marketplace_order.invoice_address.tax_id}</span></p>
                        )}
                        <p className="font-medium text-foreground">
                          {selectedPoForDetails.marketplace_order.invoice_address.first_name} {selectedPoForDetails.marketplace_order.invoice_address.last_name}
                        </p>
                        <p className="text-foreground">{selectedPoForDetails.marketplace_order.invoice_address.street}</p>
                        <p className="text-foreground">{selectedPoForDetails.marketplace_order.invoice_address.zip_code} {selectedPoForDetails.marketplace_order.invoice_address.city}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic py-1">Brak danych do faktury (zamówienie detaliczne bez NIP).</p>
                    )}
                  </div>
                )}
              </div>

              {/* Sekcja Oznaczenia (Flags) */}
              <div>
                <h4 className="text-xs uppercase font-bold text-muted-foreground mb-2.5 tracking-wider">Oznaczenia i Flagi</h4>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5 min-h-[30px] border border-border/10 p-3 rounded-2xl bg-muted/5">
                    {(selectedPoForDetails.marketplace_order?.flags || [])?.length > 0 ? (
                      (selectedPoForDetails.marketplace_order?.flags || []).map((flag) => (
                        <Badge
                          key={flag}
                          variant="secondary"
                          className="text-[10px] gap-1 px-1.5 py-0.5 h-6 rounded-lg font-medium border border-border/20"
                        >
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {flag}
                          <button
                            onClick={() => removeFlagMutation.mutate(flag)}
                            className="hover:text-destructive text-muted-foreground transition-colors ml-0.5"
                            title="Usuń oznaczenie"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic py-0.5">Brak nałożonych oznaczeń.</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newFlag}
                      onChange={(e) => setNewFlag(e.target.value)}
                      placeholder="Wpisz nowe oznaczenie (np. PILNE)..."
                      className="h-8 text-xs rounded-lg"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFlag.trim()) {
                          addFlagMutation.mutate(newFlag.trim());
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs rounded-lg px-3 gap-1"
                      onClick={() => {
                        if (newFlag.trim()) addFlagMutation.mutate(newFlag.trim());
                      }}
                      disabled={addFlagMutation.isPending || !newFlag.trim()}
                    >
                      {addFlagMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                      <Plus className="h-3.5 w-3.5" /> Dodaj
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sekcja Wiadomości */}
              <div>
                <h4 className="text-xs uppercase font-bold text-muted-foreground mb-1 tracking-wider">Wiadomości i uwagi transakcji</h4>
                <OrderMessagesSection
                  buyerLogin={selectedPoForDetails.buyer_login || selectedPoForDetails.marketplace_order?.buyer_login}
                  integrationId={selectedPoForDetails.marketplace_order?.service_integration_id || selectedPoForDetails.marketplace_order?.service_integration?.id}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
