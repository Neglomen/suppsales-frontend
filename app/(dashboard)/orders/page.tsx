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
  Mail,
  Package,
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
import type { ServiceIntegration } from "@/types/service-integration";
import { useAuthGuard } from "@/hooks/use-auth-guard"; // Importujemy nasz hook
import type { OrderDetailsApiResponse } from "@/types/order";

// Typy dla danych w tabeli
interface LineItem {
  id: string;
  offer: { name: string };
  quantity: number;
  imageUrl?: string | null;
}

interface Order {
  id: string;
  external_order_id: string;
  status: string;
  buyer_login: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  purchased_at: string;
  service_integration: ServiceIntegration | null;
  total_to_pay: number;
  payment_type: "CASH_ON_DELIVERY" | "ONLINE" | null;
  tracking_numbers: string[] | null;
  line_items: LineItem[];
  flags: string[] | null;
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
  const [integrations, setIntegrations] = useState<ServiceIntegration[]>([]);

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
        id: "product_image",
        header: "Produkt",
        cell: ({ row }) => {
          const firstItem = row.original.line_items?.[0];
          // Próbujemy pobrać obrazek z metadanych lub używamy placeholderu
          return (
            <div className="relative h-12 w-12 rounded-xl border border-border/10 overflow-hidden bg-white group-hover/row:scale-105 transition-transform p-0.5">
              {firstItem?.imageUrl ? (
                <img 
                  src={firstItem.imageUrl} 
                  alt={firstItem.offer?.name || "Produkt"} 
                  className="absolute inset-0 w-full h-full object-contain p-0.5"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                  <Package className="h-6 w-6" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "line_items",
        header: "Szczegóły Zamówienia",
        cell: ({ row }) => {
          const order = row.original;
          const firstItem = order.line_items?.[0];
          const buyerName = `${order.buyer_first_name || ""} ${
            order.buyer_last_name || ""
          }`.trim();
          const hasMissingStock = order.flags?.includes("BRAK_STANU");
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2 max-w-[250px]">
                <p
                  className="font-bold text-sm truncate premium-gradient-text"
                  title={firstItem?.offer.name}
                >
                  {firstItem?.offer.name || "Zamówienie ręczne"}
                </p>
                {hasMissingStock && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5 whitespace-nowrap bg-red-500/10 text-red-600 border-red-500/20">
                    BRAK TOWARU
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-medium bg-primary/5 text-primary border-primary/10">
                  {order.external_order_id.split("-").pop()}
                </Badge>
                <p className="text-xs text-muted-foreground font-medium">
                  {order.buyer_login || "Brak loginu"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "purchased_at",
        header: "Data",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {format(new Date(row.original.purchased_at), "dd.MM.yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(row.original.purchased_at), "HH:mm")}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "service_integration.name",
        header: "Źródło",
        cell: ({ row }) => {
          const integration = row.original.service_integration;
          return (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Badge variant="outline" className="p-0 border-none text-primary font-bold">{integration?.name?.[0] || "R"}</Badge>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{integration?.name || "Ręczne"}</p>
                <p className="text-[10px] text-muted-foreground truncate italic">
                  {integration?.external_user_id}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const isCompleted = ["PICKED_LISTED", "SENT"].includes(status);
          return (
            <Badge 
              variant={isCompleted ? "default" : "outline"}
              className={cn(
                "rounded-lg font-bold text-[10px] uppercase tracking-tighter h-6 px-2",
                isCompleted ? "bg-emerald-500 hover:bg-emerald-600 border-none" : "border-primary/20 text-primary bg-primary/5"
              )}
            >
              {status}
            </Badge>
          );
        },
      },
      {
        id: "indicators",
        header: () => <div className="text-right">Wpłata / Wysyłka</div>,
        cell: ({ row }) => {
          const order = row.original;
          const isPaid = order.payment_type === "ONLINE";
          const isCashOnDelivery = order.payment_type === "CASH_ON_DELIVERY";
          const hasTracking =
            order.tracking_numbers && order.tracking_numbers.length > 0;
          return (
            <TooltipProvider>
              <div className="flex justify-end items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                      isPaid ? "bg-emerald-500/10 text-emerald-500" : isCashOnDelivery ? "bg-yellow-500/10 text-yellow-500" : "bg-muted text-muted-foreground"
                    )}>
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="font-bold">{order.total_to_pay} PLN</div>
                    <p className="text-xs opacity-80">
                      {isPaid ? "Opłacone online" : isCashOnDelivery ? "Pobranie" : "Nieopłacone"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                      hasTracking ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"
                    )}>
                      <Truck className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasTracking
                      ? order.tracking_numbers?.join(", ")
                      : "Brak numeru nadania"}
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
        const response = await api.get<ServiceIntegration[]>(
          "/service-integrations"
        );
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
    const orderParam =
      sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

    try {
      const response = await api.get<PaginatedOrdersResponse>("/orders", {
        params: {
          page: pagination.pageIndex + 1,
          size: pagination.pageSize,
          sortBy: sortParam,
          sortOrder: orderParam,
          search: debouncedSearch || undefined,
          integrationId:
            filters.integrationId === "all"
              ? undefined
              : filters.integrationId === "manual"
              ? 0
              : filters.integrationId,
          dateFrom: filters.dateRange?.from
            ? format(filters.dateRange.from, "yyyy-MM-dd")
            : undefined,
          dateTo: filters.dateRange?.to
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
          integrations.filter(
            (integration) =>
              integration &&
              ["ALLEGRO", "BASELINKER", "EMPIK"].includes(
                integration.provider_type
              )
          ) as { id: number; name: string }[]
        }
        onManualOrderClick={() => setManualOrderOpen(true)}
      />
    ),
    [filters, integrations]
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight premium-gradient-text">
            Zamówienia
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Inteligentne zarządzanie sprzedażą wielokanałową.
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
