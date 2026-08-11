// src/app/(dashboard)/returns/_components/data-table-toolbar.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { DateRange } from "react-day-picker";

interface IntegrationInfo {
  id: number;
  name: string;
}

export interface ReturnFilters {
  search: string;
  integrationId: string;
  dateRange?: DateRange;
  status?: string;
}

interface DataTableToolbarProps {
  filters: ReturnFilters;
  setFilters: React.Dispatch<React.SetStateAction<ReturnFilters>>;
  integrations: IntegrationInfo[];
}

export function DataTableToolbar({
  filters,
  setFilters,
  integrations,
}: DataTableToolbarProps) {
  const isFiltered =
    filters.search !== "" ||
    filters.integrationId !== "all" ||
    (filters.status !== undefined && filters.status !== "all") ||
    !!filters.dateRange;

  const handleResetFilters = () => {
    setFilters({
      search: "",
      integrationId: "all",
      dateRange: undefined,
      status: "all",
    });
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-border/30 p-4 rounded-2xl backdrop-blur-xl shadow-lg w-full">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {/* Wyszukiwarka z ikoną Search */}
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Szukaj po ID, loginie, nr FV, nr listu..."
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
            className="pl-9 h-9 w-full bg-white dark:bg-slate-950/20 border-slate-200 dark:border-border/30 hover:border-slate-300 dark:hover:border-border/60 hover:bg-slate-50 dark:hover:bg-slate-950/40 focus-visible:ring-primary/30 transition-all rounded-xl text-xs font-medium placeholder:text-muted-foreground/50 text-foreground"
          />
        </div>

        {/* Filtr statusu zwrotu */}
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-[170px] bg-white dark:bg-slate-950/20 border-slate-200 dark:border-border/30 hover:border-slate-300 dark:hover:border-border/60 hover:bg-slate-50 dark:hover:bg-slate-950/40 focus:ring-primary/30 rounded-xl transition-all text-xs font-semibold text-foreground/95">
            <SelectValue placeholder="Status zwrotu" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200/50 dark:border-border/35 bg-popover/95 backdrop-blur-lg">
            <SelectItem value="all" className="text-xs">Wszystkie statusy</SelectItem>
            <SelectItem value="SENT" className="text-xs font-medium text-blue-500">Wysłany (SENT)</SelectItem>
            <SelectItem value="DELIVERED" className="text-xs font-medium text-indigo-500">Dostarczony (DELIVERED)</SelectItem>
            <SelectItem value="READY_FOR_PICKUP" className="text-xs font-medium text-yellow-500">Gotowy do odbioru (READY_FOR_PICKUP)</SelectItem>
            <SelectItem value="RECEIVED" className="text-xs font-medium text-emerald-500">Odebrany (RECEIVED)</SelectItem>
            <SelectItem value="CANCELLED" className="text-xs font-medium text-rose-500">Anulowany (CANCELLED)</SelectItem>
            <SelectItem value="REFUNDED" className="text-xs font-medium text-teal-500">Zwrócone środki (REFUNDED)</SelectItem>
            <SelectItem value="UNKNOWN" className="text-xs font-medium text-muted-foreground">Nieznany (UNKNOWN)</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtr integracji (źródła) */}
        <Select
          value={filters.integrationId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, integrationId: value }))
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-[170px] bg-white dark:bg-slate-950/20 border-slate-200 dark:border-border/30 hover:border-slate-300 dark:hover:border-border/60 hover:bg-slate-50 dark:hover:bg-slate-950/40 focus:ring-primary/30 rounded-xl transition-all text-xs font-semibold text-foreground/95">
            <SelectValue placeholder="Wszystkie źródła" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200/50 dark:border-border/35 bg-popover/95 backdrop-blur-lg">
            <SelectItem value="all" className="text-xs">Wszystkie źródła</SelectItem>
            {integrations.map((integration) => (
              <SelectItem key={integration.id} value={String(integration.id)} className="text-xs">
                {integration.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtr dat */}
        <div className="rounded-xl border border-slate-200 dark:border-border/30 bg-white dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-all overflow-hidden h-9 flex items-center">
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
    </div>
  );
}
