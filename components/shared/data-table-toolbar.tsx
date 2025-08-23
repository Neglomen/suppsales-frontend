// src/components/shared/data-table-toolbar.tsx
"use client";

import { Input } from "@/components/ui/input";

interface DataTableToolbarProps {
  // Zamiast całego obiektu `table`, przekazujemy tylko to, co potrzebne
  filterValue: string;
  setFilterValue: (value: string) => void;
}

export function DataTableToolbar({
  filterValue,
  setFilterValue,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filtruj po ID, loginie, nazwisku..."
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
      </div>
    </div>
  );
}
