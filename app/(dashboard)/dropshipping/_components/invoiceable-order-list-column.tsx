"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebounce } from "use-debounce";
import api from "@/lib/api";
import { PaginatedResponse } from "@/types/pagination";
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "@/types/purchase-order";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { Input } from "@/components/ui/input";
import { Loader2, Search, FileText, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InvoiceableOrderListProps {
  selectedOrderId: string | null;
  onOrderSelect: (order: MarketplaceOrder) => void;
}

const fetchInvoiceablePurchaseOrders = async ({
  pageParam = 1,
  queryKey,
}: {
  pageParam?: number;
  queryKey: readonly [string, { search: string }];
}): Promise<PaginatedResponse<PurchaseOrder>> => {
  const [, { search }] = queryKey;
  const params = new URLSearchParams();
  params.append("page", String(pageParam));
  params.append("size", "50");

  if (search) {
    params.append("search", search);
  }

  const res = await api.get("/purchase-orders/invoiceable", { params });
  return res.data;
};

const getStatusVariant = (
  status: PurchaseOrderStatus
): "default" | "secondary" | "outline" | "destructive" | "success" => {
  switch (status as any) {
    case "SENT_TO_SUPPLIER":
      return "secondary";
    case "DISPATCHED":
      return "default";
    case "COMPLETED":
      return "success";
    default:
      return "outline";
  }
};

export function InvoiceableOrderListColumn({
  selectedOrderId,
  onOrderSelect,
}: InvoiceableOrderListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: [
      "invoiceablePurchaseOrders",
      { search: debouncedSearchTerm },
    ] as const,
    queryFn: fetchInvoiceablePurchaseOrders,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    staleTime: 0, // Zawsze odświeżaj dane
    refetchOnMount: true,
  });

  useEffect(() => {
    if (error) {
      console.error("Błąd z React Query:", error);
    }
  }, [error]);
  if (error) {
    console.error("Błąd z React Query:", error);
  }

  const groupedOrders = useMemo(() => {
    const allPurchaseOrders = data?.pages.flatMap((p) => p.items) ?? [];
    const orderMap = new Map<
      string,
      { order: MarketplaceOrder; statuses: Set<PurchaseOrderStatus> }
    >();
    allPurchaseOrders.forEach((po) => {
      const order = po.marketplace_order;
      if (!order) return;
      if (!orderMap.has(order.id)) {
        orderMap.set(order.id, {
          order: order as any,
          statuses: new Set(),
        });
      }
      orderMap.get(order.id)!.statuses.add(po.status);
    });
    return Array.from(orderMap.values());
  }, [data]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? groupedOrders.length + 1 : groupedOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (
      lastItem.index >= groupedOrders.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    virtualItems,
    groupedOrders.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const getInvoiceStatus = (orderId: string) => {
    return false; // Placeholder
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b bg-card/20 backdrop-blur-sm flex-shrink-0 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Zrealizowane zlecenia
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po loginie, nazwisku..."
            className="pl-8 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        )}
        {!isLoading && groupedOrders.length === 0 && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center bg-card/20 border border-dashed rounded-lg p-10">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Brak zleceń</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Brak zrealizowanych zleceń dropshippingowych.
              </p>
            </div>
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
            const isLoaderRow = virtualRow.index > groupedOrders.length - 1;
            const groupedItem = groupedOrders[virtualRow.index];

            if (isLoaderRow) {
              return hasNextPage ? (
                <div
                  key="loader"
                  className="flex justify-center items-center p-4"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    position: "absolute",
                    width: "100%",
                  }}
                >
                  <Loader2 className="animate-spin" />
                </div>
              ) : null;
            }

            if (!groupedItem) return null;

            const { order, statuses } = groupedItem;
            const hasInvoice = getInvoiceStatus(order.id);
            const isActive = selectedOrderId === order.id;
            const firstItemName =
              order.lineItems?.[0]?.offer.name || "Zamówienie bez produktów";

            return (
              <div
                key={order.id}
                onClick={() => onOrderSelect(order)}
                className={cn(
                  "absolute top-0 left-0 w-full transition-colors duration-150 cursor-pointer border-b",
                  isActive
                    ? "bg-primary/10 border-l-4 border-l-primary"
                    : "hover:bg-card/40 border-l-4 border-l-transparent"
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex flex-col h-full min-h-0 p-3">
                  <div className="flex justify-between text-xs items-center text-muted-foreground flex-shrink-0">
                    <span className="flex items-center gap-2 font-medium truncate">
                      {order.serviceIntegration?.provider_type ===
                        "ALLEGRO" && <AllegroIcon className="h-4" />}
                      {order.serviceIntegration?.provider_type ===
                        "BASELINKER" && <BaseLinkerIcon className="h-4" />}
                      <span
                        className="truncate"
                        title={order.serviceIntegration?.name}
                      >
                        {order.serviceIntegration?.name}
                      </span>
                    </span>
                    <span className="flex-shrink-0">
                      {order.purchasedAt ? new Date(order.purchasedAt).toLocaleDateString("pl-PL") : "—"}
                    </span>
                  </div>

                  <div className="py-2">
                    <p
                      className="font-semibold truncate"
                      title={order.buyerLogin ?? undefined}
                    >
                      {order.buyerLogin}
                    </p>
                    <p
                      className="text-sm text-muted-foreground truncate"
                      title={firstItemName}
                    >
                      {firstItemName}
                    </p>
                  </div>

                  <div className="flex justify-between items-end mt-auto flex-shrink-0">
                    <div className="flex gap-1 flex-wrap">
                      {Array.from(statuses).map((status) => (
                        <Badge
                          key={status}
                          variant={getStatusVariant(status)}
                          className="text-xs"
                        >
                          {status}
                        </Badge>
                      ))}
                    </div>

                    {hasInvoice && (
                      <div className="flex-shrink-0 ml-2">
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger>
                              <FileText className="h-4 w-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Faktura została już wystawiona.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
