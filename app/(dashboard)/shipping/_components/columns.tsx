"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons"; // Importuj ikony

interface GetShippingTableColumnsProps {
  onPrepareShipment: (orderId: string) => void;
}

export const getShippingTableColumns = ({
  onPrepareShipment,
}: GetShippingTableColumnsProps): ColumnDef<MarketplaceOrder>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "externalOrderId",
    header: "Zamówienie",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.serviceIntegration?.provider_type === "ALLEGRO" && (
          <AllegroIcon className="h-4 w-4" />
        )}
        {row.original.serviceIntegration?.provider_type === "BASELINKER" && (
          <BaseLinkerIcon className="h-4 w-4 rounded-sm" />
        )}
        <span className="font-mono text-xs">
          {row.original.externalOrderId}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "buyerLogin",
    header: "Kupujący",
    cell: ({ row }) => row.original.buyerLogin || "Brak",
  },
  {
    header: "Odbiorca",
    cell: ({ row }) => {
      const payload = row.original.detailsPayload;
      if (!payload) return "Brak danych";

      // === BEZPIECZNY DOSTĘP DO DANYCH ===
      const allegroAddress = payload.delivery?.address;
      const baselinkerFullName = payload.delivery_fullname;

      if (allegroAddress) {
        return `${allegroAddress.firstName || ""} ${
          allegroAddress.lastName || ""
        }, ${allegroAddress.city || ""}`.trim();
      }
      if (baselinkerFullName) {
        return `${baselinkerFullName}, ${payload.delivery_city || ""}`.trim();
      }
      return "Sprawdź szczegóły";
      // === KONIEC POPRAWKI ===
    },
  },
  {
    header: "Dostawa",
    cell: ({ row }) => {
      const payload = row.original.detailsPayload;
      if (!payload) return "Brak danych";

      // === BEZPIECZNY DOSTĘP DO DANYCH ===
      return (
        payload.delivery?.method?.name ||
        payload.delivery_method ||
        "Nie określono"
      );
      // === KONIEC POPRAWKI ===
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPrepareShipment(row.original.id)}
      >
        Przygotuj przesyłkę
      </Button>
    ),
  },
];
