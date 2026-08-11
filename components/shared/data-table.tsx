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
  RowSelectionState,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "./data-table-pagination";

// === ZMIANA: DODANIE `isLoading` DO INTERFEJSU ===
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  toolbar?: React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  pageCount?: number;
  pagination?: PaginationState;
  setPagination?: React.Dispatch<React.SetStateAction<PaginationState>>;
  sorting?: SortingState;
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>;
  isLoading?: boolean; // Nowy, opcjonalny props
  rowSelection?: RowSelectionState;
  setRowSelection?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  viewMode?: "compact" | "expanded";
  getRowId?: (originalRow: TData, relativeIndex: number, parent?: Row<TData>) => string;
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
  isLoading, // Odbierz nowy props
  rowSelection,
  setRowSelection,
  viewMode = "expanded",
  getRowId,
}: DataTableProps<TData, TValue>) {
  const isServerSide = pageCount !== undefined;

  const [clientSorting, setClientSorting] = React.useState<SortingState>([]);
  const [clientPagination, setClientPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: 10,
    });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [clientRowSelection, setClientRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    getRowId: getRowId ?? ((row: any, index: number) => row.id?.toString() ?? row._id?.toString() ?? String(index)),
    state: {
      sorting: isServerSide ? serverSorting : clientSorting,
      pagination: isServerSide ? serverPagination : clientPagination,
      columnFilters,
      rowSelection: rowSelection ?? clientRowSelection,
    },
    onPaginationChange: isServerSide
      ? setServerPagination
      : setClientPagination,
    onSortingChange: isServerSide ? setServerSorting : setClientSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection ?? setClientRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    enableRowSelection: true,
  });

  return (
    <div className="space-y-6">
      {toolbar}
      <div className="rounded-xl border border-border/30 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "bg-primary/5 text-primary font-bold uppercase tracking-wider text-[10px] transition-all duration-200",
                        viewMode === "compact" ? "py-2" : "py-4"
                      )}
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
              {/* === NOWA LOGIKA RENDEROWANIA CIAŁA TABELI === */}
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Ładowanie danych...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: row.index * 0.03 }}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "group/row transition-colors duration-200 border-b border-border/15 hover:bg-muted/30",
                      onRowClick ? "cursor-pointer" : ""
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id} 
                        className={cn(
                          "transition-all duration-200",
                          viewMode === "compact" ? "py-2.5" : "py-4"
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </motion.tr>
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
              {/* === KONIEC NOWEJ LOGIKI === */}
            </TableBody>
          </Table>
        </div>
      </div>
      {/* Paginacja jest wyświetlana, jeśli są dane i dane nie są ładowane */}
      {data.length > 0 && !isLoading && (
        <DataTablePagination table={table} />
      )}
    </div>
  );
}
