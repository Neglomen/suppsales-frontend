"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdditionalServiceMapping } from "@/types/additional-service-mapping";

interface AdditionalServiceMappingsTableProps {
  mappings: AdditionalServiceMapping[];
  onEdit: (mapping: AdditionalServiceMapping) => void;
  onDelete: (mapping: AdditionalServiceMapping) => void;
}

export function AdditionalServiceMappingsTable({
  mappings,
  onEdit,
  onDelete,
}: AdditionalServiceMappingsTableProps) {
  const columns: ColumnDef<AdditionalServiceMapping>[] = [
    {
      accessorKey: "marketplace_service_name",
      header: "Nazwa Usługi (Marketplace)",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.marketplace_service_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.source_integration_provider}:
            {row.original.marketplace_service_id}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "courier_service_code",
      header: "Mapowanie Kuriera",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.courier_service_code}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.courier_provider}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Otwórz menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Edit className="mr-2 h-4 w-4" /> Edytuj
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={mappings} />;
}
