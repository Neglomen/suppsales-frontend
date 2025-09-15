"use client";

import { useState, useRef, useEffect } from "react";
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
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";

interface OrderListColumnProps {
  selectedOrderId: string | null;
  onOrderSelect: (order: MarketplaceOrder) => void;
}

const fetchOrders = async ({
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
  if (filters && typeof filters === "object") {
    if (filters.search) {
      params.append("search", filters.search);
    }
    if (filters.fulfillmentStatus && filters.fulfillmentStatus.length > 0) {
      filters.fulfillmentStatus.forEach((status: string) =>
        params.append("fulfillmentStatus", status)
      );
    }
  }
  const res = await api.get("/orders", { params });
  return res.data;
};

export function OrderListColumn({
  selectedOrderId,
  onOrderSelect,
}: OrderListColumnProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<string[]>([
    "NEW",
    "PROCESSING",
    "READY_FOR_SHIPMENT",
  ]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        "shippingOrders",
        { fulfillmentStatus: statusFilter, search: debouncedSearchTerm },
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
    estimateSize: () => 120,
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

  const handleStatusChange = (value: string) => {
    if (!value) return;
    if (value === "ALL") {
      setStatusFilter([]);
    } else {
      setStatusFilter(value.split(","));
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-2 border-b space-y-2">
        <ToggleGroup
          type="single"
          value={statusFilter.join(",") || "ALL"}
          onValueChange={handleStatusChange}
          className="w-full grid grid-cols-3"
        >
          <ToggleGroupItem value="NEW,PROCESSING,READY_FOR_SHIPMENT">
            Do wysłania
          </ToggleGroupItem>
          <ToggleGroupItem value="SENT">Wysłane</ToggleGroupItem>
          <ToggleGroupItem value="ALL">Wszystkie</ToggleGroupItem>
        </ToggleGroup>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {!isLoading && allOrders.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Brak zamówień.
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

            const firstItemName =
              order.lineItems?.[0]?.offer?.name || "Zamówienie bez produktów";
            const receiverFullName =
              `${order.buyerFirstName || ""} ${
                order.buyerLastName || ""
              }`.trim() || order.buyerLogin;
            const isPickupPoint = !!order.pickupPoint;
            const deliveryMethod =
              order.detailsPayload?.delivery?.method?.name ||
              order.detailsPayload?.delivery_method ||
              "Nie określono";
            const isPaid = order.paymentStatus === "COMPLETED";
            const isCod = order.paymentType === "CASH_ON_DELIVERY";
            const isPaymentPending =
              order.paymentStatus === "PENDING" && !isCod;

            return (
              <div
                key={order.id}
                onClick={() => onOrderSelect(order)}
                className={cn(
                  "absolute top-0 left-0 w-full p-3 border-b cursor-pointer",
                  "hover:bg-muted/50 transition-colors duration-150",
                  order.fulfillmentStatus === "SENT" &&
                    "bg-muted/30 text-muted-foreground",
                  selectedOrderId === order.id &&
                    "bg-accent text-accent-foreground"
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {/* ### START FINALNEGO LAYOUTU ### */}
                <div className="flex flex-col h-full justify-between space-y-1">
                  {/* Sekcja górna: Integracja i data */}
                  <div className="flex justify-between text-xs items-center">
                    <span className="flex items-center gap-1.5 font-medium">
                      {order.serviceIntegration?.provider_type ===
                        "ALLEGRO" && <AllegroIcon className="h-4 w-4" />}
                      {order.serviceIntegration?.provider_type ===
                        "BASELINKER" && (
                        <BaseLinkerIcon className="h-4 w-4 rounded-sm" />
                      )}
                      <span
                        className="truncate"
                        title={
                          order.serviceIntegration?.name || "Brak integracji"
                        }
                      >
                        {order.serviceIntegration?.name || "Brak integracji"}
                      </span>
                    </span>
                    <span>
                      {new Date(order.purchasedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Sekcja środkowa: Dane zamówienia */}
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="font-semibold truncate" title={firstItemName}>
                      {firstItemName}
                    </p>
                    <p
                      className="text-sm truncate"
                      title={receiverFullName ?? undefined}
                    >
                      {receiverFullName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.externalOrderId}
                    </p>
                  </div>

                  {/* Sekcja dolna: Badge'e */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {/* Badge dostawy po lewej - może się rozciągać, ale nie wypchnie reszty */}
                    <Badge
                      variant="outline"
                      className="truncate shrink"
                      title={deliveryMethod}
                    >
                      {deliveryMethod}
                    </Badge>

                    {/* Grupa statusów po prawej - nie kurczy się i zachowuje stały rozmiar */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPaid && (
                        <Badge className="bg-green-600 hover:bg-green-700 text-green-foreground">
                          <PackageCheck className="h-3 w-3 mr-1" /> Opłacone
                        </Badge>
                      )}
                      {isCod && (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-foreground">
                          <CreditCard className="h-3 w-3 mr-1" /> Pobranie
                        </Badge>
                      )}
                      {isPaymentPending && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" /> Oczekuje
                        </Badge>
                      )}
                      {!isPaid && !isCod && !isPaymentPending && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" /> Nieopłacone
                        </Badge>
                      )}
                      {isPickupPoint ? (
                        <Badge className="bg-blue-500 hover:bg-blue-600 text-blue-foreground">
                          <MapPin className="h-3 w-3 mr-1" /> Punkt
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Box className="h-3 w-3 mr-1" /> Adres
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* ### KONIEC FINALNEGO LAYOUTU ### */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
