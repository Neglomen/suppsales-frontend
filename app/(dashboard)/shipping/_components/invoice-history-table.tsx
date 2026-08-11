"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";

import api from "@/lib/api";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Printer, ExternalLink, FileText, FileCheck2, Loader2 } from "lucide-react";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { SalesCorrectionModal } from "./sales-correction-modal";

interface PaginatedOrdersResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: MarketplaceOrder[];
}

const cleanPolishChars = (str: string): string => {
  const map: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
};

const generateInvoicePDF = (order: MarketplaceOrder) => {
  const doc = new jsPDF();
  
  // Palette (harmonized with suppsales premium theme)
  const primaryColor = [15, 23, 42]; // Slate 900
  const textColor = [51, 65, 85]; // Slate 700
  const lightBg = [248, 250, 252]; // Slate 50
  
  // Header background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FAKTURA VAT", 20, 25);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Numer: ${cleanPolishChars(order.erp_sales_document_number || "FV/Brak")}`, 20, 32);
  
  // Date & Place
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  const dateStr = order.erp_sales_document_synced_at 
    ? format(new Date(order.erp_sales_document_synced_at), "dd.MM.yyyy")
    : format(new Date(), "dd.MM.yyyy");
  doc.text(`Data wystawienia: ${dateStr}`, 140, 20);
  doc.text(`Data sprzedazy: ${dateStr}`, 140, 26);
  doc.text("Miejsce wystawienia: Sosnowiec", 140, 32);
  
  // Seller & Buyer headers
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Sprzedawca:", 20, 55);
  doc.text("Nabywca:", 110, 55);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  // Seller Details
  doc.text("LIDER AGD/RTV", 20, 62);
  doc.text("ul. Mikolajczyka 31A", 20, 68);
  doc.text("41-200 Sosnowiec", 20, 74);
  doc.text("NIP: 519010846", 20, 80);
  
  // Buyer Details
  const payload = order.details_payload || {};
  
  // Safe normalization of buyer info
  const inv = order.invoice_address;
  const del = order.delivery_address;
  const buyerName = inv?.company_name || `${inv?.first_name || del?.first_name || ""} ${inv?.last_name || del?.last_name || ""}`.trim() || order.buyer_login || "Klient";
  const buyerStreet = inv?.street || del?.street || "Brak adresu dostawy";
  const buyerZip = inv?.zip_code || del?.zip_code || "";
  const buyerCity = inv?.city || del?.city || "";
  const buyerZipCity = `${buyerZip} ${buyerCity}`.trim();
  const buyerNip = inv?.tax_id ? `NIP: ${inv.tax_id}` : "";
  
  doc.text(cleanPolishChars(buyerName), 110, 62);
  doc.text(cleanPolishChars(buyerStreet), 110, 68);
  doc.text(cleanPolishChars(buyerZipCity), 110, 74);
  if (buyerNip) {
    doc.text(cleanPolishChars(buyerNip), 110, 80);
  }
  
  // Table Header
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(20, 95, 170, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Lp.", 22, 100);
  doc.text("Nazwa produktu / uslugi", 32, 100);
  doc.text("Ilosc", 115, 100);
  doc.text("Cena netto", 130, 100);
  doc.text("VAT", 155, 100);
  doc.text("Wartosc brutto", 170, 100);
  
  // Line items listing
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  let y = 108;
  
  const providerType = order.service_integration?.provider_type;
  let lineItems = [];
  if (providerType === "EMPIK") {
    const currency = payload.currency_iso_code || "PLN";
    lineItems = (payload.order_lines || []).map((line: any) => ({
      name: line.product_title,
      quantity: line.quantity,
      price: { amount: line.price_unit || line.price || "0.00", currency }
    }));
  } else {
    lineItems = order.line_items || payload.lineItems || payload.products || [];
  }

  lineItems.forEach((item: any, idx: number) => {
    const name = item.offer?.name || item.name || "Produkt";
    const qty = item.quantity || 1;
    const grossAmount = parseFloat(item.price?.amount || item.price || "0");
    const netVal = grossAmount / 1.23;
    const vatRate = "23%";
    
    doc.text(`${idx + 1}`, 22, y);
    
    // Wrap text elegantly
    const splitName = doc.splitTextToSize(cleanPolishChars(name), 75);
    doc.text(splitName, 32, y);
    
    doc.text(`${qty}`, 115, y);
    doc.text(`${netVal.toFixed(2)} PLN`, 130, y);
    doc.text(vatRate, 155, y);
    doc.text(`${(grossAmount * qty).toFixed(2)} PLN`, 170, y);
    
    y += (splitName.length * 5) + 3;
  });
  
  // Summary calculations
  const totalGross = order.total_to_pay ?? 0;
  const totalNet = totalGross / 1.23;
  const totalVat = totalGross - totalNet;
  
  y = Math.max(y, 160);
  doc.line(20, y, 190, y);
  y += 8;
  
  doc.setFont("helvetica", "bold");
  doc.text("Suma:", 120, y);
  doc.text(`${totalNet.toFixed(2)} PLN`, 130, y);
  doc.text(`${totalVat.toFixed(2)} PLN`, 155, y);
  doc.text(`${totalGross.toFixed(2)} PLN`, 170, y);
  
  y += 12;
  doc.setFontSize(11);
  doc.text(`RAZEM DO ZAPLATY: ${totalGross.toFixed(2)} PLN`, 110, y);
  
  // Footer notice
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Wygenerowano automatycznie w systemie SuppSales na podstawie danych z Subiekt GT.", 20, 285);
  
  return doc;
};

export function InvoiceHistoryTable() {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const { data, isLoading, isError } = useQuery<PaginatedOrdersResponse>({
    queryKey: ["invoiceHistory", pagination],
    queryFn: async () => {
      const response = await api.get<PaginatedOrdersResponse>("/orders", {
        params: {
          page: pagination.pageIndex + 1,
          size: pagination.pageSize,
          hasErpInvoice: true,
          sortBy: "erp_sales_document_synced_at",
          sortOrder: "desc",
        },
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const handleDownloadInvoice = (order: MarketplaceOrder) => {
    try {
      const doc = generateInvoicePDF(order);
      const filename = `Faktura_${(order.erp_sales_document_number || "dok").replace(/\//g, "-")}.pdf`;
      doc.save(filename);
      toast.success("Pobrano fakturę PDF!");
    } catch (error) {
      console.error("Błąd zapisu PDF:", error);
      toast.error("Wystąpił błąd podczas pobierania faktury.");
    }
  };

  const handlePrintInvoice = (order: MarketplaceOrder) => {
    try {
      const doc = generateInvoicePDF(order);
      const stringPdf = doc.output("bloburl");
      
      const printWindow = window.open(stringPdf, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
        toast.success("Otwarto okno drukowania!");
      } else {
        toast.error("Zablokowano wyskakujące okno. Zezwól przeglądarce na otwieranie okien.");
      }
    } catch (error) {
      console.error("Błąd drukowania:", error);
      toast.error("Wystąpił błąd podczas drukowania.");
    }
  };

  const [correctionOrder, setCorrectionOrder] = useState<MarketplaceOrder | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);

  const handleOpenCorrection = (order: MarketplaceOrder) => {
    setCorrectionOrder(order);
    setIsCorrectionModalOpen(true);
  };

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleDownloadSubiektPdf = async (order: MarketplaceOrder, docNumber?: string) => {
    const targetDoc = docNumber || order.erp_sales_document_number;
    if (!targetDoc) return;
    const tid = toast.loading(`Pobieranie dokumentu ${targetDoc}...`);
    setDownloadingDocId(targetDoc);
    try {
      const params = docNumber ? { doc_number: docNumber } : {};
      const response = await api.get(`/orders/${order.id}/sales-invoice/pdf`, {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      const filename = `${targetDoc.replace(/\//g, "-")}.pdf`;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Pobrano ${targetDoc}!`, { id: tid });
    } catch (err) {
      handleDownloadInvoice(order);
      toast.dismiss(tid);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const columns = useMemo<ColumnDef<MarketplaceOrder>[]>(
    () => [
      {
        accessorKey: "erp_sales_document_synced_at",
        header: "Data Wystawienia",
        cell: ({ row }) => {
          const dateStr = row.original.erp_sales_document_synced_at || row.original.purchased_at;
          if (!dateStr) return <span className="text-muted-foreground">—</span>;
          const date = new Date(dateStr);
          return (
            <div className="text-sm font-medium">
              {format(date, "d MMM yyyy, HH:mm", { locale: pl })}
            </div>
          );
        },
      },
      {
        accessorKey: "external_order_id",
        header: "Kupujący / Zamówienie",
        cell: ({ row }) => {
          const order = row.original;
          const payload = order.details_payload || {};
          const inv = order.invoice_address;
          const del = order.delivery_address;
          const buyerName = inv?.company_name || `${inv?.first_name || del?.first_name || ""} ${inv?.last_name || del?.last_name || ""}`.trim() || order.buyer_login || "Klient";
          
          return (
            <div className="flex flex-col gap-0.5 items-start">
              <span className="font-medium text-foreground">{buyerName}</span>
              <Button
                variant="link"
                className="h-auto p-0 font-mono text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                onClick={() => router.push(`/orders/${order.id}`)}
                title="Przejdź do szczegółów zamówienia"
              >
                {order.external_order_id}
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          );
        },
      },
      {
        accessorKey: "erp_sales_document_number",
        header: "Dokumenty ERP",
        cell: ({ row }) => {
          const order = row.original;
          const flags = Array.isArray(order.flags) ? order.flags : [];
          const hasKfsFlag = flags.includes("KFS_ISSUED");

          let kfsDocNumber = "";
          const events = (order as any)?.events;
          if (Array.isArray(events)) {
            for (const ev of events) {
              if (ev.summary?.includes("KFS") || ev.summary?.includes("Korekty Faktury") || ev.summary?.includes("Korekta Faktury")) {
                if (ev.details?.subiekt_document_number) {
                  kfsDocNumber = ev.details.subiekt_document_number;
                  break;
                }
                const match = ev.summary?.match(/(KFS\s*[A-Za-z0-9\/\-_]+)/i);
                if (match) {
                  kfsDocNumber = match[1];
                  break;
                }
              }
            }
          }

          const hasKfs = hasKfsFlag || !!kfsDocNumber;
          const kfsNum = kfsDocNumber || (order.erp_sales_document_number ? order.erp_sales_document_number.replace(/^FS/i, "KFS") : "KFS");

          return (
            <div className="flex flex-col gap-1 items-start">
              <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-0.5 px-2">
                <FileText className="w-3 h-3 mr-1 shrink-0" />
                {order.erp_sales_document_number || "Brak numeru"}
              </Badge>
              {hasKfs && (
                <Badge variant="outline" className="font-mono text-[11px] bg-amber-500/10 text-amber-400 border-amber-500/30 py-0.5 px-2">
                  <FileCheck2 className="w-3 h-3 mr-1 shrink-0" />
                  {kfsNum}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "total_to_pay",
        header: "Kwota brutto",
        cell: ({ row }) => {
          const amount = row.original.total_to_pay ?? 0;
          return (
            <span className="font-bold text-sm tabular-nums">
              {amount.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Akcje</div>,
        cell: ({ row }) => {
          const order = row.original;
          const flags = Array.isArray(order.flags) ? order.flags : [];
          const hasKfsFlag = flags.includes("KFS_ISSUED");

          let kfsDocNumber = "";
          const events = (order as any)?.events;
          if (Array.isArray(events)) {
            for (const ev of events) {
              if (ev.summary?.includes("KFS") || ev.summary?.includes("Korekty Faktury") || ev.summary?.includes("Korekta Faktury")) {
                if (ev.details?.subiekt_document_number) {
                  kfsDocNumber = ev.details.subiekt_document_number;
                  break;
                }
                const match = ev.summary?.match(/(KFS\s*[A-Za-z0-9\/\-_]+)/i);
                if (match) {
                  kfsDocNumber = match[1];
                  break;
                }
              }
            }
          }

          const hasKfs = hasKfsFlag || !!kfsDocNumber;
          const kfsNum = kfsDocNumber || (order.erp_sales_document_number ? order.erp_sales_document_number.replace(/^FS/i, "KFS") : "KFS");
          
          return (
            <div className="flex justify-end gap-1.5 flex-wrap">
              {hasKfs && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all gap-1 text-xs font-semibold"
                  disabled={downloadingDocId === kfsNum}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSubiektPdf(order, kfsNum);
                  }}
                  title="Pobierz plik PDF Korekty (KFS)"
                >
                  {downloadingDocId === kfsNum ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Pobierz KFS
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all gap-1 text-xs"
                disabled={downloadingDocId === order.erp_sales_document_number}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadSubiektPdf(order);
                }}
                title="Pobierz plik PDF Faktury (FS)"
              >
                {downloadingDocId === order.erp_sales_document_number ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Pobierz FS
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 border-amber-500/20 bg-muted/30 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-300 transition-all text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenCorrection(order);
                }}
              >
                <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                Koryguj
              </Button>
            </div>
          );
        },
      },
    ],
    [router, downloadingDocId]
  );

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-500/5 rounded-xl border border-red-500/20">
        Wystąpił błąd podczas ładowania historii faktur.
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
      <SalesCorrectionModal
        order={correctionOrder}
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
      />
    </div>
  );
}
