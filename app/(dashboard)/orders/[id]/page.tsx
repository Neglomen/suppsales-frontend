// src/app/(dashboard)/orders/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  Package,
  User,
  Clock,
  Home,
  Banknote,
  FileText,
  Info,
  Mail,
  MessageSquare,
  History,
  ScrollText,
  ShieldCheck,
  Pencil,
  Hash,
  ExternalLink,
  Tag,
  MapPin,
  CreditCard,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  Download,
  FileDown,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ChatPanel } from "./_components/chat-panel";
import { AllegroIcon, BaseLinkerIcon, EmpikIcon } from "@/components/shared/icons";
import { SendEmailDialog } from "../../../../components/shared/send-email-dialog";
import { OrderDetailsApiResponse, MappedOrderDetails } from "@/types/order";
import { ServiceIntegration } from "@/types/service-integration";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationHistoryTimeline } from "./_components/communication-history-timeline";
import { EditAddressDialog } from "@/app/(dashboard)/shipping/_components/EditAddressDialog";
import { EditInvoiceDialog } from "@/app/(dashboard)/shipping/_components/EditInvoiceDialog";
import { ProductMappingDialog } from "@/app/(dashboard)/shipping/_components/product-mapping-dialog";

// --- Definicje Typów ---
interface Address {
  firstName?: string;
  lastName?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  companyName?: string;
  phoneNumber?: string;
  taxId?: string;
}

// --- Mapper Danych ---
const mapOrderPayloadToDetails = (
  order: OrderDetailsApiResponse
): MappedOrderDetails => {
  const payload = order.details_payload;

  if (order.integration?.provider_type === "EMPIK") {
    const currency = payload?.currency_iso_code || "PLN";
    const billing = payload?.customer?.billing_address;
    const shipping = payload?.customer?.shipping_address;

    return {
      delivery: {
        methodName: payload?.shipping_type_label || "Brak informacji",
        isPickupPoint: !!payload?.shipping_pudo_id,
        pickupPointName: payload?.shipping_pudo_id || undefined,
        address: shipping ? {
          firstName: shipping.firstname || payload.customer?.firstname || undefined,
          lastName: shipping.lastname || payload.customer?.lastname || undefined,
          street: ((shipping.street_1 || "") + (shipping.street_2 ? " " + shipping.street_2 : "")).trim() || undefined,
          zipCode: shipping.zip_code || undefined,
          city: shipping.city || undefined,
          countryCode: shipping.country_iso_code || undefined,
          phoneNumber: shipping.phone || payload.customer?.phone || undefined,
        } : (order.delivery_address ? {
          firstName: order.delivery_address.first_name || undefined,
          lastName: order.delivery_address.last_name || undefined,
          street: order.delivery_address.street || undefined,
          zipCode: order.delivery_address.zip_code || undefined,
          city: order.delivery_address.city || undefined,
          countryCode: order.delivery_address.country_code || undefined,
          phoneNumber: order.delivery_address.phone_number || undefined,
        } : undefined),
      },
      payment: {
        type: payload?.payment_type?.toLowerCase().includes("pobran") ? "CASH_ON_DELIVERY" : "ONLINE",
        provider: payload?.payment_type || "Brak informacji",
        status: order.payment_status || (payload?.order_state === "WAITING_DEBIT_PAYMENT" ? "PENDING" : "COMPLETED"),
        total: `${payload?.total_price || payload?.price || "0.00"} ${currency}`,
      },
      invoice: {
        required: !!billing || !!order.invoice_address,
        address: billing ? {
          firstName: billing.firstname || undefined,
          lastName: billing.lastname || undefined,
          street: ((billing.street_1 || "") + (billing.street_2 ? " " + billing.street_2 : "")).trim() || undefined,
          zipCode: billing.zip_code || undefined,
          city: billing.city || undefined,
          countryCode: billing.country_iso_code || undefined,
          companyName: billing.company || undefined,
          taxId: billing.tax_number || billing.company_vat || undefined,
        } : (order.invoice_address ? {
          firstName: order.invoice_address.first_name || undefined,
          lastName: order.invoice_address.last_name || undefined,
          street: order.invoice_address.street || undefined,
          zipCode: order.invoice_address.zip_code || undefined,
          city: order.invoice_address.city || undefined,
          countryCode: order.invoice_address.country_code || undefined,
          companyName: order.invoice_address.company_name || undefined,
          taxId: order.invoice_address.tax_id || undefined,
        } : undefined),
      },
      line_items: (payload?.order_lines || []).map((line: any) => {
        const mediumMedia = line.product_medias?.find((m: any) => m.type === "MEDIUM") || line.product_medias?.[0];
        let imageUrl = mediumMedia?.media_url || null;
        if (imageUrl && imageUrl.startsWith("/")) {
          imageUrl = "https://marketplace.empik.com/mmp" + imageUrl;
        }
        return {
          id: line.order_line_id,
          name: line.product_title,
          quantity: line.quantity,
          price: `${line.price_unit || line.price || "0.00"} ${currency}`,
          sku: line.offer_sku || line.product_sku || line.offer_id?.toString(),
          imageUrl: imageUrl,
          offerId: line.offer_id?.toString() || line.offer_sku,
        };
      }),
      buyerComments: payload?.delivery_comments || payload?.customer_message || undefined,
    };
  }

  if (order.integration?.provider_type === "BASELINKER") {
    const deliveryFullName = payload.delivery_fullname || "";
    const deliveryParts = deliveryFullName.split(" ");
    const invoiceFullName = payload.invoice_fullname || "";
    const invoiceParts = invoiceFullName.split(" ");

    return {
      delivery: {
        methodName: payload.delivery_method || "Brak informacji",
        isPickupPoint: !!payload.delivery_point_id,
        pickupPointName: payload.delivery_point_name,
        address: {
          firstName: deliveryParts[0] || "",
          lastName: deliveryParts.slice(1).join(" ") || "",
          companyName: payload.delivery_company,
          street: payload.delivery_address,
          zipCode: payload.delivery_postcode,
          city: payload.delivery_city,
          countryCode: payload.delivery_country_code,
          phoneNumber: payload.phone,
        },
      },
      payment: {
        type: payload.payment_method_cod === "1" ? "CASH_ON_DELIVERY" : "ONLINE",
        provider: payload.payment_method,
        status: payload.confirmed ? "COMPLETED" : "PENDING",
        total: `${payload.payment_done || "0.00"} ${payload.currency || "PLN"}`,
      },
      invoice: {
        required: payload.want_invoice === "1",
        address: {
          firstName: invoiceParts[0] || "",
          lastName: invoiceParts.slice(1).join(" ") || "",
          companyName: payload.invoice_company,
          taxId: payload.invoice_nip,
          street: payload.invoice_address,
          zipCode: payload.invoice_postcode,
          city: payload.invoice_city,
          countryCode: payload.invoice_country_code,
        },
      },
      line_items: (payload.products || []).map((product: any) => ({
        id: product.order_product_id,
        name: product.name,
        quantity: product.quantity,
        price: `${product.price_brutto} ${payload.currency}`,
        sku: product.sku || product.product_id,
        ean: product.ean,
      })),
      buyerComments: payload.user_comments || undefined,
    };
  }

  // Allegro / manual
  return {
    delivery: {
      methodName: payload.delivery?.method?.name || "Brak informacji",
      isPickupPoint: !!payload.delivery?.pickupPoint,
      pickupPointName: payload.delivery?.pickupPoint?.name,
      address: payload.delivery?.address,
    },
    payment: {
      type: payload.payment?.type,
      provider: payload.payment?.provider,
      status: payload.payment?.status || "COMPLETED",
      total: `${payload.summary?.totalToPay?.amount || "0.00"} ${
        payload.summary?.totalToPay?.currency || "PLN"
      }`,
    },
    invoice: {
      required: !!payload.invoice?.required,
      address: payload.invoice?.address,
    },
    line_items: (payload.lineItems || []).map((item: any) => ({
      id: item.id,
      name: item.offer.name,
      quantity: item.quantity,
      price: `${item.price.amount} ${item.price.currency}`,
      imageUrl: item.imageUrl,
      sku: item.offer?.external?.id || item.offer?.id,
    })),
    buyerComments: payload.messageToSeller || undefined,
  };
};

// --- Helpers ---
const formatName = (first?: string | null, last?: string | null, company?: string | null) => {
  if (company?.trim()) return company.trim();
  const full = `${first || ""} ${last || ""}`.trim();
  return full || null;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: { label: "Zrealizowane", color: "text-emerald-400", icon: <CheckCircle2 className="h-4 w-4" /> },
  PAID: { label: "Opłacone", color: "text-emerald-400", icon: <CheckCircle2 className="h-4 w-4" /> },
  PENDING: { label: "Oczekuje", color: "text-amber-400", icon: <AlertCircle className="h-4 w-4" /> },
  CANCELED: { label: "Anulowane", color: "text-red-400", icon: <XCircle className="h-4 w-4" /> },
  PROCESSING: { label: "W toku", color: "text-blue-400", icon: <Loader2 className="h-4 w-4" /> },
};

// --- Sub-components ---

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
      <span className="text-white/50">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// --- ERP Symbol Inline Edit ---
function ErpSymbolEdit({ orderId, initial, onSaved }: { orderId: string; initial?: string | null; onSaved: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/orders/${orderId}/erp-symbol`, { erp_sales_document_number: value });
      onSaved(value);
      setEditing(false);
      toast.success("Symbol ERP zaktualizowany.");
    } catch {
      toast.error("Nie udało się zapisać symbolu ERP.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 text-xs font-mono w-40"
          placeholder="np. FS/1234/2025"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="font-mono text-sm text-amber-400">{initial || <span className="text-muted-foreground italic text-xs">Brak</span>}</span>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setEditing(true)}>
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

// --- Delivery Card ---
function DeliverySection({ order, mapped, onEdit }: {
  order: OrderDetailsApiResponse;
  mapped: MappedOrderDetails["delivery"];
  onEdit: () => void;
}) {
  // Prefer DB-normalized address
  const da = (order as any).delivery_address;
  const name = da
    ? formatName(da.first_name, da.last_name, da.company_name)
    : formatName(mapped.address?.firstName, mapped.address?.lastName, mapped.address?.companyName);
  const street = da?.street || mapped.address?.street;
  const zip = da?.zip_code || mapped.address?.zipCode;
  const city = da?.city || mapped.address?.city;
  const phone = da?.phone_number || mapped.address?.phoneNumber;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Adres dostawy</SectionLabel>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-2 text-muted-foreground hover:text-primary" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      {mapped.isPickupPoint ? (
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-primary flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{mapped.pickupPointName}</p>
          <p className="text-muted-foreground">{street}</p>
          <p className="text-muted-foreground">{zip} {city}</p>
        </div>
      ) : (
        <div className="space-y-0.5 text-sm">
          {name && <p className="font-semibold">{name}</p>}
          <p className="text-muted-foreground">{street}</p>
          <p className="text-muted-foreground">{zip} {city}</p>
          {phone && <p className="text-muted-foreground">{phone}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
        Metoda: <span className="font-medium text-foreground">{mapped.methodName}</span>
      </p>
    </div>
  );
}

// --- Invoice Section ---
function InvoiceSection({ order, mapped, onEdit }: {
  order: OrderDetailsApiResponse;
  mapped: MappedOrderDetails["invoice"];
  onEdit: () => void;
}) {
  // Prefer DB invoice_address
  const inv = order.invoice_address;

  const name = inv
    ? formatName(inv.first_name, inv.last_name, inv.company_name)
    : formatName(mapped.address?.firstName, mapped.address?.lastName, mapped.address?.companyName);
  const taxId = inv?.tax_id || mapped.address?.taxId;
  const street = inv?.street || mapped.address?.street;
  const zip = inv?.zip_code || mapped.address?.zipCode;
  const city = inv?.city || mapped.address?.city;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Dane do faktury</SectionLabel>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mt-2 text-muted-foreground hover:text-primary" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      {!mapped.required && !inv ? (
        <p className="text-xs text-muted-foreground italic">Klient nie poprosił o fakturę.</p>
      ) : (
        <div className="space-y-0.5 text-sm">
          {name && <p className="font-semibold">{name}</p>}
          {taxId && <p className="text-xs text-muted-foreground font-mono">NIP: {taxId}</p>}
          <p className="text-muted-foreground">{street}</p>
          <p className="text-muted-foreground">{zip} {city}</p>
        </div>
      )}
    </div>
  );
}

// --- Log entry ---
function LogEntry({ log }: { log: OrderDetailsApiResponse["event_logs"][0] }) {
  const iconMap: Record<string, React.ReactNode> = {
    ADDRESS_CHANGE: <MapPin className="h-4 w-4 text-blue-400" />,
    INVOICE_CHANGE: <Receipt className="h-4 w-4 text-amber-400" />,
    STATUS_CHANGE: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    SYSTEM: <ShieldCheck className="h-4 w-4 text-purple-400" />,
    EMAIL: <Mail className="h-4 w-4 text-sky-400" />,
  };
  const icon = iconMap[log.type] || <ScrollText className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="flex gap-3 items-start py-3 border-b border-border/40 last:border-0">
      <div className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{log.summary}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{log.source}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.type}</Badge>
          <span className="text-[11px] text-muted-foreground ml-auto">
            {new Date(log.occurred_at).toLocaleString("pl-PL")}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- ERP Sales Invoice Section ---
function ErpSalesInvoiceSection({
  order,
  onSaved,
}: {
  order: OrderDetailsApiResponse;
  onSaved: (v: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!order.erp_sales_document_number) return;
    setDownloading(true);
    try {
      // Pobieramy token z instancji axios (interceptory ustawiają Authorization header)
      const response = await api.get(`/orders/${order.id}/sales-invoice/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = (order.erp_sales_document_number || "faktura")
        .replace(/\//g, "-")
        .replace(/\s+/g, "_");
      link.href = url;
      link.download = `FS_${safeName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const detail =
        err.response?.data instanceof Blob
          ? await err.response.data.text().then((t: string) => {
              try { return JSON.parse(t).detail; } catch { return t; }
            })
          : err.response?.data?.detail || err.message;
      toast.error(`Nie udało się pobrać PDF faktury: ${detail}`);
    } finally {
      setDownloading(false);
    }
  };

  const syncStatus = (order as any).erp_sales_document_sync_status as string | undefined;
  const syncedAt = (order as any).erp_sales_document_synced_at as string | undefined;

  const statusBadge = () => {
    if (!order.erp_sales_document_number) return null;
    if (syncStatus === "SYNCED" || !syncStatus) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
          <CheckCircle2 className="h-2.5 w-2.5" /> Zsynchronizowana
        </span>
      );
    }
    if (syncStatus === "ERROR") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 rounded-full px-2 py-0.5">
          <XCircle className="h-2.5 w-2.5" /> Błąd synchronizacji
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
        <AlertCircle className="h-2.5 w-2.5" /> {syncStatus}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <SectionLabel>Faktura sprzedaży (ERP)</SectionLabel>
        {statusBadge()}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">Numer dokumentu FS</p>
          <ErpSymbolEdit
            orderId={order.id}
            initial={order.erp_sales_document_number}
            onSaved={onSaved}
          />
        </div>

        {order.erp_sales_document_number && (
          <Button
            id="download-sales-invoice-pdf"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 text-xs h-8"
            onClick={handleDownloadPdf}
            disabled={downloading}
            title={`Pobierz PDF: ${order.erp_sales_document_number}`}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloading ? "Pobieranie..." : "Pobierz PDF"}
          </Button>
        )}
      </div>

      {syncedAt && (
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Zsynchronizowano: {new Date(syncedAt).toLocaleString("pl-PL")}
        </p>
      )}
    </div>
  );
}

// ============================
// MAIN COMPONENT
// ============================

function OrderDetailsContent() {
  const { id } = useParams();
  const orderId = Array.isArray(id) ? id[0] : id;
  const [order, setOrder] = useState<OrderDetailsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendTemplateOpen, setSendTemplateOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadInvoicePdf = async (orderId: string, docNumber: string) => {
    setIsDownloadingPdf(true);
    try {
      const response = await api.get(`/orders/${orderId}/sales-invoice/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = docNumber.replace(/\//g, "-").replace(/\s+/g, "_");
      link.href = url;
      link.download = `FS_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Pobrano fakturę: ${docNumber}`);
    } catch (err: any) {
      const detail =
        err.response?.data instanceof Blob
          ? await err.response.data.text().then((t: string) => {
              try { return JSON.parse(t).detail; } catch { return t; }
            })
          : err.response?.data?.detail || err.message;
      toast.error(`Nie udało się pobrać PDF: ${detail}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const { data: integrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations"],
    queryFn: async () => (await api.get("/service-integrations")).data,
  });
  const erpIntegration = integrations?.find(i => i.provider_type === "SUBIEKT_GT");

  const offerIds = useMemo(() => {
    if (!order) return [];
    if (order.integration?.provider_type === "EMPIK") {
      const items = order.details_payload?.order_lines || [];
      return items.map((item: any) => item.offer_id?.toString() || item.offer_sku).filter(Boolean);
    }
    const items = order.line_items || order.details_payload?.lineItems || order.details_payload?.products || [];
    return items.map((item: any) => item.offer?.id || item.product_id).filter(Boolean);
  }, [order]);

  const { data: productMappings, refetch: refetchMappings } = useQuery<Record<string, any>>({
    queryKey: ["productMappings", order?.service_integration?.id, erpIntegration?.id, offerIds],
    queryFn: async () => {
      if (!order?.service_integration?.id || !erpIntegration?.id || offerIds.length === 0) return {};
      const params = new URLSearchParams();
      params.append("source_integration_id", order.service_integration.id.toString());
      params.append("erp_integration_id", erpIntegration.id.toString());
      offerIds.forEach((id: string) => params.append("offer_ids", id));
      const response = await api.get("/product-erp-mappings/by-offers-and-integrations", { params });
      return response.data;
    },
    enabled: !!order?.service_integration?.id && !!erpIntegration?.id && offerIds.length > 0
  });

  const fetchOrderDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<OrderDetailsApiResponse>(`/orders/${orderId}`);
      const data = response.data;
      if (!data.integration && data.service_integration) {
        data.integration = data.service_integration;
      }
      setOrder(data);
    } catch {
      toast.error("Nie udało się pobrać szczegółów zamówienia.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) fetchOrderDetails();
  }, [orderId, fetchOrderDetails]);

  const mappedDetails = useMemo(() => {
    if (!order) return null;
    return mapOrderPayloadToDetails(order);
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!order || !mappedDetails) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nie znaleziono zamówienia.
      </div>
    );
  }

  const providerType = order.integration?.provider_type;
  const payStatus = mappedDetails.payment.status?.toUpperCase();
  const payInfo = statusConfig[payStatus] || { label: payStatus, color: "text-muted-foreground", icon: null };

  return (
    <div className="space-y-6 pb-10">

      {/* ── HERO HEADER ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800/90 to-slate-900 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Icon + integration */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
                {!providerType && <Package className="h-7 w-7 text-white/70" />}
                {providerType === "ALLEGRO" && <AllegroIcon className="h-9 w-9" />}
                {providerType === "BASELINKER" && <BaseLinkerIcon className="h-9 w-9 rounded" />}
                {providerType === "EMPIK" && <EmpikIcon className="h-9 w-9 rounded" />}
              </div>
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-widest">
                  {order.integration?.name || "Zamówienie ręczne"}
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white leading-tight">
                    #{order.external_order_id}
                  </h1>
                  {order.flags?.includes("BRAK_STANU") && (
                    <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 uppercase text-[10px] tracking-wider px-2 h-5">Brak Towaru</Badge>
                  )}
                </div>
                <p className="text-[11px] text-white/30 font-mono mt-0.5">{order.id}</p>
              </div>
            </div>

            {/* Stats pills */}
            <div className="flex flex-wrap gap-2 md:ml-auto">
              <StatPill
                icon={<User className="h-3.5 w-3.5" />}
                label="Kupujący"
                value={order.buyer_login || `${order.buyer_first_name || ""} ${order.buyer_last_name || ""}`.trim() || "—"}
              />
              <StatPill
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Data zakupu"
                value={new Date(order.purchased_at).toLocaleDateString("pl-PL")}
              />
              <StatPill
                icon={<CreditCard className="h-3.5 w-3.5" />}
                label="Kwota"
                value={mappedDetails.payment.total}
              />
              <div className={`flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10 ${payInfo.color}`}>
                {payInfo.icon}
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Status</p>
                  <p className="text-xs font-semibold">{payInfo.label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ERP document number */}
          <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-white/30" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Dokument ERP:</span>
            </div>
            <ErpSymbolEdit
              orderId={order.id}
              initial={order.erp_sales_document_number}
              onSaved={(v) => setOrder((o) => o ? { ...o, erp_sales_document_number: v } : o)}
            />
            <div className="ml-auto flex gap-2 flex-wrap">
              {order.erp_sales_document_number && (
                <Button
                  id="header-download-invoice-pdf"
                  variant="outline"
                  size="sm"
                  className="border-emerald-500/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 bg-transparent gap-1.5"
                  onClick={() => handleDownloadInvoicePdf(order.id, order.erp_sales_document_number!)}
                  disabled={isDownloadingPdf}
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {isDownloadingPdf ? "Pobieranie..." : `Faktura ${order.erp_sales_document_number}`}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white/80 hover:text-white hover:bg-white/10 bg-transparent"
                onClick={() => setSendTemplateOpen(true)}
              >
                <Mail className="mr-2 h-3.5 w-3.5" />
                Wyślij e-mail
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT: Tabs ── */}
      <Tabs defaultValue="details">
        <TabsList className="border border-border bg-muted/30 p-1 rounded-xl">
          <TabsTrigger value="details" className="rounded-lg gap-1.5">
            <Home className="h-3.5 w-3.5" /> Szczegóły
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-lg gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Wiadomości
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg gap-1.5">
            <History className="h-3.5 w-3.5" /> Historia
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Logi
            {order.event_logs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">{order.event_logs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Details ── */}
        <TabsContent value="details" className="mt-4 space-y-4">
          {/* Customer Comments */}
          {mappedDetails.buyerComments && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
              <MessageSquare className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-500 mb-1">Uwagi od kupującego</h3>
                <p className="text-sm text-yellow-500/90 whitespace-pre-wrap">
                  {mappedDetails.buyerComments}
                </p>
              </div>
            </div>
          )}

          {/* ── Products — full width, at the top ── */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Produkty
                <Badge variant="secondary" className="ml-auto">{mappedDetails.line_items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {mappedDetails.line_items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8 px-5">Brak produktów.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left px-5 py-2 font-medium">Produkt</th>
                      <th className="text-left px-3 py-2 font-medium hidden md:table-cell">SKU / EAN</th>
                      <th className="text-left px-3 py-2 font-medium">Symbol ERP</th>
                      <th className="text-center px-3 py-2 font-medium">Ilość</th>
                      <th className="text-right px-5 py-2 font-medium">Cena</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {mappedDetails.line_items.map((item) => {
                      const offerId = (item as any).offerId || item.sku; // in mapped items sku usually holds the offer id, or we need to pass item.id if different
                      // But let's actually use the offer payload ID if available. For now item.sku is offerId in mappedDetails mapping
                      const mapping = productMappings?.[offerId] || productMappings?.[item.id];
                      return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {(item as any).imageUrl ? (
                              <img src={(item as any).imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-contain bg-white p-0.5 border border-border/60 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-md border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <p className="font-medium leading-snug line-clamp-2">{item.name}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {item.sku && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Tag className="h-3 w-3 shrink-0" />
                                <span className="font-mono">{item.sku}</span>
                              </span>
                            )}
                            {item.ean && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Hash className="h-3 w-3 shrink-0" />
                                <span className="font-mono">{item.ean}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1 items-start">
                             {mapping ? (
                               <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                 ERP: {mapping.erp_product_symbol}
                               </Badge>
                             ) : (
                               <Badge variant="outline" className="text-[10px] h-5 bg-destructive/10 text-destructive border-destructive/20">
                                 Brak mapowania
                               </Badge>
                             )}
                             <ProductMappingDialog 
                               offerId={offerId || item.id} 
                               offerName={item.name}
                               currentMapping={mapping}
                               sourceIntegrationId={order.service_integration?.id}
                               erpIntegrationId={erpIntegration?.id}
                               onMappingUpdated={refetchMappings}
                             />
                           </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant="outline" className="font-mono">{item.quantity}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <p className="font-bold">{item.price}</p>
                          <p className="text-xs text-muted-foreground">/ szt.</p>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* ── Grid: addresses + sidebar ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Delivery + Invoice side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-border/60">
                  <CardContent className="pt-5 pb-4 px-5">
                    <DeliverySection
                      order={order}
                      mapped={mappedDetails.delivery}
                      onEdit={() => setIsEditAddressOpen(true)}
                    />
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="pt-5 pb-4 px-5">
                    <InvoiceSection
                      order={order}
                      mapped={mappedDetails.invoice}
                      onEdit={() => setIsEditInvoiceOpen(true)}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Buyer info */}
              <Card className="border-border/60">
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionLabel>Kupujący</SectionLabel>
                  <div className="space-y-0">
                    <InfoRow label="Login" value={order.buyer_login} />
                    <InfoRow label="Imię i nazwisko" value={formatName(order.buyer_first_name, order.buyer_last_name, null)} />
                    <InfoRow label="E-mail" value={order.buyer_email} />
                    <InfoRow label="Telefon" value={(order as any).buyer_phone_number} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Payment */}
              <Card className="border-border/60">
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionLabel>Płatność</SectionLabel>
                  <InfoRow label="Status" value={payInfo.label} />
                  <InfoRow label="Typ" value={mappedDetails.payment.type === "CASH_ON_DELIVERY" ? "Za pobraniem" : "Online"} />
                  <InfoRow label="Operator" value={mappedDetails.payment.provider} />
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">Suma</span>
                    <span className="text-lg font-bold">{mappedDetails.payment.total}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Order info */}
              <Card className="border-border/60">
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionLabel>Zamówienie</SectionLabel>
                  <InfoRow label="Status" value={order.status} />
                  <InfoRow label="Status zewnętrzny" value={order.external_status} />
                  <InfoRow label="Fulfillment" value={order.fulfillment_status || undefined} />
                  <InfoRow label="Data zakupu" value={new Date(order.purchased_at).toLocaleString("pl-PL")} />
                  {order.tracking_numbers && order.tracking_numbers.length > 0 && (
                    <div className="py-2 border-b border-border/40">
                      <p className="text-xs text-muted-foreground mb-1">Nr śledzenia</p>
                      {order.tracking_numbers.map((t) => (
                        <p key={t} className="font-mono text-xs font-semibold">{t}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


        {/* ── TAB: Products ── */}
        <TabsContent value="products" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Produkty w zamówieniu
                <Badge variant="secondary" className="ml-auto">{mappedDetails.line_items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="divide-y divide-border/40">
                {mappedDetails.line_items.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8 px-5">Brak produktów.</p>
                )}
                {mappedDetails.line_items.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                    {/* Image */}
                    {(item as any).imageUrl ? (
                      <img
                        src={(item as any).imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-contain bg-white p-0.5 border border-border/60 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{item.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        {(item as any).sku && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="h-3 w-3" />
                            <span className="font-mono">{(item as any).sku}</span>
                          </span>
                        )}
                        {(item as any).ean && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span className="font-mono">{(item as any).ean}</span>
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Ilość: <span className="font-semibold text-foreground">{item.quantity}</span>
                        </span>
                      </div>
                    </div>
                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="font-bold">{item.price}</p>
                      <p className="text-xs text-muted-foreground">szt.</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ERP sales invoice section on products tab */}
          <Card className="border-border/60 mt-4">
            <CardContent className="pt-5 pb-4 px-5">
              <ErpSalesInvoiceSection
                order={order}
                onSaved={(v) => setOrder((o) => o ? { ...o, erp_sales_document_number: v } : o)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Messages ── */}
        <TabsContent value="messages" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              {order.buyer_login && order.integration ? (
                <ChatPanel
                  buyerLogin={order.buyer_login}
                  integrationId={order.integration.id}
                  currentOrderId={order.id}
                  myLogin={order.integration.external_user_id}
                />
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Wiadomości dostępne tylko dla zamówień z integracji.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Communication History ── */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <CommunicationHistoryTimeline orderId={order.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: Logs ── */}
        <TabsContent value="logs" className="mt-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4" /> Historia zmian
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5">
              {order.event_logs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Brak zarejestrowanych zdarzeń.</p>
                </div>
              ) : (
                <div>
                  {[...order.event_logs].reverse().map((log) => (
                    <LogEntry key={log.id} log={log} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <SendEmailDialog
        isOpen={isSendTemplateOpen}
        setIsOpen={setSendTemplateOpen}
        order={order}
      />
      <EditAddressDialog
        order={order as any}
        isOpen={isEditAddressOpen}
        onClose={() => setIsEditAddressOpen(false)}
        onSuccess={() => { setIsEditAddressOpen(false); fetchOrderDetails(); }}
      />
      <EditInvoiceDialog
        order={order as any}
        isOpen={isEditInvoiceOpen}
        onClose={() => setIsEditInvoiceOpen(false)}
        onSuccess={() => { setIsEditInvoiceOpen(false); fetchOrderDetails(); }}
      />
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OrderDetailsContent />
    </Suspense>
  );
}
