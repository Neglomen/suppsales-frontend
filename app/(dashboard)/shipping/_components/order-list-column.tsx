"use client";

import { useState, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebounce } from "use-debounce";
import api from "@/lib/api";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { PaginatedResponse } from "@/types/pagination";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Loader2,
  PackageCheck,
  CreditCard,
  Box,
  MapPin,
  Search,
  Truck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";

interface OrderListColumnProps {
  selectedOrder: MarketplaceOrder | null;
  onOrderSelect: (order: MarketplaceOrder) => void;
}

const fetchOrders = async ({
  pageParam = 1,
  queryKey,
}: {
  pageParam: number;
  queryKey: (string | Record<string, any>)[];
}): Promise<PaginatedResponse<MarketplaceOrder>> => {
  const [_key, filters] = queryKey;
  const params = new URLSearchParams();
  params.append("page", String(pageParam));
  params.append("size", "50");

  if (typeof filters === "object" && filters !== null) {
    for (const [key, value] of Object.entries(filters)) {
      if (key === "fulfillmentStatus" && Array.isArray(value)) {
        value.forEach((status) => params.append("fulfillmentStatus", status));
      } else if (value) {
        params.append(key, String(value));
      }
    }
  }

  const res = await api.get("/orders", { params });
  return res.data;
};

const parseOrderRowData = (order: MarketplaceOrder) => {
  const { details_payload, service_integration } = order;
  if (!details_payload || !service_integration) {
    return {
      receiverFullName: "Błąd danych",
      deliveryMethod: "Błąd danych",
      isCod: false,
      isPickupPoint: false,
    };
  }

  let receiverFullName = "Brak danych";
  let deliveryMethod = "Brak metody";
  let isCod = false;
  let isPickupPoint = false;

  if (service_integration.provider_type === "ALLEGRO") {
    const address = details_payload.delivery?.address;
    receiverFullName = `${address?.firstName || ""} ${
      address?.lastName || ""
    }`.trim();
    deliveryMethod = details_payload.delivery?.method?.name || "Nie określono";
    isCod = details_payload.payment?.type === "CASH_ON_DELIVERY";
    isPickupPoint = !!details_payload.delivery?.pickupPoint;
  } else if (service_integration.provider_type === "BASELINKER") {
    receiverFullName = details_payload.delivery_fullname || "Brak";
    deliveryMethod = details_payload.delivery_method || "Nie określono";
    isCod = String(details_payload.payment_method_cod) === "1";
    isPickupPoint = !!details_payload.delivery_point_id;
  }

  // Wykryj czy zamówienie ma fakturę
  let hasInvoice = false;
  if ((order as any).invoice_address) {
    hasInvoice = true;
  } else if (details_payload) {
    // Allegro
    hasInvoice = !!(details_payload.invoice?.required);
    // Baselinker
    if (!hasInvoice) hasInvoice = details_payload.want_invoice === "1";
  }

  return {
    receiverFullName: receiverFullName || "Brak danych odbiorcy",
    deliveryMethod,
    isCod,
    isPickupPoint,
    hasInvoice,
  };
};

export function OrderListColumn({
  selectedOrder,
  onOrderSelect,
}: OrderListColumnProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string>(
    "NEW,PROCESSING,READY_FOR_SHIPMENT"
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        "shippingOrders",
        {
          fulfillmentStatus:
            statusFilter === "ALL" ? undefined : statusFilter.split(","),
          search: debouncedSearchTerm,
        },
      ],
      queryFn: fetchOrders,
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    });

  const allOrders = data?.pages.flatMap((page) => page.items) ?? [];
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allOrders.length + 1 : allOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  const handleScroll = useCallback(() => {
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

  return (
    <div className="flex flex-col h-full glass border-none rounded-2xl overflow-hidden">
      <div className="p-4 space-y-3 bg-muted/10 border-b border-white/5">
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(value) => {
            if (value) setStatusFilter(value);
          }}
          className="w-full grid grid-cols-3"
        >
          <ToggleGroupItem
            value="NEW,PROCESSING,READY_FOR_SHIPMENT"
            aria-label="Do wysłania"
            className="text-xs sm:text-sm"
          >
            Do wysłania
          </ToggleGroupItem>
          <ToggleGroupItem
            value="SENT"
            aria-label="Wysłane"
            className="text-xs sm:text-sm"
          >
            Wysłane
          </ToggleGroupItem>
          <ToggleGroupItem
            value="ALL"
            aria-label="Wszystkie"
            className="text-xs sm:text-sm"
          >
            Wszystkie
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po nr zamówienia, loginie..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {allOrders.length === 0 && !isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Brak zamówień pasujących do kryteriów.
              </div>
            )}
            {virtualItems.map((virtualRow) => {
              const isLoaderRow = virtualRow.index > allOrders.length - 1;
              const order = allOrders[virtualRow.index];

              if (isLoaderRow && hasNextPage) {
                return (
                  <div
                    key="loader"
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="absolute top-0 left-0 w-full flex justify-center items-center p-4 text-sm text-muted-foreground"
                  >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ładowanie więcej...
                  </div>
                );
              }

              if (!order) return null;

              const { receiverFullName, deliveryMethod, isCod, isPickupPoint, hasInvoice } =
                parseOrderRowData(order);
              const isSent = order.fulfillment_status === "SENT";

              return (
                <div
                  key={order.id}
                  onClick={() => onOrderSelect(order)}
                  className={cn(
                    "absolute top-0 left-0 w-full p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-muted/30",
                    isSent && "bg-muted/10 text-muted-foreground opacity-80",
                    selectedOrder?.id === order.id &&
                      "bg-primary/20 hover:bg-primary/30 border-l-4 border-l-primary"
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      {order.service_integration?.provider_type ===
                        "ALLEGRO" && <AllegroIcon className="h-4 w-4" />}
                      {order.service_integration?.provider_type ===
                        "BASELINKER" && (
                        <BaseLinkerIcon className="h-4 w-4 rounded-sm" />
                      )}
                      {order.service_integration?.name || "Brak integracji"}
                    </span>
                    <span>
                      {order.purchased_at ? new Date(order.purchased_at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'Brak daty'}
                    </span>
                  </div>
                  <div className="font-semibold truncate mt-1">
                    {isSent && (
                      <Truck className="inline-block h-4 w-4 mr-2 text-green-600" />
                    )}
                    <span className="text-[14px]">{order.buyer_login || "Brak loginu"}</span>
                    <span
                      className={cn(
                        "ml-2 text-xs font-normal",
                        !isSent && "text-muted-foreground"
                      )}
                    >
                      ({receiverFullName})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className="truncate border-primary/20 bg-primary/5 text-[10px] px-1.5 py-0 h-4 font-normal text-primary">
                      {deliveryMethod}
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
                    {isPickupPoint && (
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
