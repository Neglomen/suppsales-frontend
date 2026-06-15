"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ProductErpMapping } from "@/types/product-erp-mapping";
import { PaginatedResponse } from "@/types/pagination";
import { MarketplaceOffer } from "@/types/marketplace-offer";
import { ServiceIntegration } from "@/types/service-integration";
import { InlineMappingCell } from "./inline-mapping-cell";
import { Loader2, ExternalLink, ImageIcon } from "lucide-react";

export function MappingsDataTable() {
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sourceIntegrationId, setSourceIntegrationId] =
    React.useState<string>("");
  const [erpIntegrationId, setErpIntegrationId] = React.useState<string>("");

  const { data: marketplaceIntegrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "MARKETPLACE" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=MARKETPLACE")).data,
  });

  const { data: erpIntegrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations", { category: "ERP" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=ERP")).data,
  });

  const { data: offersData, isLoading: isOffersLoading } = useQuery<
    PaginatedResponse<MarketplaceOffer>
  >({
    queryKey: ["marketplaceOffers", sourceIntegrationId, pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        size: String(pagination.pageSize),
      });
      const response = await api.get(
        `/erp-proxy/integrations/${sourceIntegrationId}/offers?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!sourceIntegrationId,
    placeholderData: keepPreviousData,
  });

  const offerIds = React.useMemo(
    () => offersData?.items.map((o) => o.id) ?? [],
    [offersData]
  );

  const { data: existingMappings } = useQuery<
    Record<string, ProductErpMapping>
  >({
    queryKey: [
      "productErpMappings",
      offerIds,
      sourceIntegrationId,
      erpIntegrationId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      offerIds.forEach((id) => params.append("offer_ids", id));
      params.append("source_integration_id", sourceIntegrationId);
      params.append("erp_integration_id", erpIntegrationId);
      const res = await api.get(
        `/product-erp-mappings/by-offers-and-integrations?${params.toString()}`
      );
      return res.data;
    },
    enabled: offerIds.length > 0 && !!sourceIntegrationId && !!erpIntegrationId,
  });

  const tableColumns = React.useMemo<ColumnDef<MarketplaceOffer>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Oferta",
        cell: ({ row }) => (
          <div className="flex items-center gap-4">
            {row.original.image_url ? (
              <img
                src={row.original.image_url}
                alt={row.original.name}
                className="h-10 w-10 min-w-10 rounded-md object-contain bg-white p-0.5 border border-border/50"
              />
            ) : (
              <div className="flex bg-muted/50 h-10 w-10 min-w-10 rounded-md items-center justify-center border border-border/50 text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5 font-medium truncate">
                {row.original.url ? (
                  <a
                    href={row.original.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1.5 truncate"
                    title={row.original.name}
                  >
                    <span className="truncate">{row.original.name}</span>
                    <ExternalLink className="h-3 w-3 min-w-3 text-muted-foreground hover:text-primary transition-colors" />
                  </a>
                ) : (
                  <span className="truncate" title={row.original.name}>{row.original.name}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono truncate">
                {row.original.id}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "erpSymbol",
        header: "Symbol w ERP",
        cell: ({ row }) => (
          <InlineMappingCell
            offer={row.original}
            mapping={existingMappings?.[row.original.id]}
            erpIntegrationId={parseInt(erpIntegrationId)}
            sourceIntegrationId={parseInt(sourceIntegrationId)}
          />
        ),
      },
    ],
    [existingMappings, erpIntegrationId, sourceIntegrationId]
  );

  const table = useReactTable({
    data: offersData?.items ?? [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    rowCount: offersData?.total ?? 0,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-xl bg-muted/20 backdrop-blur-sm shadow-sm ring-1 ring-border/50">
        <div className="flex-1 space-y-2.5">
          <label className="text-sm font-semibold text-foreground/90">1. Wybierz Marketplace</label>
          <Select
            value={sourceIntegrationId}
            onValueChange={setSourceIntegrationId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz integrację..." />
            </SelectTrigger>
            <SelectContent>
              {marketplaceIntegrations?.map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-2.5">
          <label className="text-sm font-semibold text-foreground/90">2. Wybierz System ERP</label>
          <Select value={erpIntegrationId} onValueChange={setErpIntegrationId}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz integrację..." />
            </SelectTrigger>
            <SelectContent>
              {erpIntegrations?.map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-xl shadow-sm overflow-hidden bg-card ring-1 ring-border/50">
        <Table>
          <TableHeader className="bg-muted/40 backdrop-blur-[2px]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 font-semibold text-muted-foreground">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group transition-colors hover:bg-muted/20">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`py-3 ${cell.column.id === "erpSymbol" ? "w-[450px]" : ""}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {isOffersLoading ? (
                    <div className="flex justify-center items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm">Pobieranie ofert...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-sm font-medium">Brak ofert do wyświetlenia</span>
                      <span className="text-xs">Wybierz odpowiednie integracje w panelu powyżej.</span>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Strona {table.getState().pagination.pageIndex + 1} z{" "}
          {table.getPageCount()} ({offersData?.total ?? 0} ofert)
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Poprzednia
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Następna
          </Button>
        </div>
      </div>
    </div>
  );
}
