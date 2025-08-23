"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { DataTable } from "@/components/shared/data-table";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Loader2,
  DollarSign,
  Truck,
  PlusCircle,
  MoreHorizontal,
  Mail, // Dodajemy ikonę Mail
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ManualOrderDialog } from "./_components/manual-order-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTableToolbar,
  type OrderFilters,
} from "./_components/data-table-toolbar";
import { format } from "date-fns";
import { SendEmailDialog } from "@/components/shared/send-email-dialog";
import type { OrderDetailsApiResponse } from "@/types/order";
import { useAuthGuard } from "@/hooks/use-auth-guard"; // Importujemy nasz hook

// Typy dla danych w tabeli
interface LineItem {
  id: string;
  offer: { name: string };
  quantity: number;
}
interface OrderIntegrationInfo {
  id: number;
  name: string;
  external_user_id: string | null;
  type: "ALLEGRO" | "BASELINKER";
}
interface Order {
  id: string;
  external_order_id: string;
  status: string;
  buyer_login: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  purchased_at: string;
  integration: OrderIntegrationInfo | null;
  total_to_pay: number;
  payment_type: "CASH_ON_DELIVERY" | "ONLINE" | null;
  tracking_numbers: string[] | null;
  line_items: LineItem[];
}
interface PaginatedOrdersResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: Order[];
}

export default function OrdersPage() {
  useAuthGuard();

  const [data, setData] = useState<PaginatedOrdersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [isManualOrderOpen, setManualOrderOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Order["integration"][]>([]);

  // Stany dla modala wysyłki e-mail
  const [isSendEmailOpen, setSendEmailOpen] = useState(false);
  const [activeOrder, setActiveOrder] =
    useState<OrderDetailsApiResponse | null>(null);

  // Stany dla DataTable
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    integrationId: "all",
    dateRange: undefined,
  });
  const debouncedSearch = useDebounce(filters.search, 500);

  const customMessageTemplate = {
    id: "custom",
    title: "",
    content: "",
    scope: "organization" as const,
    tags: [],
    parent_template: null,
    variants: [],
  };

  const openSendEmailDialog = async (orderId: string) => {
    try {
      // Pobieramy pełne szczegóły zamówienia, ponieważ modal ich potrzebuje (do `details_payload`)
      const response = await api.get<OrderDetailsApiResponse>(
        `/orders/${orderId}`
      );
      setActiveOrder(response.data);
      setSendEmailOpen(true);
    } catch {
      toast.error("Nie udało się pobrać pełnych danych zamówienia.");
    }
  };

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: "line_items",
        header: "Zamówienie",
        cell: ({ row }) => {
          const order = row.original;
          const firstItem = order.line_items?.[0];
          const buyerName = `${order.buyer_first_name || ""} ${
            order.buyer_last_name || ""
          }`.trim();
          return (
            <div>
              <p
                className="font-medium truncate max-w-[250px]"
                title={firstItem?.offer.name}
              >
                {firstItem?.offer.name || "Zamówienie ręczne"}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.buyer_login || "Brak loginu"}
              </p>
              {buyerName && (
                <p className="text-xs text-muted-foreground">{buyerName}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "purchased_at",
        header: "Data",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {new Date(row.getValue("purchased_at")).toLocaleString("pl-PL", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
        ),
      },
      {
        accessorKey: "integration.name",
        header: "Konto / Źródło",
        cell: ({ row }) => {
          const integration = row.original.integration;
          return (
            <div>
              <p>{integration?.name || "Ręczne"}</p>
              <p className="text-xs text-muted-foreground">
                {integration?.external_user_id}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("status")}</Badge>
        ),
      },
      {
        id: "indicators",
        header: () => <div className="text-right">Info</div>,
        cell: ({ row }) => {
          const order = row.original;
          const isPaid = order.payment_type === "ONLINE";
          const isCashOnDelivery = order.payment_type === "CASH_ON_DELIVERY";
          const hasTracking =
            order.tracking_numbers && order.tracking_numbers.length > 0;
          return (
            <TooltipProvider>
              <div className="flex justify-end items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    <DollarSign
                      className={cn(
                        "h-5 w-5",
                        isPaid
                          ? "text-green-500"
                          : isCashOnDelivery
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {order.total_to_pay ? `${order.total_to_pay} PLN` : ""}
                    {isPaid
                      ? ` (Opłacone)`
                      : isCashOnDelivery
                      ? " (Pobranie)"
                      : " (Nieopłacone)"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Truck
                      className={cn(
                        "h-5 w-5",
                        hasTracking ? "text-green-500" : "text-muted-foreground"
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasTracking
                      ? order.tracking_numbers?.join(", ")
                      : "Brak numeru przesyłki"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Otwórz menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Akcje</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  Zobacz szczegóły
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSendEmailDialog(order.id)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Wyślij e-mail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router]
  );

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await api.get<Order["integration"][]>("/integrations");
        setIntegrations(response.data);
      } catch {
        toast.error("Nie udało się pobrać listy integracji do filtra.");
      }
    };
    fetchIntegrations();
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!isLoading) setIsLoading(true);
    const sortParam = sorting[0]?.id;
    const orderParam = sorting[0]
      ? sorting[0].desc
        ? "desc"
        : "asc"
      : undefined;

    try {
      const response = await api.get<PaginatedOrdersResponse>("/orders", {
        params: {
          page: pagination.pageIndex + 1,
          size: pagination.pageSize,
          sort_by: sortParam,
          sort_order: orderParam,
          search: debouncedSearch || undefined,
          integration_id:
            filters.integrationId === "all"
              ? undefined
              : filters.integrationId === "manual"
              ? 0
              : filters.integrationId,
          date_from: filters.dateRange?.from
            ? format(filters.dateRange.from, "yyyy-MM-dd")
            : undefined,
          date_to: filters.dateRange?.to
            ? format(filters.dateRange.to, "yyyy-MM-dd")
            : undefined,
        },
      });
      setData(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać listy zamówień.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination, sorting, debouncedSearch, filters, isLoading]);

  useEffect(() => {
    fetchOrders();
  }, [pagination, sorting, debouncedSearch, filters]);

  const toolbar = useMemo(
    () => (
      <DataTableToolbar
        filters={filters}
        setFilters={setFilters}
        integrations={
          integrations.filter(Boolean) as { id: number; name: string }[]
        }
        onManualOrderClick={() => setManualOrderOpen(true)}
      />
    ),
    [filters, integrations]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zamówienia</h1>
          <p className="text-muted-foreground">
            Przeglądaj i zarządzaj swoimi zamówieniami ze wszystkich kanałów.
          </p>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items || []}
          pageCount={data?.pages || 0}
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
          toolbar={toolbar}
          onRowClick={(row) => router.push(`/orders/${row.original.id}`)}
        />
      )}

      <ManualOrderDialog
        isOpen={isManualOrderOpen}
        setIsOpen={setManualOrderOpen}
        onSuccess={fetchOrders}
      />

      {activeOrder && (
        <SendEmailDialog
          isOpen={isSendEmailOpen}
          setIsOpen={setSendEmailOpen}
          order={activeOrder}
          // === ZMIANA: Nie przekazujemy `templateToEdit`, więc modal wie, że ma pokazać listę ===
        />
      )}
    </div>
  );
}
