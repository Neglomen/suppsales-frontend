"use client";

import { useState, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebounce } from "use-debounce";
import api from "@/lib/api";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { ServiceIntegration } from "@/types/service-integration";
import { PaginatedResponse } from "@/types/pagination";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Truck, Wand2, CreditCard, PackageCheck, MapPin, FileText, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface MarketplaceOrderListColumnProps {
  selectedOrderId: string | null;
  onOrderSelect: (order: MarketplaceOrder) => void;
}

const fetchMarketplaceOrders = async ({
  pageParam = 1,
  queryKey,
}: {
  pageParam?: number;
  queryKey: any;
}): Promise<PaginatedResponse<MarketplaceOrder>> => {
  const [_key, filters] = queryKey;
  const params = new URLSearchParams();
  params.append("page", String(pageParam));
  params.append("size", "50");
  if (filters.search) {
    params.append("search", filters.search);
  }
  if (filters.fulfillmentStatus && Array.isArray(filters.fulfillmentStatus)) {
    // Backend API takes multiple `fulfillmentStatus` params
    filters.fulfillmentStatus.forEach((status: string) => {
      params.append("fulfillmentStatus", status);
    });
  }

  const res = await api.get("/orders", { params });
  return res.data;
};

export function MarketplaceOrderListColumn({
  selectedOrderId,
  onOrderSelect,
}: MarketplaceOrderListColumnProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        "marketplaceOrdersForDropshipping",
        {
          search: debouncedSearchTerm,
          fulfillmentStatus: statusFilter === "ALL" ? undefined : statusFilter.split(","),
        },
      ],
      queryFn: fetchMarketplaceOrders,
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    });

  const { data: suppliers } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  const { mutate: createPurchaseOrdersBulk, isPending: isCreatingBulk } =
    useMutation({
      mutationFn: (data: {
        marketplace_order_ids: string[];
        supplier_integration_id: number;
      }) => api.post("/purchase-orders/bulk-create", data),
      onSuccess: (response: { data: any }) => {
        const { success_count, failed_count, details } = response.data;
        if (failed_count > 0) {
          toast.error(
            `Udało się: ${success_count}. Błędy: ${failed_count}. Szczegóły: ${details.join(
              ", "
            )}`,
            { duration: 6000 }
          );
        } else {
          toast.success(
            `Pomyślnie dodano ${success_count} zleceń do listy roboczej.`
          );
        }
        setSelectedRows(new Set());
        queryClient.invalidateQueries({
          queryKey: ["marketplaceOrdersForDropshipping"],
        });
        queryClient.invalidateQueries({
          queryKey: ["purchaseOrders", { status: "DRAFT" }],
        });
      },
      // ### START KLUCZOWEJ POPRAWKI ###
      onError: (err: any) => {
        const errorDetail = err.response?.data?.detail;
        let message = "Wystąpił nieoczekiwany błąd.";

        if (typeof errorDetail === "string") {
          // Przypadek 1: Prosty komunikat błędu z backendu
          message = errorDetail;
        } else if (Array.isArray(errorDetail) && errorDetail.length > 0) {
          // Przypadek 2: Błąd walidacji Pydantic/FastAPI
          const firstError = errorDetail[0];
          if (firstError && typeof firstError.msg === "string") {
            message = `Błąd walidacji: ${firstError.msg}`;
          }
        }

        toast.error(message);
      },
      // ### KONIEC KLUCZOWEJ POPRAWKI ###
    });

  const allOrders = data?.pages.flatMap((page) => page.items) ?? [];
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allOrders.length + 1 : allOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (
      lastItem.index >= allOrders.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    virtualItems,
    allOrders.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const handleRowToggle = (orderId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleBulkCreate = () => {
    if (selectedRows.size > 0 && selectedSupplierId) {
      createPurchaseOrdersBulk({
        // Nazwy pól muszą być w snake_case, zgodnie z oczekiwaniami API
        marketplace_order_ids: Array.from(selectedRows),
        supplier_integration_id: parseInt(selectedSupplierId, 10),
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <div className="p-3 border-b border-border/10 bg-muted/20 backdrop-blur-md space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj zamówienia..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-background mt-2">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtruj statusy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Wszystkie zamówienia</SelectItem>
            <SelectItem value="NEW,PROCESSING,READY_FOR_SHIPMENT">Do wysłania</SelectItem>
            <SelectItem value="SENT,COMPLETED">Wysłane / Zakończone</SelectItem>
            <SelectItem value="CANCELLED">Anulowane</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {!isLoading && allOrders.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Brak zamówień do przetworzenia.
          </div>
        )}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const isLoaderRow = virtualRow.index > allOrders.length - 1;
            const order = allOrders[virtualRow.index];

            if (isLoaderRow)
              return hasNextPage ? (
                <div
                  key="loader"
                  className="flex justify-center items-center p-4"
                >
                  <Loader2 className="animate-spin" />
                </div>
              ) : null;
            if (!order) return null;

            const lineItems = order.lineItems || order.line_items || [];
            const firstItemName =
              lineItems[0]?.offer?.name || "Zamówienie bez produktów";
            
            const buyerFirstName = order.buyerFirstName || order.buyer_first_name || "";
            const buyerLastName = order.buyerLastName || order.buyer_last_name || "";
            const buyerLogin = order.buyerLogin || order.buyer_login || "";
            const receiverFullName =
              `${buyerFirstName} ${buyerLastName}`.trim() || buyerLogin;

            const serviceIntegration = order.serviceIntegration || order.service_integration;
            const hasPurchaseOrder = order.hasPurchaseOrder || (order as any).has_purchase_order;
            const payload = order.detailsPayload || (order as any).details_payload || {};
            
            const isCod = payload.payment?.type === "CASH_ON_DELIVERY" || String(payload.payment_method_cod) === "1";
            const deliveryMethodName = payload.delivery?.method?.name || payload.delivery_method || "Inna metoda";
            const pickupPoint = payload.delivery?.pickupPoint || payload.delivery_point_id;
            const invoice = payload.invoice || (payload.want_invoice === "1" ? payload : null);
            const hasInvoice = !!(invoice?.required || invoice?.invoice_company);

            return (
              <div
                key={virtualRow.key}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={cn(
                  "absolute top-0 left-0 w-full p-4 border-b border-border/10 cursor-pointer flex items-center gap-3",
                  "hover:bg-primary/5 hover:border-primary/20 transition-all duration-300",
                  selectedOrderId === order.id
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "border-l-4 border-l-transparent"
                )}
                onClick={() => onOrderSelect(order)}
              >
                <Checkbox
                  checked={selectedRows.has(order.id)}
                  onCheckedChange={() => handleRowToggle(order.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Zaznacz wiersz"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs items-center">
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      {serviceIntegration?.provider_type ===
                        "ALLEGRO" && <AllegroIcon className="h-4 w-4" />}
                      {serviceIntegration?.provider_type ===
                        "BASELINKER" && (
                        <BaseLinkerIcon className="h-4 w-4 rounded-sm" />
                      )}
                      <span
                        className="truncate"
                        title={
                          serviceIntegration?.name || "Brak integracji"
                        }
                      >
                        {serviceIntegration?.name || "Brak integracji"}
                      </span>
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasPurchaseOrder && (
                        <span title="Dla tego zamówienia istnieje już zlecenie do dostawcy">
                          <Truck className="h-4 w-4 text-primary" />
                        </span>
                      )}
                      <span>
                        {order.purchasedAt || order.purchased_at ? new Date((order.purchasedAt || order.purchased_at) as string).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'Brak daty'}
                      </span>
                    </div>
                  </div>
                  <div
                    className="font-semibold truncate pt-1"
                    title={firstItemName}
                  >
                    {firstItemName}
                  </div>
                  <p
                    className="text-sm truncate"
                    title={receiverFullName ?? undefined}
                  >
                    {receiverFullName}
                  </p>
                  {buyerLogin && (
                    <p
                      className="text-xs text-muted-foreground truncate"
                      title={buyerLogin}
                    >
                      {buyerLogin}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className="truncate border-primary/20 bg-primary/5 text-[10px] px-1.5 py-0 h-4 font-normal text-primary">
                      {deliveryMethodName}
                    </Badge>
                    {isCod ? (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-foreground text-[10px] px-1.5 py-0 h-4 font-normal">
                        <CreditCard className="h-2.5 w-2.5 mr-1" /> Pobranie
                      </Badge>
                    ) : (
                      <Badge className="bg-green-600 hover:bg-green-700 text-green-foreground text-[10px] px-1.5 py-0 h-4 font-normal">
                        <PackageCheck className="h-2.5 w-2.5 mr-1" /> Opłacone
                      </Badge>
                    )}
                    {pickupPoint && (
                      <Badge className="bg-blue-500 hover:bg-blue-600 text-blue-foreground text-[10px] px-1.5 py-0 h-4 font-normal">
                        <MapPin className="h-2.5 w-2.5 mr-1" /> Punkt
                      </Badge>
                    )}
                    {hasInvoice && (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 h-4 font-normal">
                        <FileText className="h-2.5 w-2.5 mr-1" /> FV
                      </Badge>
                    )}
                  </div>
                  
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] z-10 rounded-xl p-[1px] bg-gradient-to-r from-primary/60 via-primary to-primary/60 shadow-2xl shadow-primary/30"
          >
            <div className="rounded-[11px] bg-card/95 backdrop-blur-xl px-3 py-2.5 flex items-center gap-2">
              <Select
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
              >
                <SelectTrigger id="bulk-supplier" className="flex-1 min-w-0 bg-background/80 border-border/60 h-8 text-xs">
                  <SelectValue placeholder="Wybierz hurtownię..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleBulkCreate}
                disabled={!selectedSupplierId || isCreatingBulk}
                size="sm"
                className="flex-shrink-0 h-8 px-3 gap-1.5 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
              >
                {isCreatingBulk ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-semibold">
                  Utwórz ({selectedRows.size})
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
