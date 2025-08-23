// src/app/(dashboard)/orders/_components/data-table-toolbar.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";
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
  integrationId: string; // Używamy stringa, bo komponent Select tak działa
  dateRange?: DateRange;
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
    !!filters.dateRange;

  const handleResetFilters = () => {
    setFilters({
      search: "",
      integrationId: "all",
      dateRange: undefined,
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* Wyszukiwarka */}
        <Input
          placeholder="Filtruj po ID, loginie, nazwisku..."
          value={filters.search}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, search: event.target.value }))
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {/* Filtr integracji */}
        <Select
          value={filters.integrationId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, integrationId: value }))
          }
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="Wszystkie źródła" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie źródła</SelectItem>
            {integrations.map((integration) => (
              <SelectItem key={integration.id} value={String(integration.id)}>
                {integration.name}
              </SelectItem>
            ))}
            <SelectItem value="manual">Zamówienia ręczne</SelectItem>
          </SelectContent>
        </Select>
        {/* Filtr dat */}
        <DateRangePicker
          date={filters.dateRange}
          onDateChange={(range) =>
            setFilters((prev) => ({ ...prev, dateRange: range }))
          }
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <Button onClick={onManualOrderClick}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Dodaj ręcznie
      </Button>
    </div>
  );
}
