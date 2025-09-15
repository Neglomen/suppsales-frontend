"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ProductSupplierMapping } from "@/types/product-supplier-mapping";
import { PaginatedResponse } from "@/types/pagination";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MappingFormDialog } from "./mapping-form-dialog";
import toast from "react-hot-toast";

// Definicja kolumn jest teraz funkcją, aby mogła przyjąć handlery akcji
export const columns = (
  onEdit: (mapping: ProductSupplierMapping) => void,
  onDelete: (mappingId: string) => void
): ColumnDef<ProductSupplierMapping>[] => [
  {
    accessorKey: "marketplace_offer_id",
    header: "ID Oferty Marketplace",
  },
  {
    accessorKey: "supplierProductIndex",
    header: "Indeks Dostawcy",
  },
  {
    accessorKey: "supplierIntegrationId",
    header: "Hurtownia",
    // TODO: W przyszłości, zamiast ID, możemy pobrać listę integracji i wyświetlić nazwę.
    cell: ({ row }) => <span>ID: {row.original.supplierIntegrationId}</span>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const mapping = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Otwórz menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Akcje</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(mapping)}>
                Edytuj
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(mapping.id)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function MappingsDataTable() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [editingMapping, setEditingMapping] =
    React.useState<ProductSupplierMapping | null>(null);

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = useQuery<
    PaginatedResponse<ProductSupplierMapping>
  >({
    queryKey: ["productMappings", pagination],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        size: String(pagination.pageSize),
      });
      const response = await api.get(
        `/product-supplier-mappings?${params.toString()}`
      );
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const { mutate: deleteMapping } = useMutation({
    mutationFn: (mappingId: string) =>
      api.delete(`/product-supplier-mappings/${mappingId}`),
    onSuccess: () => {
      toast.success("Mapowanie zostało usunięte.");
      queryClient.invalidateQueries({ queryKey: ["productMappings"] });
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Nie udało się usunąć mapowania."
      ),
  });

  const handleOpenDialog = (mapping: ProductSupplierMapping | null = null) => {
    setEditingMapping(mapping);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMapping(null);
  };

  const tableColumns = React.useMemo(
    () => columns(handleOpenDialog, deleteMapping),
    [deleteMapping]
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    rowCount: data?.total ?? 0,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj mapowanie
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  className="h-24 text-center"
                >
                  {isLoading ? "Ładowanie..." : "Brak wyników."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Strona {table.getState().pagination.pageIndex + 1} z{" "}
          {table.getPageCount()}
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
      <MappingFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        mapping={editingMapping}
      />
    </div>
  );
}
