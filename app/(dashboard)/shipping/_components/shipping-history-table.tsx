"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type PaginationState,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import toast from "react-hot-toast";

import api from "@/lib/api";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Printer, ExternalLink } from "lucide-react";
import { ShipmentStatus } from "@/types/shipment";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";
import { useShippingConfig } from "@/app/(dashboard)/shipping/_hooks/use-shipping-config";

// --- Funkcja Pomocnicza do Budowania Linków Śledzenia ---
function getTrackingUrl(trackingNumber: string, providerType?: string, serviceCode?: string): string | null {
  if (!trackingNumber) return null;
  const cleanNum = trackingNumber.trim();
  const numOnly = cleanNum.replace(/\s+/g, "");
  const providerUp = (providerType || "").toUpperCase().trim();

  if (providerUp === "SUUS" || providerUp === "ROHLIG_SUUS") {
    return `https://portal.suus.com/order-details/${numOnly}`;
  }
  if (providerUp === "RABEN") {
    return `https://mytrack.raben-group.com/tracking?id=${numOnly}`;
  }
  if (providerUp === "GEIS") {
    return `https://www.geis.pl/pl/sledzenie-przesylek?number=${numOnly}`;
  }
  if (providerUp === "GEODIS") {
    return `https://tracking.geodis.pl/?reference=${numOnly}`;
  }
  if (providerUp === "INPOST" || providerUp === "INPOST_BUY" || providerUp === "INPOST_KURIER") {
    return `https://inpost.pl/sledzenie-przesylek?number=${numOnly}`;
  }
  if (providerUp === "DHL") {
    return `https://sprawdz.dhl.com.pl/szukaj.aspx?m=0&num=${numOnly}`;
  }
  if (providerUp === "DPD" || providerUp === "DPD_PL") {
    return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${numOnly}`;
  }
  if (providerUp === "GLS") {
    return `https://gls-group.eu/PL/pl/sledzenie-paczki?match=${numOnly}`;
  }
  if (providerUp === "UPS") {
    return `https://www.ups.com/track?tracknum=${numOnly}`;
  }
  if (providerUp === "FEDEX") {
    return `https://www.fedex.com/fedextrack/?trknbr=${numOnly}`;
  }
  if (providerUp === "POCZTA_POLSKA" || providerUp === "POCZTEX") {
    return `https://emonitoring.poczta-polska.pl/?numer=${numOnly}`;
  }
  if (providerUp === "ALLEGRO" || providerUp === "ALLEGRO_ONE" || providerUp === "ALLEGRO_ONE_PICKUP" || providerUp === "ALLEGRO_ONE_MOBILE" || providerUp === "ALLEGRO_DELIVERY") {
    return `https://allegro.pl/allegrodelivery/sledzenie-paczki?numer=${numOnly}`;
  }

  const codeLower = (serviceCode || "").toLowerCase();
  if (codeLower.includes("inpost") || codeLower.includes("paczkomat")) {
    return `https://inpost.pl/sledzenie-przesylek?number=${numOnly}`;
  }
  if (codeLower.includes("dpd")) {
    return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${numOnly}`;
  }
  if (codeLower.includes("dhl")) {
    return `https://sprawdz.dhl.com.pl/szukaj.aspx?m=0&num=${numOnly}`;
  }
  if (codeLower.includes("gls")) {
    return `https://gls-group.eu/PL/pl/sledzenie-paczki?match=${numOnly}`;
  }
  if (codeLower.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${numOnly}`;
  }
  if (codeLower.includes("raben")) {
    return `https://mytrack.raben-group.com/tracking?id=${numOnly}`;
  }
  if (codeLower.includes("geis")) {
    return `https://www.geis.pl/pl/sledzenie-przesylek?number=${numOnly}`;
  }

  // Allegro Delivery (zaczynające się na A, np. A000..., AD..., ALE..., AL...)
  if (/^A[A-Z0-9]+$/i.test(numOnly)) {
    return `https://allegro.pl/allegrodelivery/sledzenie-paczki?numer=${numOnly}`;
  }
  if (/^1Z[A-Z0-9]{16}$/i.test(numOnly)) {
    return `https://www.ups.com/track?tracknum=${numOnly}`;
  }
  if (/^\d{24}$/.test(numOnly)) {
    return `https://inpost.pl/sledzenie-przesylek?number=${numOnly}`;
  }
  if (/^\d{13,14}[A-Za-z]?$/.test(numOnly)) {
    return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${numOnly}`;
  }
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(numOnly) || /^\d{20}$/.test(numOnly)) {
    return `https://emonitoring.poczta-polska.pl/?numer=${numOnly}`;
  }
  if (/^\d{12}$/.test(numOnly)) {
    return `https://gls-group.eu/PL/pl/sledzenie-paczki?match=${numOnly}`;
  }
  if (/^\d{10,11}$/.test(numOnly)) {
    return `https://sprawdz.dhl.com.pl/szukaj.aspx?m=0&num=${numOnly}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent("śledzenie przesyłki")}+${numOnly}`;
}

interface OrderBriefForShipment {
  id: string;
  external_order_id: string;
  buyer_login: string | null;
  buyer_email: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  source: string | null;
}

interface ShipmentWithOrderRead {
  id: string;
  order_id: string;
  courier_integration_id: number;
  created_at: string;
  updated_at: string;
  courier_service_code: string;
  package_details: any;
  status: ShipmentStatus;
  tracking_number: string | null;
  label_format: string | null;
  order: OrderBriefForShipment | null;
}

interface PaginatedShipmentsResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: ShipmentWithOrderRead[];
}

export function ShippingHistoryTable() {
  const { isEnabled: printHubEnabled, status: printHubStatus, defaultLabelPrinter } = usePrintHub();
  const { data: shippingConfig } = useShippingConfig();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, isError } = useQuery<PaginatedShipmentsResponse>({
    queryKey: ["shipmentHistory", pagination],
    queryFn: async () => {
      const response = await api.get<PaginatedShipmentsResponse>("/shipping/shipments", {
        params: {
          page: pagination.pageIndex + 1,
          size: pagination.pageSize,
        },
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const handleDownloadLabel = async (shipmentId: string) => {
    try {
      const response = await api.get(`/shipping/shipments/${shipmentId}/label`);
      const { label_data, label_format } = response.data;
      
      const formatToMimeType = (format: string) => {
          switch(format) {
              case 'PDF': return 'application/pdf';
              case 'ZPL': return 'text/plain';
              case 'EPL': return 'text/plain';
              default: return 'application/pdf';
          }
      }

      const byteCharacters = atob(label_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: formatToMimeType(label_format) });

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `etykieta_${shipmentId}.${label_format.toLowerCase()}`;
      link.click();
    } catch (error) {
      console.error("Błąd podczas pobierania etykiety:", error);
      toast.error("Błąd podczas pobierania etykiety.");
    }
  };

  const handlePrintLabel = async (shipmentId: string) => {
    try {
      const toastId = toast.loading("Przygotowywanie wydruku...");
      const response = await api.get(`/shipping/shipments/${shipmentId}/label`);
      const {
        label_data,
        label_format,
        print_erp_symbols,
        print_full_name,
        label_items_per_page,
        erp_items,
      } = response.data;
      
      // Jeżeli Print Hub jest połączony, używamy go to druku
      if (printHubEnabled && printHubStatus === "connected") {
        if (label_format === 'ZPL' || label_format === 'EPL') {
           printHubService.printRaw(label_data, `Etykieta_${shipmentId}`, { printerName: defaultLabelPrinter || undefined });
           toast.success("Wysłano etykietę (ZPL/EPL) do Print Hub", { id: toastId });
           return;
        } else {
           printHubService.printPdf(label_data, `Etykieta_${shipmentId}`, {
             printerName: defaultLabelPrinter || undefined,
             printErpSymbols: print_erp_symbols,
             printFullName: print_full_name,
             labelItemsPerPage: label_items_per_page,
             erpItems: erp_items || [],
           });
           toast.success("Wysłano etykietę (PDF) do Print Hub", { id: toastId });
           return;
        }
      }

      toast.dismiss(toastId);
      
      const formatToMimeType = (format: string) => {
          switch(format) {
              case 'PDF': return 'application/pdf';
              case 'ZPL': return 'text/plain';
              case 'EPL': return 'text/plain';
              default: return 'application/pdf';
          }
      }

      if (label_format === 'ZPL' || label_format === 'EPL') {
          // Dla ZPL/EPL musimy obsłużyć inaczej, np wysłać do PrintNode
          console.warn("Drukowanie bezpośrednie z przeglądarki ZPL/EPL nie jest wspierane. Należy zapisać.");
          return handleDownloadLabel(shipmentId);
      }

      const byteCharacters = atob(label_data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: formatToMimeType(label_format) });

      const url = window.URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
          iframe.contentWindow?.print();
      };
    } catch (error) {
      console.error("Błąd podczas drukowania etykiety:", error);
      toast.error("Błąd podczas drukowania etykiety.");
    }
  };

  const columns = useMemo<ColumnDef<ShipmentWithOrderRead>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Data Utworzenia",
        cell: ({ row }) => {
          const date = new Date(row.original.created_at);
          return (
            <div className="text-sm font-medium">
              {format(date, "d MMM yyyy, HH:mm", { locale: pl })}
            </div>
          );
        },
      },
      {
        accessorKey: "order",
        header: "Kupujący / Zamówienie",
        cell: ({ row }) => {
          const order = row.original.order;
          if (!order) return <span className="text-muted-foreground italic">Brak danych</span>;
          
          const buyerName = `${order.buyer_first_name || ""} ${order.buyer_last_name || ""}`.trim();
          
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{buyerName || order.buyer_login || "Klient"}</span>
              <span className="text-xs text-muted-foreground font-mono">{order.external_order_id}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "courier_service_code",
        header: "Usługa / Kurier",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal text-xs bg-secondary/40 text-secondary-foreground whitespace-nowrap">
            {row.original.courier_service_code || "Nieznana metoda"}
          </Badge>
        ),
      },
      {
        accessorKey: "tracking_number",
        header: "Status / Tracking",
        cell: ({ row }) => {
          const shipment = row.original;
          const statusColors: Record<string, string> = {
            PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            CREATED: "bg-green-500/10 text-green-500 border-green-500/20",
            FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
            CANCELED: "bg-muted text-muted-foreground border-border",
          };

          const statusColor = statusColors[shipment.status] || statusColors.PENDING;

          return (
            <div className="flex flex-col gap-1 items-start">
              <Badge variant="outline" className={`font-semibold ${statusColor}`}>
                {shipment.status}
              </Badge>
              {shipment.tracking_number && (() => {
                const courierInteg = shippingConfig?.couriers.find((c) => c.id === shipment.courier_integration_id);
                const trackingUrl = getTrackingUrl(shipment.tracking_number, courierInteg?.provider_type, shipment.courier_service_code);
                return (
                  <span className="text-xs font-mono mt-1">
                    {trackingUrl ? (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
                      >
                        {shipment.tracking_number} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{shipment.tracking_number}</span>
                    )}
                  </span>
                );
              })()}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Etykieta</div>,
        cell: ({ row }) => {
          const shipment = row.original;
          
          if (!shipment.label_format) {
            return null;
          }

          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 group hover:border-primary/50 hover:bg-primary/5 transition-all w-24"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintLabel(shipment.id);
                }}
              >
                <Printer className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                Drukuj
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 group hover:border-primary/50 hover:bg-primary/5 transition-all w-24"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadLabel(shipment.id);
                }}
              >
                <Download className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                Zapisz
              </Button>
            </div>
          );
        },
      },
    ],
    [shippingConfig]
  );



  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-500/5 rounded-xl border border-red-500/20">
        Wystąpił błąd podczas ładowania historii wysyłek.
      </div>
    );
  }

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        pageCount={data?.pages ?? -1}
        pagination={pagination}
        setPagination={setPagination}
        isLoading={isLoading}
      />
    </div>
  );
}
