"use client";

import { Table } from "@tanstack/react-table";
import { DateRange } from "react-day-picker";
import {
  Download,
  Printer,
  ChevronDown,
  Search,
  X,
  FilePlus2,
  SearchX,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Input } from "@/components/ui/input";
import { SupplierInvoice } from "@/types/invoice";

export interface InvoiceFilters {
  dateRange?: DateRange;
  search?: string;
  source?: string;
}

interface DataTableToolbarProps {
  table: Table<SupplierInvoice>;
  filters: InvoiceFilters;
  setFilters: (filters: InvoiceFilters) => void;
  onMassiveDownloadClick: () => void;
  onMassivePrintClick: () => void;
  onCheckSubiektClick: () => void;
  onCreateInSubiektClick: () => void;
  onKsefSyncClick: () => void;
  isKsefSyncing?: boolean;
}

export function DataTableToolbar({
  table,
  filters,
  setFilters,
  onMassiveDownloadClick,
  onMassivePrintClick,
  onCheckSubiektClick,
  onCreateInSubiektClick,
  onKsefSyncClick,
  isKsefSyncing,
}: DataTableToolbarProps) {
  const selectedRowCount = Object.keys(table.getState().rowSelection).length;
  const isActionDisabled = selectedRowCount === 0;

  const isFiltered =
    filters.search || filters.dateRange?.from || filters.dateRange?.to || filters.source;

  const handleResetFilters = () => {
    setFilters({ search: "", dateRange: undefined, source: undefined });
    table.resetColumnFilters();
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj po numerze faktury..."
            value={filters.search ?? ""}
            onChange={(event) =>
              setFilters({ ...filters, search: event.target.value })
            }
            className="pl-9 h-10"
          />
        </div>
        <DateRangePicker
          date={filters.dateRange}
          onDateChange={(date) => setFilters({ ...filters, dateRange: date })}
          className="w-full sm:w-auto"
        />
        <Select
          value={filters.source ?? "all"}
          onValueChange={(value) =>
            setFilters({ ...filters, source: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[150px]">
             <SelectValue placeholder="Źródło" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="KSEF">KSeF</SelectItem>
            <SelectItem value="AB">AB / Hurtownie</SelectItem>
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="h-10 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="w-full sm:w-auto flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Akcje dla zaznaczonych ({selectedRowCount})
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onCheckSubiektClick}
              disabled={isActionDisabled}
            >
              <SearchX className="mr-2 h-4 w-4" />
              Sprawdź w Subiekcie
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCreateInSubiektClick}
              disabled={isActionDisabled}
            >
              <FilePlus2 className="mr-2 h-4 w-4 text-blue-500" />
              Utwórz FZ w Subiekcie
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onMassiveDownloadClick}
              disabled={isActionDisabled}
            >
              <Download className="mr-2 h-4 w-4" />
              Pobierz jako ZIP
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onMassivePrintClick}
              disabled={isActionDisabled}
            >
              <Printer className="mr-2 h-4 w-4" />
              Drukuj wszystkie
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="secondary"
          className="ml-2"
          onClick={onKsefSyncClick}
          disabled={isKsefSyncing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isKsefSyncing ? "animate-spin" : ""}`}
          />
          Pobierz z KSeF
        </Button>
      </div>
    </div>
  );
}
