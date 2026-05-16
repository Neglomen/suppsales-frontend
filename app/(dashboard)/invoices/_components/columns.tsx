"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format, isValid, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  MoreHorizontal,
  Printer,
  Download,
  Link as LinkIcon,
  Link2Off,
  Eye,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  SearchX,
  AlertTriangle,
  Building2,
  FileText,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ErpSyncStatus, SupplierInvoice } from "@/types/invoice";

const formatSafeDate = (
  dateValue: any,
  formatStr: string = "dd.MM.yyyy"
): string => {
  if (!dateValue) return "-";
  try {
    const date =
      typeof dateValue === "string" ? parseISO(dateValue) : new Date(dateValue);
    if (!isValid(date)) return "-";
    return format(date, formatStr, { locale: pl });
  } catch (error) {
    console.error("Error formatting date:", error, dateValue);
    return "-";
  }
};

const formatCurrency = (amount: number | null, currency: string = "PLN"): string => {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

const invoiceTypeBadge = (type: string | null) => {
  if (!type) return null;
  const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    Vat: { label: "VAT", variant: "default" },
    Kor: { label: "Korekta", variant: "destructive" },
    Zal: { label: "Zaliczka", variant: "secondary" },
    Uproszczona: { label: "Uproszcz.", variant: "outline" },
  };
  const config = typeMap[type] || { label: type, variant: "outline" as const };
  return <Badge variant={config.variant} className="text-xs font-medium">{config.label}</Badge>;
};

export const getColumns = (
  handlePreview: (invoice: SupplierInvoice) => void,
  handlePrint: (invoice: SupplierInvoice) => void,
  handleDownload: (invoice: SupplierInvoice) => void,
  printHubEnabled?: boolean
): ColumnDef<SupplierInvoice>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Zaznacz wszystko"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Zaznacz wiersz"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "invoiceInfo",
    header: "Faktura",
    cell: ({ row }) => {
      const { original_invoice_number, invoice_number, invoice_type } = row.original;
      const displayNumber = original_invoice_number || invoice_number;
      return (
        <div className="flex flex-col gap-1 min-w-[160px]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate" title={displayNumber}>
              {displayNumber}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pl-6">
            {invoiceTypeBadge(invoice_type)}
            {original_invoice_number && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground truncate cursor-help" title={invoice_number}>
                      KSeF: {invoice_number.slice(-12)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Pełny numer KSeF: {invoice_number}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "issue_date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-2"
      >
        Data <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">{formatSafeDate(row.original.issue_date)}</span>
    ),
  },
  {
    id: "seller",
    header: "Sprzedawca",
    cell: ({ row }) => {
      const { seller_name, seller_nip } = row.original;

      if (!seller_name) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help min-w-[120px] max-w-[200px]">
                <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm truncate">{seller_name}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">{seller_name}</p>
                {seller_nip && <p className="text-muted-foreground">NIP: {seller_nip}</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "amounts",
    header: "Kwota",
    cell: ({ row }) => {
      const { total_gross_amount, total_net_amount, total_vat_amount, currency } = row.original;
      return (
        <div className="flex flex-col gap-0.5 text-right min-w-[100px]">
          <span className="font-semibold text-sm">
            {formatCurrency(total_gross_amount, currency)}
          </span>
          {total_net_amount !== null && (
            <span className="text-xs text-muted-foreground">
              netto: {formatCurrency(total_net_amount, currency)}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "purchase_orders",
    header: "Zamówienie",
    cell: ({ row }) => {
      const { purchase_orders } = row.original;

      if (!purchase_orders || purchase_orders.length === 0) {
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Link2Off className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs">Brak</span>
          </div>
        );
      }

      const firstPo = purchase_orders[0];
      const buyerLogin =
        firstPo.marketplace_order?.buyer_login || "Brak loginu";

      if (purchase_orders.length === 1) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-green-600">
                  <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{buyerLogin}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  ID zamówienia:{" "}
                  {firstPo.marketplace_order?.external_order_id || "-"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-amber-600">
                <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs font-medium">
                  {purchase_orders.length} powiązań
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <ul>
                {purchase_orders.map((po) => (
                  <li key={po.id}>
                    {po.marketplace_order?.buyer_login || "Brak loginu"}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },

  {
    accessorKey: "erp_sync_status",
    header: "Subiekt",
    cell: ({ row }) => {
      const {
        erp_sync_status: status,
        erp_synced_at: syncedAt,
        erp_sync_notes: notes,
      } = row.original;

      const statusMap: Record<
        ErpSyncStatus,
        { icon: React.ElementType; label: string; color: string }
      > = {
        PENDING: { icon: Clock, label: "Oczekuje", color: "text-gray-400" },
        SYNCED: {
          icon: CheckCircle2,
          label: "OK",
          color: "text-green-500",
        },
        NOT_FOUND: {
          icon: SearchX,
          label: "Brak",
          color: "text-amber-500",
        },
        ERROR: { icon: AlertTriangle, label: "Błąd", color: "text-red-500" },
      };

      const currentStatus = statusMap[status] || statusMap.PENDING;
      const Icon = currentStatus.icon;

      let tooltipContent = "Oczekuje na sprawdzenie";
      if (syncedAt) {
        tooltipContent = `Sprawdzono: ${formatSafeDate(
          syncedAt,
          "dd.MM.yy HH:mm"
        )}`;
      }
      if (status === "ERROR" && notes) {
        tooltipContent = `Błąd: ${notes}`;
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <Icon className={`h-3.5 w-3.5 ${currentStatus.color}`} />
                <span className="text-xs">{currentStatus.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Otwórz menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Akcje</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handlePreview(invoice)}>
              <Eye className="mr-2 h-4 w-4" /> Podgląd
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {printHubEnabled && (
              <DropdownMenuItem onClick={() => handlePrint(invoice)}>
                <Printer className="mr-2 h-4 w-4" /> Drukuj (Print Hub)
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDownload(invoice)}>
              <Download className="mr-2 h-4 w-4" /> Pobierz PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
