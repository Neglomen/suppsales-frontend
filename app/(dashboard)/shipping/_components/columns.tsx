"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AllegroIcon, BaseLinkerIcon, EmpikIcon } from "@/components/shared/icons"; // Importuj ikony

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
    accessorKey: "external_order_id",
    header: "Zamówienie",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.service_integration?.provider_type === "ALLEGRO" && (
          <AllegroIcon className="h-[18px] w-auto shrink-0" />
        )}
        {row.original.service_integration?.provider_type === "BASELINKER" && (
          <BaseLinkerIcon className="h-[18px] w-auto shrink-0" />
        )}
        {row.original.service_integration?.provider_type === "EMPIK" && (
          <EmpikIcon className="h-[18px] w-auto rounded-sm shrink-0" />
        )}
        <span className="font-mono text-xs">
          {row.original.external_order_id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "buyer_login",
    header: "Kupujący",
    cell: ({ row }) => row.original.buyer_login || "Brak",
  },
  {
    header: "Odbiorca",
    cell: ({ row }) => {
      const payload = row.original.details_payload;
      if (!payload) return "Brak danych";

      // === BEZPIECZNY DOSTĘP DO DANYCH ===
      const allegroAddress = payload.delivery?.address;
      const baselinkerFullName = payload.delivery_fullname;
      const empikAddress = row.original.delivery_address;

      if (allegroAddress) {
        return `${allegroAddress.firstName || ""} ${
          allegroAddress.lastName || ""
        }, ${allegroAddress.city || ""}`.trim();
      }
      if (baselinkerFullName) {
        return `${baselinkerFullName}, ${payload.delivery_city || ""}`.trim();
      }
      if (empikAddress) {
        return `${empikAddress.first_name || ""} ${
          empikAddress.last_name || ""
        }, ${empikAddress.city || ""}`.trim();
      }
      const empikCustomer = payload.customer;
      if (empikCustomer) {
        return `${empikCustomer.firstname || ""} ${
          empikCustomer.lastname || ""
        }`.trim();
      }
      return "Sprawdź szczegóły";
      // === KONIEC POPRAWKI ===
    },
  },
  {
    header: "Dostawa",
    cell: ({ row }) => {
      const payload = row.original.details_payload;
      if (!payload) return "Brak danych";

      // === BEZPIECZNY DOSTĘP DO DANYCH ===
      return (
        payload.delivery?.method?.name ||
        payload.delivery_method ||
        payload.shipping_type_label ||
        payload.shipping_type_code ||
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
