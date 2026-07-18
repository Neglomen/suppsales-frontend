"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Building2, User, FileText, Calendar, DollarSign, Hash } from "lucide-react";
import { downloadSingleInvoice } from "@/lib/api-client";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/api";
import { SupplierInvoice } from "@/types/invoice";
import { format, isValid, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { KsefVisualizer } from "./ksef-visualizer";

interface InvoicePreviewDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  invoice: SupplierInvoice | null;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return "-";
    return format(date, "dd.MM.yyyy", { locale: pl });
  } catch {
    return "-";
  }
};

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return "-";
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return "-";
    return format(date, "dd.MM.yyyy HH:mm", { locale: pl });
  } catch {
    return "-";
  }
};

const formatCurrency = (amount: number | null, currency: string = "PLN"): string => {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
};

export function InvoicePreviewDialog({
  isOpen,
  setIsOpen,
  invoice,
}: InvoicePreviewDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanupPreview = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setXmlContent(null);
  };

  useEffect(() => {
    let isMounted = true;

    const loadPreview = async () => {
      if (!invoice) return;
      setIsLoading(true);
      cleanupPreview();

      try {
        // Sprawdzamy typ dostawcy
        const providerType = invoice.supplier_integration?.provider_type;

        if (providerType === "KSEF") {
           // Dla KSeF pobieramy XML
           const { getInvoiceKsefXml } = await import("@/lib/api-client");
           const xml = await getInvoiceKsefXml(invoice.id);
           if (isMounted) setXmlContent(xml);
        } else {
           // Dla innych (AB, etc.) próbujemy pobrać PDF
           const blob = await downloadSingleInvoice(invoice.id);
           if (isMounted) {
             const url = URL.createObjectURL(blob);
             setPdfUrl(url);
           }
        }
      } catch (error) {
        console.log("Preview not available:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (isOpen && invoice) {
      loadPreview();
    } else {
      cleanupPreview();
    }

    return () => {
      isMounted = false;
      cleanupPreview();
    };
  }, [isOpen, invoice]);

  if (!invoice) return null;

  const typeBadgeVariant = (type: string | null) => {
    switch (type) {
      case "Vat": return "default";
      case "Kor": return "destructive";
      case "Zal": return "secondary";
      default: return "outline";
    }
  };

  const typeLabel = (type: string | null) => {
    switch (type) {
      case "Vat": return "Faktura VAT";
      case "Kor": return "Faktura Korygująca";
      case "Zal": return "Faktura Zaliczkowa";
      default: return type || "Nieznany";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {invoice.original_invoice_number || invoice.invoice_number}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {invoice.original_invoice_number && (
                    <>KSeF: {invoice.invoice_number} • </>
                  )}
                  Wystawiona: {formatDate(invoice.issue_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {invoice.supplier_integration?.provider_type === "KSEF" && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">KSeF</Badge>
              )}
              {invoice.invoice_type && (
                <Badge variant={typeBadgeVariant(invoice.invoice_type) as any}>
                  {typeLabel(invoice.invoice_type)}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content - split view: info panel + PDF/XML preview */}
        <div className="flex-1 flex min-h-0">
          {/* Left panel - invoice data */}
          <div className="w-[380px] border-r overflow-y-auto p-5 space-y-5 bg-background">
            {/* Kwoty */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" /> Kwoty
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Brutto</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(invoice.total_gross_amount, invoice.currency)}
                  </span>
                </div>
                {invoice.total_net_amount !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Netto</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(invoice.total_net_amount, invoice.currency)}
                    </span>
                  </div>
                )}
                {invoice.total_vat_amount !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">VAT</span>
                    <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      {formatCurrency(invoice.total_vat_amount, invoice.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Sprzedawca */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Sprzedawca
              </h3>
              <div className="rounded-lg border p-3 space-y-1.5 bg-muted/20">
                <p className="text-sm font-medium">{invoice.seller_name || "-"}</p>
                {invoice.seller_nip && (
                  <p className="text-xs text-muted-foreground">NIP: {invoice.seller_nip}</p>
                )}
              </div>
            </div>

            {/* Nabywca */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Nabywca
              </h3>
              <div className="rounded-lg border p-3 space-y-1.5 bg-muted/20">
                <p className="text-sm font-medium">{invoice.buyer_name || "-"}</p>
                {invoice.buyer_nip && (
                  <p className="text-xs text-muted-foreground">NIP: {invoice.buyer_nip}</p>
                )}
              </div>
            </div>

            {/* Odbiorca */}
            {invoice.recipient_name && (
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Odbiorca
                </h3>
                <div className="rounded-lg border p-3 space-y-1.5 bg-muted/20">
                  <p className="text-sm font-medium">{invoice.recipient_name}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Szczegóły */}
            <div>
              <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" /> Szczegóły
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Data wystawienia</span>
                  <span className="text-xs font-medium">{formatDate(invoice.issue_date)}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Termin płatności</span>
                    <span className="text-xs font-medium">{formatDate(invoice.due_date)}</span>
                  </div>
                )}
                {invoice.ksef_acquisition_date && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Przyjęto do KSeF</span>
                    <span className="text-xs font-medium">{formatDateTime(invoice.ksef_acquisition_date)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Waluta</span>
                  <span className="text-xs font-medium">{invoice.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Status ERP</span>
                  <Badge variant={invoice.erp_sync_status === "SYNCED" ? "default" : "outline"} className="text-xs">
                    {invoice.erp_sync_status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel - PDF/XML preview */}
          <div className="flex-1 bg-muted/10">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Ładowanie podglądu...</span>
              </div>
            ) : xmlContent ? (
               <div className="w-full h-full bg-white dark:bg-black overflow-hidden relative">
                   <KsefVisualizer xml={xmlContent} />
               </div>
            ) : pdfUrl ? (
              <embed
                src={pdfUrl}
                type="application/pdf"
                width="100%"
                height="100%"
                className="w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <FileText className="h-12 w-12 opacity-30" />
                <p className="text-sm">Podgląd niedostępny</p>
                <p className="text-xs max-w-xs text-center">
                  Plik podglądu nie jest dostępny dla tej faktury. Dane faktury widoczne w panelu po lewej stronie.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
