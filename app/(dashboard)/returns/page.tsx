// src/app/(dashboard)/returns/page.tsx
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
  LayoutGrid,
  ListCollapse,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { ServiceIntegration } from "@/types/service-integration";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import {
  DataTableToolbar,
  type ReturnFilters,
} from "./_components/data-table-toolbar";

// Definicje typów
interface ReturnOrderInfo {
  id: string;
  external_order_id: string;
}

interface Return {
  id: string;
  external_return_id: string | null;
  reference_number: string | null;
  status: string;
  buyer_login: string | null;
  created_at_external: string;
  order: ReturnOrderInfo | null;
  integration_id: number | null;
  service_integration: ServiceIntegration | null;
}

interface PaginatedReturnsResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: Return[];
}

const getIntegrationStyle = (providerType: string | undefined) => {
  switch (providerType?.toUpperCase()) {
    case "ALLEGRO":
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-500/30",
        letter: "A",
      };
    case "BASELINKER":
      return {
        bg: "bg-indigo-500/10",
        text: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-500/30",
        letter: "B",
      };
    case "EMPIK":
      return {
        bg: "bg-pink-500/10",
        text: "text-pink-600 dark:text-pink-400",
        border: "border-pink-500/30",
        letter: "E",
      };
    default:
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-500/30",
        letter: "R",
      };
  }
};

const getReturnStatusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case "SENT":
      return {
        label: "Wysłany (SENT)",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      };
    case "DELIVERED":
      return {
        label: "Dostarczony (DELIVERED)",
        className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      };
    case "READY_FOR_PICKUP":
      return {
        label: "Gotowy do odbioru (READY_FOR_PICKUP)",
        className: "bg-yellow-500/10 text-amber-600 dark:text-yellow-400 border-yellow-500/30",
      };
    case "RECEIVED":
      return {
        label: "Odebrany (RECEIVED)",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      };
    case "CANCELLED":
      return {
        label: "Anulowany (CANCELLED)",
        className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      };
    case "REFUNDED":
      return {
        label: "Zwrócone środki (REFUNDED)",
        className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
      };
    default:
      return {
        label: status || "Nieznany",
        className: "bg-slate-500/10 text-muted-foreground border-border/30",
      };
  }
};

export default function ReturnsPage() {
  useAuthGuard();

  const [data, setData] = useState<PaginatedReturnsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [integrations, setIntegrations] = useState<ServiceIntegration[]>([]);
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");

  // Stany zsynchronizowane z URL w celu zachowania filtrów
  const [pagination, setPagination] = useState<PaginationState>(() => {
    if (typeof window === "undefined") return { pageIndex: 0, pageSize: 25 };
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    const pageSize = params.get("pageSize");
    return {
      pageIndex: page ? Math.max(0, parseInt(page) - 1) : 0,
      pageSize: pageSize ? parseInt(pageSize) : 25,
    };
  });

  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window === "undefined") return [];
    const params = new URLSearchParams(window.location.search);
    const sortBy = params.get("sortBy");
    const sortOrder = params.get("sortOrder");
    return sortBy ? [{ id: sortBy, desc: sortOrder === "desc" }] : [];
  });

  const [filters, setFilters] = useState<ReturnFilters>(() => {
    if (typeof window === "undefined") {
      return { search: "", integrationId: "all", status: "all" };
    }
    const params = new URLSearchParams(window.location.search);
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    return {
      search: params.get("search") || "",
      integrationId: params.get("integration") || "all",
      status: params.get("status") || "all",
      dateRange: dateFrom || dateTo ? {
        from: dateFrom ? new Date(dateFrom) : undefined,
        to: dateTo ? new Date(dateTo) : undefined,
      } : undefined,
    };
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  // Synchronizacja stanu do parametrów URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    
    if (pagination.pageIndex > 0) {
      params.set("page", String(pagination.pageIndex + 1));
    }
    if (pagination.pageSize !== 25) {
      params.set("pageSize", String(pagination.pageSize));
    }
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.integrationId !== "all") {
      params.set("integration", filters.integrationId);
    }
    if (filters.status && filters.status !== "all") {
      params.set("status", filters.status);
    }
    if (sorting.length > 0) {
      params.set("sortBy", sorting[0].id);
      params.set("sortOrder", sorting[0].desc ? "desc" : "asc");
    }
    if (filters.dateRange?.from) {
      params.set("dateFrom", format(filters.dateRange.from, "yyyy-MM-dd"));
    }
    if (filters.dateRange?.to) {
      params.set("dateTo", format(filters.dateRange.to, "yyyy-MM-dd"));
    }

    const queryString = params.toString();
    const newUrl = `/returns${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [pagination, sorting, filters]);

  // Pobranie integracji do filtra
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

  // Pobranie zwrotów z serwera
  const fetchReturns = useCallback(async () => {
    if (!isLoading) setIsLoading(true);
    const sortParam = sorting[0]?.id;
    const orderParam =
      sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

    try {
      const response = await api.get<PaginatedReturnsResponse>("/returns", {
        params: {
          page: pagination.pageIndex + 1,
          size: pagination.pageSize,
          sortBy: sortParam,
          sortOrder: orderParam,
          search: debouncedSearch || undefined,
          integrationId:
            filters.integrationId === "all"
              ? undefined
              : filters.integrationId,
          status: filters.status === "all" ? undefined : filters.status,
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
      toast.error("Nie udało się pobrać listy zwrotów.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination, sorting, debouncedSearch, filters, isLoading]);

  useEffect(() => {
    fetchReturns();
  }, [pagination, sorting, debouncedSearch, filters]);

  const columns = useMemo<ColumnDef<Return>[]>(
    () => [
      {
        accessorKey: "external_return_id",
        header: "ID Zwrotu / Referencja",
        cell: ({ row }) => {
          const isCompact = viewMode === "compact";
          return (
            <div className="space-y-0.5">
              <p className={cn("font-bold text-foreground/95 truncate", isCompact ? "text-xs" : "text-sm")}>
                {row.original.external_return_id || row.original.reference_number || "Brak ID"}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {row.original.buyer_login || "Brak danych kupującego"}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "order.external_order_id",
        header: "Powiązane Zamówienie",
        cell: ({ row }) => {
          const order = row.original.order;
          if (!order) return <span className="text-muted-foreground text-xs">Brak</span>;
          return (
            <Button
              variant="link"
              className="p-0 h-auto font-mono text-xs font-semibold text-primary hover:text-primary/80 transition-all flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/orders/${order.id}`);
              }}
            >
              {order.external_order_id}
            </Button>
          );
        },
      },
      {
        accessorKey: "service_integration.name",
        header: "Źródło",
        cell: ({ row }) => {
          const integration = row.original.service_integration;
          const styles = getIntegrationStyle(integration?.provider_type);
          return (
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border transition-all duration-200", styles.bg, styles.border)}>
                <span className={cn("text-xs font-bold font-mono", styles.text)}>{styles.letter}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">{integration?.name || "Brak integracji"}</p>
                <p className="text-[10px] text-muted-foreground truncate italic">
                  {integration?.external_user_id || "Brak konta"}
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
          const badgeStyles = getReturnStatusBadge(status);
          return (
            <Badge
              variant="outline"
              className={cn(
                "rounded-lg font-bold text-[10px] uppercase tracking-tighter h-6 px-2",
                badgeStyles.className
              )}
            >
              {badgeStyles.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "created_at_external",
        header: "Data utworzenia",
        cell: ({ row }) => {
          const dateStr = row.original.created_at_external;
          if (!dateStr) return "—";
          const dateVal = new Date(dateStr);
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {format(dateVal, "dd.MM.yyyy")}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(dateVal, "HH:mm")}
              </span>
            </div>
          );
        },
      },
    ],
    [router, viewMode]
  );

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
      />
    ),
    [filters, integrations]
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-10">
      {/* Szklany, premium nagłówek */}
      <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-slate-900/40 backdrop-blur-xl p-6 md:p-8 shadow-xl shadow-black/10">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none animate-pulse" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              Pulpit Sprzedawcy
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-none">
              Zwroty
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Inteligentne i wydajne zarządzanie zwrotami oraz reklamacjami klientów.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-950/10 dark:bg-slate-950/60 border border-border/30 p-1 rounded-2xl backdrop-blur-md self-start md:self-auto shadow-inner">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("compact")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all duration-300",
                viewMode === "compact"
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListCollapse className="h-3.5 w-3.5" />
              Tryb Kompaktowy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("expanded")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all duration-300",
                viewMode === "expanded"
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tryb Rozszerzony
            </Button>
          </div>
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
          viewMode={viewMode}
          onRowClick={(row) => router.push(`/returns/${row.original.id}`)}
        />
      )}
    </div>
  );
}
