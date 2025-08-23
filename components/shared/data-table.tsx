// src/components/shared/data-table.tsx
"use client";

import React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  PaginationState,
  Row,
  SortingState,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";

// Interfejs propsów - paginacja i sortowanie są teraz opcjonalne
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  // Opcjonalne propsy dla paginacji i sortowania po stronie serwera
  pageCount?: number;
  pagination?: PaginationState;
  setPagination?: React.Dispatch<React.SetStateAction<PaginationState>>;
  sorting?: SortingState;
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  onRowClick,
  pageCount,
  pagination: serverPagination,
  setPagination: setServerPagination,
  sorting: serverSorting,
  setSorting: setServerSorting,
}: DataTableProps<TData, TValue>) {
  // Sprawdzamy, czy komponent ma działać w trybie serwerowym
  const isServerSide = pageCount !== undefined;

  // Lokalne stany dla sortowania, filtrowania i paginacji po stronie klienta
  const [clientSorting, setClientSorting] = React.useState<SortingState>([]);
  const [clientPagination, setClientPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10, // Możesz dostosować domyślny rozmiar strony dla trybu klienckiego
    });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    // Jeśli `pageCount` jest zdefiniowany, używamy go. W przeciwnym razie, tabela sama go obliczy.
    pageCount: pageCount ?? -1,
    state: {
      // Używamy stanów przekazanych z zewnątrz (serwer) lub lokalnych (klient)
      sorting: isServerSide ? serverSorting : clientSorting,
      pagination: isServerSide ? serverPagination : clientPagination,
      columnFilters,
    },
    // Używamy setterów przekazanych z zewnątrz (serwer) lub lokalnych (klient)
    onPaginationChange: isServerSide
      ? setServerPagination
      : setClientPagination,
    onSortingChange: isServerSide ? setServerSorting : setClientSorting,
    onColumnFiltersChange: setColumnFilters,
    // Włączamy odpowiednie modele wierszy
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // Włączamy/wyłączamy tryb manualny w zależności od `isServerSide`
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
  });

  return (
    <div className="space-y-4">
      {toolbar}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width:
                        header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                  >
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
                  onClick={() => onRowClick && onRowClick(row)}
                  className={
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
                  }
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Brak wyników.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Paginacja jest wyświetlana tylko, jeśli jest potrzebna */}
      {table.getPageCount() > 1 && <DataTablePagination table={table} />}
    </div>
  );
}
