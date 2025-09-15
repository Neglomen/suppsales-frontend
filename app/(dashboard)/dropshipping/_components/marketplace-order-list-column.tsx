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
import { Loader2, Search, Truck, Wand2 } from "lucide-react";
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
  params.append("fulfillmentStatus", "NEW");
  params.append("fulfillmentStatus", "PROCESSING");

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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [
        "marketplaceOrdersForDropshipping",
        { search: debouncedSearchTerm },
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
    estimateSize: () => 90,
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
    <div className="flex flex-col h-full bg-card relative">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj zamówienia..."
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

            const firstItemName =
              order.lineItems?.[0]?.offer?.name || "Zamówienie bez produktów";
            const receiverFullName =
              `${order.buyerFirstName || ""} ${
                order.buyerLastName || ""
              }`.trim() || order.buyerLogin;

            return (
              <div
                key={virtualRow.key}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={cn(
                  "absolute top-0 left-0 w-full p-3 border-b cursor-pointer flex items-center gap-3",
                  "hover:bg-muted/50 transition-colors duration-150",
                  selectedOrderId === order.id &&
                    "bg-accent text-accent-foreground"
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {order.hasPurchaseOrder && (
                        <span title="Dla tego zamówienia istnieje już zlecenie do dostawcy">
                          <Truck className="h-4 w-4 text-primary" />
                        </span>
                      )}
                      <span>
                        {new Date(order.purchasedAt).toLocaleDateString()}
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
                  {order.buyerLogin && (
                    <p
                      className="text-xs text-muted-foreground truncate"
                      title={order.buyerLogin}
                    >
                      {order.buyerLogin}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] bg-background border rounded-lg shadow-2xl p-3"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium whitespace-nowrap">
                Zaznaczono:{" "}
                <span className="text-primary">{selectedRows.size}</span>
              </p>
              <div className="flex items-center gap-2 w-full">
                <Label htmlFor="bulk-supplier" className="sr-only">
                  Hurtownia
                </Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                >
                  <SelectTrigger id="bulk-supplier" className="w-full">
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
                  className="flex-shrink-0"
                >
                  {isCreatingBulk && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Wand2 className="mr-2 h-4 w-4" />
                  Utwórz zlecenia
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
