// src/app/(dashboard)/orders/_components/data-table-toolbar.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, X, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { DateRange } from "react-day-picker";

// Typ dla integracji, potrzebny do zapełnienia selecta
interface IntegrationInfo {
  id: number;
  name: string;
}

// Typ dla wszystkich filtrów
export interface OrderFilters {
  search: string;
  integrationId: string;
  dateRange?: DateRange;
  status?: string;
}

interface DataTableToolbarProps {
  filters: OrderFilters;
  setFilters: React.Dispatch<React.SetStateAction<OrderFilters>>;
  integrations: IntegrationInfo[];
  onManualOrderClick: () => void;
}

export function DataTableToolbar({
  filters,
  setFilters,
  integrations,
  onManualOrderClick,
}: DataTableToolbarProps) {
  const isFiltered =
    filters.search !== "" ||
    filters.integrationId !== "all" ||
    (filters.status !== undefined && filters.status !== "to-realize") ||
    !!filters.dateRange;

  const handleResetFilters = () => {
    setFilters({
      search: "",
      integrationId: "all",
      dateRange: undefined,
      status: "to-realize",
    });
  };

  return (
    <div className="sticky top-4 lg:top-8 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-border/30 p-4 rounded-2xl backdrop-blur-xl shadow-xl">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Wyszukiwarka z ikoną Search */}
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Szukaj po ID, loginie, nr listu..."
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
            className="pl-9 h-9 w-full bg-slate-950/20 border-border/30 hover:border-border/60 hover:bg-slate-950/40 focus-visible:ring-primary/30 transition-all rounded-xl text-xs font-medium placeholder:text-muted-foreground/50 text-foreground"
          />
        </div>

        {/* Filtr statusu zamówienia */}
        <Select
          value={filters.status || "to-realize"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-[170px] bg-slate-950/20 border-border/30 hover:border-border/60 hover:bg-slate-950/40 focus:ring-primary/30 rounded-xl transition-all text-xs font-semibold text-foreground/95">
            <SelectValue placeholder="Status zamówienia" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/35 bg-popover/95 backdrop-blur-lg">
            <SelectItem value="to-realize" className="text-xs font-semibold text-indigo-500">Do realizacji</SelectItem>
            <SelectItem value="all" className="text-xs">Wszystkie statusy</SelectItem>
            <SelectItem value="NEW" className="text-xs font-medium text-amber-500">Nowe</SelectItem>
            <SelectItem value="READY_FOR_PROCESSING" className="text-xs font-medium text-blue-500">Do przetwarzania</SelectItem>
            <SelectItem value="PROCESSING" className="text-xs font-medium text-cyan-500">W toku</SelectItem>
            <SelectItem value="READY_FOR_SHIPMENT" className="text-xs font-medium text-indigo-500">Gotowe do wysyłki</SelectItem>
            <SelectItem value="SENT" className="text-xs font-medium text-emerald-500">Wysłane</SelectItem>
            <SelectItem value="CANCELLED" className="text-xs font-medium text-rose-500">Anulowane</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtr integracji */}
        <Select
          value={filters.integrationId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, integrationId: value }))
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-[170px] bg-slate-950/20 border-border/30 hover:border-border/60 hover:bg-slate-950/40 focus:ring-primary/30 rounded-xl transition-all text-xs font-semibold text-foreground/95">
            <SelectValue placeholder="Wszystkie źródła" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/35 bg-popover/95 backdrop-blur-lg">
            <SelectItem value="all" className="text-xs">Wszystkie źródła</SelectItem>
            {integrations.map((integration) => (
              <SelectItem key={integration.id} value={String(integration.id)} className="text-xs">
                {integration.name}
              </SelectItem>
            ))}
            <SelectItem value="manual" className="text-xs">Zamówienia ręczne</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtr dat */}
        <div className="rounded-xl border border-border/30 bg-slate-950/20 hover:bg-slate-950/40 transition-all overflow-hidden h-9 flex items-center">
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={(range) =>
              setFilters((prev) => ({ ...prev, dateRange: range }))
            }
          />
        </div>

        {/* Przycisk Reset */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl transition-all hover:bg-accent/10 gap-1.5"
          >
            Reset
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Button
        onClick={onManualOrderClick}
        className="h-9 w-full md:w-auto rounded-xl px-4 bg-gradient-to-r from-primary via-indigo-500 to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white text-xs font-bold shadow-md shadow-primary/10 hover:shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] border-none transition-all duration-300"
      >
        <PlusCircle className="mr-1.5 h-4 w-4" />
        Dodaj ręcznie
      </Button>
    </div>
  );
}
