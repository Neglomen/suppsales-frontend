// src/app/(dashboard)/returns/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { DataTable } from "@/components/shared/data-table";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
}
interface PaginatedReturnsResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: Return[];
}

export default function ReturnsPage() {
  const [data, setData] = useState<PaginatedReturnsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const columns = useMemo<ColumnDef<Return>[]>(
    () => [
      {
        accessorKey: "external_return_id",
        header: "ID Zwrotu / Referencja",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {row.original.external_return_id || row.original.reference_number}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.buyer_login || "Brak danych kupującego"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "order.external_order_id",
        header: "Powiązane Zamówienie",
        cell: ({ row }) =>
          row.original.order ? (
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link href={`/orders/${row.original.order.id}`}>
                {row.original.order.external_order_id}
              </Link>
            </Button>
          ) : (
            <span className="text-muted-foreground">Brak</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline">{row.getValue("status")}</Badge>
        ),
      },
      {
        accessorKey: "created_at_external",
        header: "Data utworzenia",
        cell: ({ row }) =>
          new Date(row.getValue("created_at_external")).toLocaleString("pl-PL"),
      },
    ],
    []
  );

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<PaginatedReturnsResponse>("/returns", {
        params: { page: pagination.pageIndex + 1, size: pagination.pageSize },
      });
      setData(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać listy zwrotów.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  if (!data && isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zwroty</h1>
          <p className="text-muted-foreground">
            Przeglądaj i zarządzaj zwrotami od klientów.
          </p>
        </div>
        {/* TODO: Przycisk do ręcznego dodawania zwrotu */}
      </div>
      {data && (
        <DataTable
          columns={columns}
          data={data.items}
          pageCount={data.pages}
          pagination={pagination}
          setPagination={setPagination}
          sorting={[]}
          setSorting={() => {}} // Na razie bez sortowania
          onRowClick={(row) => router.push(`/returns/${row.original.id}`)}
        />
      )}
    </div>
  );
}
