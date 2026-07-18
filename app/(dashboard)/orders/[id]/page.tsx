// src/app/(dashboard)/orders/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
  Printer,
  ArrowRightLeft,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { ChatPanel } from "./_components/chat-panel";
import { DisputeChatDialog, translateDisputeSubject } from "./_components/dispute-chat-dialog";
import { AllegroIcon, BaseLinkerIcon, EmpikIcon, InPostIcon } from "@/components/shared/icons";
import { SendEmailDialog } from "../../../../components/shared/send-email-dialog";
import { OrderDetailsApiResponse, MappedOrderDetails, Dispute } from "@/types/order";
import { ServiceIntegration } from "@/types/service-integration";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationHistoryTimeline } from "./_components/communication-history-timeline";
import { EditAddressDialog } from "@/app/(dashboard)/shipping/_components/EditAddressDialog";
import { EditInvoiceDialog } from "@/app/(dashboard)/shipping/_components/EditInvoiceDialog";
import { ProductMappingDialog } from "@/app/(dashboard)/shipping/_components/product-mapping-dialog";
import { cn, downloadFileFromBase64, explodeBundleItems } from "@/lib/utils";
import { useOrderShipments } from "@/app/(dashboard)/shipping/_hooks/use-order-shipments";
import { useShippingConfig } from "@/app/(dashboard)/shipping/_hooks/use-shipping-config";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";
const translateStatus = (status: string | null | undefined): string => {
  if (!status) return "—";
  const upper = status.toUpperCase();
  const translations: Record<string, string> = {
    "NEW": "Nowe",
    "PROCESSING": "W realizacji",
    "READY_FOR_SHIPMENT": "Gotowe do wysyłki",
    "SENT": "Wysłane",
    "CANCELLED": "Anulowane",
    "BOUGHT": "Licytacja / Zakup",
    "FILLED_IN": "Wypełnione",
    "READY_FOR_PROCESSING": "Do realizacji",
    "WAITING_ACCEPTANCE": "Do akceptacji",
    "SHIPPING": "Wysyłka",
    "SHIPPED": "Wysłane",
    "RECEIVED": "Odebrane",
    "CLOSED": "Zamknięte",
    "REFUSED": "Odrzucone",
    "CANCELED": "Anulowane",
    "CREATED": "Utworzone",
    "ACCEPTED": "Zaakceptowane",
    "DELIVERED": "Dostarczone",
    "RETURNED": "Zwrócone",
  };
  return translations[upper] || status;
};

// --- Funkcja Pomocnicza do Budowania Linków Śledzenia ---
function getTrackingUrl(trackingNumber: string, providerType?: string, serviceCode?: string) {
  if (!trackingNumber) return null;
  const cleanNum = trackingNumber.trim();
  
  if (providerType === "SUUS") {
    return `https://wb.suus.com/druid.php?m=project&picker=1&s=Tracking`;
  }
  if (providerType === "RABEN") {
    return `https://mytrack.raben-group.com/tracking?id=${cleanNum}`;
  }
  
  const numOnly = cleanNum.replace(/\s+/g, "");
  
  // Allegro Delivery
  if (/^AD[A-Z0-9]+$/i.test(numOnly)) {
    return `https://allegro.pl/allegrodelivery/sledzenie-paczki?numer=${numOnly}`;
  }
  
  // UPS
  if (/^1Z[A-Z0-9]{16}$/i.test(numOnly)) {
    return `https://www.ups.com/track?tracknum=${numOnly}`;
  }
  // InPost
  if (/^\d{24}$/.test(numOnly)) {
    return `https://inpost.pl/sledz-przesylke?number=${numOnly}`;
  }
  // DHL
  if (/^\d{11}$/.test(numOnly)) {
    return `https://sprawdz.dhl.com.pl/szukaj.aspx?m=0&num=${numOnly}`;
  }
  // DPD
  if (/^\d{13,14}[A-Z]?$/i.test(numOnly)) {
    return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${numOnly}`;
  }
  // GLS
  if (/^\d{11,12}$/.test(numOnly)) {
    return `https://gls-group.eu/PL/pl/sledzenie-paczki?match=${numOnly}`;
  }
  // Poczta Polska
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(numOnly) || /^\d{20}$/.test(numOnly)) {
    return `https://emonitoring.poczta-polska.pl/?numer=${numOnly}`;
  }

  // Fallbacks na podstawie kodu usługi/dostawcy
  const codeLower = (serviceCode || "").toLowerCase();
  if (codeLower.includes("inpost")) {
    return `https://inpost.pl/sledz-przesylke?number=${numOnly}`;
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
  
  return `https://www.google.com/search?q=tracking+${numOnly}`;
}


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

// --- Helper dla uwag kupującego ---
const extractBuyerComment = (payload: any): string | undefined => {
  if (!payload) return undefined;
  if (payload.messageToSeller) {
    if (typeof payload.messageToSeller === "object" && payload.messageToSeller.text) {
      return payload.messageToSeller.text;
    }
    if (typeof payload.messageToSeller === "string") {
      return payload.messageToSeller;
    }
  }
  if (payload.customer_message) return payload.customer_message;
  if (payload.delivery_comments) return payload.delivery_comments;
  if (payload.user_comments) return payload.user_comments;
  if (payload.message_to_seller) return payload.message_to_seller;
  return undefined;
};

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
        isPickupPoint: !!order.pickup_point || !!payload?.shipping_pudo_id || (payload?.shipping_type_code === "PACKSTATION"),
        pickupPointName: order.pickup_point?.name || payload?.shipping_pudo_id || 
            (payload?.order_additional_fields as any[])?.find((f: any) => f.code === "delivery-point-name")?.value ||
            (payload?.shipping_type_code === "PACKSTATION" ? shipping?.lastname : undefined) || undefined,
        address: (() => {
          // Prefer backend-normalized delivery_address for names (already corrected for paczkomat orders)
          // Use raw shipping payload for street/city/zip when available
          const isPickup = !!order.pickup_point || !!payload?.shipping_pudo_id || payload?.shipping_type_code === "PACKSTATION";
          const backendAddr = order.delivery_address;
          if (shipping) {
            return {
              // For pickup point orders, shipping.lastname = machine ID — use backend-corrected name instead
              firstName: backendAddr?.first_name || shipping.firstname || payload.customer?.firstname || undefined,
              lastName: isPickup
                ? (backendAddr?.last_name || payload.customer?.lastname || billing?.lastname || undefined)
                : (shipping.lastname || payload.customer?.lastname || undefined),
              street: ((shipping.street_1 || "") + (shipping.street_2 ? " " + shipping.street_2 : "")).trim() || undefined,
              zipCode: shipping.zip_code || undefined,
              city: shipping.city || undefined,
              countryCode: shipping.country_iso_code || undefined,
              phoneNumber: shipping.phone || payload.customer?.phone || undefined,
            };
          }
          if (backendAddr) {
            return {
              firstName: backendAddr.first_name || undefined,
              lastName: backendAddr.last_name || undefined,
              street: backendAddr.street || undefined,
              zipCode: backendAddr.zip_code || undefined,
              city: backendAddr.city || undefined,
              countryCode: backendAddr.country_code || undefined,
              phoneNumber: backendAddr.phone_number || undefined,
            };
          }
          return undefined;
        })(),
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
      buyerComments: extractBuyerComment(payload),
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
      buyerComments: extractBuyerComment(payload),
    };
  }

  if (order.integration?.provider_type === "INPOST_BUY") {
    const currency = payload?.finalPrice?.currency || "PLN";
    const shipping = payload?.delivery?.address;
    const customer = payload?.customer;

    return {
      delivery: {
        methodName: payload?.delivery?.deliveryType || "Brak informacji",
        isPickupPoint: !!payload?.delivery?.deliveryPoint,
        pickupPointName: payload?.delivery?.deliveryPoint?.name || payload?.delivery?.deliveryPoint?.id || undefined,
        address: shipping ? {
          firstName: customer?.firstName || undefined,
          lastName: customer?.lastName || undefined,
          street: ((shipping.street || "") + (shipping.building ? " " + shipping.building : "") + (shipping.flat ? "/" + shipping.flat : "")).trim() || undefined,
          zipCode: shipping.postCode || undefined,
          city: shipping.city || undefined,
          countryCode: shipping.countryCode || undefined,
          phoneNumber: customer?.phoneNumber || undefined,
        } : undefined,
      },
      payment: {
        type: payload?.paymentDetails?.selectedPaymentType?.toLowerCase().includes("cod") || payload?.paymentDetails?.selectedPaymentType?.toLowerCase().includes("pobran") ? "CASH_ON_DELIVERY" : "ONLINE",
        provider: payload?.paymentDetails?.selectedPaymentType || "Brak informacji",
        status: order.payment_status || "COMPLETED",
        total: `${payload?.finalPrice?.amount || "0.00"} ${currency}`,
      },
      invoice: {
        required: false,
        address: undefined,
      },
      line_items: (payload?.orderLines || []).map((line: any) => {
        const offer = line.offer || {};
        const product = offer.product || {};
        return {
          id: offer.offerId,
          name: product.name || "Brak nazwy",
          quantity: line.quantity || 1,
          price: `${offer.price?.amount || "0.00"} ${offer.price?.currency || "PLN"}`,
          sku: product.sku || product.ean || offer.offerId,
          imageUrl: line.imageUrl || null,
          offerId: offer.offerId,
        };
      }),
      buyerComments: extractBuyerComment(payload),
    };
  }

  // Allegro / manual
  return {
    delivery: {
      methodName: payload.delivery?.method?.name || "Brak informacji",
      isPickupPoint: !!payload.delivery?.pickupPoint,
      pickupPointName: payload.delivery?.pickupPoint?.name,
      address: payload.delivery?.address ? {
        firstName: payload.delivery.address.firstName || undefined,
        lastName: payload.delivery.address.lastName || undefined,
        street: payload.delivery.address.street || undefined,
        zipCode: payload.delivery.address.zipCode || payload.delivery.address.postalCode || undefined,
        city: payload.delivery.address.city || undefined,
        countryCode: payload.delivery.address.countryCode || undefined,
        phoneNumber: payload.delivery.address.phoneNumber || undefined,
        companyName: payload.delivery.address.companyName || undefined,
      } : undefined,
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
      address: payload.invoice?.address ? {
        firstName: payload.invoice.address.naturalPerson?.firstName || undefined,
        lastName: payload.invoice.address.naturalPerson?.lastName || undefined,
        companyName: payload.invoice.address.company?.name || undefined,
        taxId: payload.invoice.address.company?.taxId || undefined,
        street: payload.invoice.address.street || undefined,
        zipCode: payload.invoice.address.zipCode || payload.invoice.address.postalCode || undefined,
        city: payload.invoice.address.city || undefined,
        countryCode: payload.invoice.address.countryCode || undefined,
      } : undefined,
    },
    line_items: (payload.lineItems || []).map((item: any) => ({
      id: item.id,
      name: item.offer.name,
      quantity: item.quantity,
      price: `${item.price.amount} ${item.price.currency}`,
      imageUrl: item.imageUrl,
      sku: item.offer?.external?.id || item.offer?.id,
      selectedAdditionalServices: item.selectedAdditionalServices || [],
    })),
    buyerComments: extractBuyerComment(payload),
  };
};

// --- Helpers ---
const formatName = (first?: string | null, last?: string | null, company?: string | null) => {
  if (company?.trim()) return company.trim();
  const full = `${first || ""} ${last || ""}`.trim();
  return full || null;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  COMPLETED: { label: "Zrealizowane", color: "text-emerald-600 dark:text-emerald-400", icon: <CheckCircle2 className="h-4 w-4" /> },
  PAID: { label: "Opłacone", color: "text-emerald-600 dark:text-emerald-400", icon: <CheckCircle2 className="h-4 w-4" /> },
  PENDING: { label: "Oczekuje", color: "text-amber-600 dark:text-amber-400", icon: <AlertCircle className="h-4 w-4" /> },
  CANCELED: { label: "Anulowane", color: "text-red-600 dark:text-red-400", icon: <XCircle className="h-4 w-4" /> },
  PROCESSING: { label: "W toku", color: "text-blue-600 dark:text-blue-400", icon: <Loader2 className="h-4 w-4" /> },
};

// --- Sub-components ---

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-foreground/5 hover:bg-foreground/10 rounded-xl px-4 py-2.5 border border-border/30 hover:border-border/50 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md shadow-black/5 hover:shadow-black/10 shrink-0">
      <span className="text-primary/80 bg-foreground/5 p-1.5 rounded-lg border border-border/20">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold font-mono">{label}</p>
        <p className="text-xs font-extrabold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center gap-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/10 px-1 rounded-md transition-all duration-200">
      <span className="text-xs text-muted-foreground/80 shrink-0 font-medium">{label}</span>
      <span className={`text-xs font-semibold text-foreground text-right ${mono ? "font-mono tracking-tight text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 mb-3.5 flex items-center gap-2 border-b border-border/20 pb-1.5 font-mono w-full">
      {icon && <span className="text-primary/70">{icon}</span>}
      <span>{children}</span>
    </p>
  );
}

// --- ERP Symbol Inline Edit ---
function ErpSymbolEdit({ orderId, initial, onSaved }: { orderId: string; initial?: string | null; onSaved: (v: string) => void }) {
  const isMobile = useMobile(768);
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
      <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 p-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 text-xs font-mono w-44 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary rounded-lg"
          placeholder="np. FS/1234/2025"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 bg-foreground/5 hover:bg-foreground/10 rounded-xl px-3 py-1.5 border border-border/20 hover:border-border/40 transition-all duration-300">
      <span className="font-mono text-sm font-bold text-amber-500">
        {initial || <span className="text-muted-foreground italic text-xs font-normal">Brak dokumentu</span>}
      </span>
      {!isMobile && (
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-foreground/10 rounded-md transition-colors" 
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}


// --- Card Section Header Helper ---
function CardSectionHeader({ title, icon, onAction }: { title: string; icon?: React.ReactNode; onAction?: () => void }) {
  const isMobile = useMobile(768);
  return (
    <div className="flex items-center justify-between pb-2 mb-3.5 border-b border-border/20">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono">
        {icon && <span className="text-primary/70">{icon}</span>}
        <span>{title}</span>
      </div>
      {onAction && !isMobile && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-foreground/10 rounded-md transition-colors -mr-1" 
          onClick={onAction}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
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
      <CardSectionHeader title="Adres dostawy" icon={<MapPin className="h-3.5 w-3.5" />} onAction={onEdit} />
      {mapped.isPickupPoint ? (
        <div className="space-y-1.5 text-xs">
          <p className="font-bold text-primary flex items-center gap-1.5 bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/10 w-fit">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{mapped.pickupPointName}</span>
          </p>
          <div className="space-y-0.5 pl-1.5 border-l border-border/40 text-muted-foreground">
            <p className="font-medium text-foreground">{street}</p>
            <p>{zip} {city}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 text-xs pl-1 border-l-2 border-primary/20">
          {name && <p className="font-bold text-foreground">{name}</p>}
          <div className="text-muted-foreground space-y-0.5">
            <p>{street}</p>
            <p>{zip} {city}</p>
            {phone && <p className="font-mono text-[11px] text-foreground mt-1.5 flex items-center gap-1"><span className="text-muted-foreground/60">tel:</span> {phone}</p>}
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/60 mt-3.5 pt-2.5 border-t border-border/20 flex items-center justify-between">
        <span>Metoda:</span>
        <span className="font-bold text-foreground/80 font-mono uppercase bg-muted px-2 py-0.5 rounded-md">{mapped.methodName}</span>
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
      <CardSectionHeader title="Dane do faktury" icon={<Receipt className="h-3.5 w-3.5" />} onAction={onEdit} />
      {!mapped.required && !inv ? (
        <div className="py-2 px-3 bg-muted/20 border border-dashed border-border/40 rounded-xl">
          <p className="text-xs text-muted-foreground/80 italic text-center">Klient nie poprosił o fakturę.</p>
        </div>
      ) : (
        <div className="space-y-1.5 text-xs pl-1 border-l-2 border-amber-500/20">
          {name && <p className="font-bold text-foreground">{name}</p>}
          {taxId && (
            <p className="font-mono text-[11px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit my-1">
              NIP: {taxId}
            </p>
          )}
          <div className="text-muted-foreground space-y-0.5">
            <p>{street}</p>
            <p>{zip} {city}</p>
          </div>
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
    <div className="flex gap-4 items-start py-3.5 border-b border-border/10 last:border-0 hover:bg-muted/10 px-2 rounded-xl transition-all duration-200 group">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-xl bg-foreground/5 border border-border/20 group-hover:border-primary/20 flex items-center justify-center transition-all duration-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug text-foreground/90 group-hover:text-foreground transition-colors">{log.summary}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="secondary" className="text-[9px] px-2 py-0 h-4 bg-muted/40 text-muted-foreground border-none font-bold rounded-full font-mono uppercase">{log.source}</Badge>
          <Badge variant="outline" className="text-[9px] px-2 py-0 h-4 border-border/60 text-muted-foreground font-bold rounded-full font-mono uppercase">{log.type}</Badge>
          <span className="text-[10px] text-muted-foreground/60 ml-auto font-medium">
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
        <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold px-2 flex items-center gap-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" /> Zsynchronizowana
        </Badge>
      );
    }
    if (syncStatus === "ERROR") {
      return (
        <Badge variant="outline" className="text-[10px] h-5 bg-destructive/10 text-destructive border-destructive/20 font-semibold px-2 flex items-center gap-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping shrink-0" /> Błąd synchronizacji
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20 font-semibold px-2 flex items-center gap-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> {syncStatus}
      </Badge>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-2 mb-3.5 border-b border-border/20">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono">
          <Receipt className="h-3.5 w-3.5 text-primary/70" />
          <span>Faktura sprzedaży (ERP)</span>
        </div>
        {statusBadge()}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wider mb-1">Numer dokumentu FS</p>
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
            className="shrink-0 gap-1.5 text-xs h-8.5 border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 bg-white/5 rounded-xl shadow-md transition-all duration-300 self-end"
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
        <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">
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
  const [activeTab, setActiveTab] = useState("details");
  const [isSendTemplateOpen, setSendTemplateOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isDisputeChatOpen, setIsDisputeChatOpen] = useState(false);

  const [showMissingStock, setShowMissingStock] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("orders_show_missing_stock");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("orders_show_missing_stock");
      setShowMissingStock(saved !== null ? saved === "true" : true);
    };
    window.addEventListener("orders_show_missing_stock_changed", handleStorageChange);
    return () => {
      window.removeEventListener("orders_show_missing_stock_changed", handleStorageChange);
    };
  }, []);

  const { data: shipments, isLoading: isShipmentsLoading } = useOrderShipments(orderId);
  const { data: shippingConfig } = useShippingConfig();
  const [downloadingShipmentId, setDownloadingShipmentId] = useState<string | null>(null);

  // PrintHub integration
  const { isEnabled: printHubEnabled, status: printHubStatus, defaultInvoicePrinter } = usePrintHub();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleFulfillmentStatusChange = async (newStatus: string) => {
    if (!order) return;
    setIsUpdatingStatus(true);
    const toastId = toast.loading("Aktualizowanie statusu zamówienia...");
    try {
      const response = await api.patch<OrderDetailsApiResponse>(
        `/orders/${order.id}/fulfillment-status`,
        { fulfillment_status: newStatus }
      );
      setOrder(response.data);
      toast.success("Status zamówienia został zaktualizowany.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się zaktualizować statusu zamówienia.", { id: toastId });
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const getCourierName = (integrationId: number) => {
    if (!shippingConfig) return `Kurier #${integrationId}`;
    return (
      shippingConfig.couriers.find((c) => c.id === integrationId)?.name ||
      `Nieznany kurier #${integrationId}`
    );
  };

  const handleDownloadLabel = async (shipment: any) => {
    setDownloadingShipmentId(shipment.id);
    try {
      const response = await api.get(`/shipping/shipments/${shipment.id}/label`);
      const { label_data, label_format } = response.data;
      
      const fileName = `etykieta-${shipment.tracking_number || shipment.id}.${label_format.toLowerCase()}`;
      const mimeType = label_format === "PDF" ? "application/pdf" : "text/plain";
      
      downloadFileFromBase64(label_data, fileName, mimeType);
      toast.success("Pobrano etykietę!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Nie udało się pobrać etykiety.");
    } finally {
      setDownloadingShipmentId(null);
    }
  };


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

  const generateOrderCardPdf = async () => {
    const element = document.getElementById("print-order-card");
    if (!element) {
      toast.error("Błąd: Nie znaleziono szablonu wydruku.");
      return null;
    }

    const originalClassName = element.className;
    element.className = "bg-white text-black p-6 w-[210mm] mx-auto block text-xs font-sans absolute left-0 top-0 z-50";

    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      element.className = originalClassName;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const renderHeight = Math.min(imgHeight, pageHeight - 16); 

      pdf.addImage(imgData, "JPEG", 0, 8, imgWidth, renderHeight);
      
      const pdfBase64 = pdf.output("datauristring").split(",")[1];
      return { base64: pdfBase64, pdf };
    } catch (err) {
      console.error(err);
      element.className = originalClassName;
      toast.error("Nie udało się wygenerować PDF zamówienia.");
      return null;
    }
  };

  const handlePrintOrderCard = async () => {
    if (printHubEnabled && printHubStatus === "connected") {
      setIsPrinting(true);
      const toastId = toast.loading("Generowanie PDF i wysyłanie do Print Huba...");
      try {
        const result = await generateOrderCardPdf();
        if (result) {
          printHubService.printPdf(result.base64, `Karta_Zamowienia_${order?.external_order_id || order?.id}`, {
            printerName: defaultInvoicePrinter || undefined
          });
          toast.success("Wysłano kartę zamówienia do Print Huba!", { id: toastId });
        } else {
          toast.dismiss(toastId);
        }
      } catch {
        toast.error("Wystąpił błąd podczas wysyłania do druku.", { id: toastId });
      } finally {
        setIsPrinting(false);
      }
    } else {
      window.print();
    }
  };

  const handleDownloadOrderCardPdf = async () => {
    setIsSavingPdf(true);
    const toastId = toast.loading("Generowanie pliku PDF...");
    try {
      const result = await generateOrderCardPdf();
      if (result) {
        result.pdf.save(`Karta_Zamowienia_${order?.external_order_id || order?.id}.pdf`);
        toast.success("Zapisano plik PDF!", { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch {
      toast.error("Nie udało się zapisać pliku PDF.", { id: toastId });
    } finally {
      setIsSavingPdf(false);
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

  const erpSymbols = useMemo(() => {
    if (!productMappings || !mappedDetails?.line_items) return [];
    const symbols = mappedDetails.line_items
      .map((item) => {
        const offerId = (item as any).offerId || item.sku;
        return productMappings[offerId]?.erp_product_symbol;
      })
      .filter((sym): sym is string => !!sym);
    return Array.from(new Set(symbols));
  }, [productMappings, mappedDetails]);

  const { data: bundleComponents } = useQuery<Record<string, Array<{ symbol: string; quantity: number }>>>({
    queryKey: ["bundleComponents", erpIntegration?.id, erpSymbols],
    queryFn: async () => {
      if (!erpIntegration?.id || erpSymbols.length === 0) return {};
      const res = await api.post(`/erp-proxy/integrations/${erpIntegration.id}/products/components/bulk`, { symbols: erpSymbols });
      return res.data;
    },
    enabled: !!erpIntegration?.id && erpSymbols.length > 0,
  });

  const explodedLineItems = useMemo(() => {
    if (!mappedDetails?.line_items) return [];
    if (!productMappings || !bundleComponents) return mappedDetails.line_items;

    const exploded = [];
    for (const item of mappedDetails.line_items) {
      const offerId = (item as any).offerId || item.sku;
      const mapping = productMappings[offerId] || productMappings[item.id];
      const erpSymbol = mapping?.erp_product_symbol;
      const components = bundleComponents[erpSymbol];

      if (components && components.length > 0) {
        for (const comp of components) {
          exploded.push({
            id: `${item.id}-${comp.symbol}`,
            name: `[SKŁADNIK] ${comp.symbol}`,
            sku: comp.symbol,
            ean: "",
            quantity: item.quantity * comp.quantity,
            price: "0.00 PLN",
            imageUrl: (item as any).imageUrl || null,
            isComponent: true,
            parentName: item.name
          });
        }
      } else {
        exploded.push(item);
      }
    }
    return exploded;
  }, [mappedDetails, productMappings, bundleComponents]);


  const externalTracking = useMemo(() => {
    if (!order) return [];
    const allTracking = Array.from(new Set(order.tracking_numbers || []));
    const systemTracking = (shipments || []).map((s) => s.tracking_number).filter(Boolean);
    return allTracking.filter((t) => !systemTracking.includes(t));
  }, [order, shipments]);

  const isCod = useMemo(() => {
    if (!order) return false;
    if (order.payment_type === "CASH_ON_DELIVERY") return true;
    if (order.integration?.provider_type === "ALLEGRO") {
      return order.details_payload?.payment?.type === "CASH_ON_DELIVERY";
    }
    if (order.integration?.provider_type === "EMPIK") {
      const ptype = order.details_payload?.payment_type || order.details_payload?.paymentType;
      return !!(ptype && String(ptype).toLowerCase().includes("pobran"));
    }
    return String(order.details_payload?.payment_method_cod) === "1";
  }, [order]);

  const shippingCost = useMemo(() => {
    if (!order || !order.details_payload) return "0.00";
    const payload = order.details_payload;
    if (order.integration?.provider_type === "EMPIK") {
      return payload.shipping_price !== undefined && payload.shipping_price !== null 
        ? parseFloat(payload.shipping_price).toFixed(2)
        : "0.00";
    }
    if (order.integration?.provider_type === "ALLEGRO") {
      return payload.delivery?.cost?.amount !== undefined && payload.delivery?.cost?.amount !== null
        ? parseFloat(payload.delivery.cost.amount).toFixed(2)
        : "0.00";
    }
    return payload.delivery_price !== undefined && payload.delivery_price !== null
      ? parseFloat(payload.delivery_price).toFixed(2)
      : "0.00";
  }, [order]);

  const hasShippingCost = useMemo(() => {
    return shippingCost && parseFloat(shippingCost) > 0;
  }, [shippingCost]);

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

      {/* ── BACK BUTTON ── */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground gap-2 transition-all px-3 py-1.5 rounded-xl hover:bg-foreground/5 border border-transparent hover:border-border/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy zamówień
        </Button>
      </div>

      {/* ── HERO HEADER ── */}
      <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-gradient-to-br from-primary/5 via-background to-background dark:from-[#0c0f1d] dark:via-[#111322] dark:to-[#07080f] shadow-xl shadow-black/10 dark:shadow-black/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-5000" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-7000" />
        <div className="absolute inset-0 bg-grid-premium opacity-[0.03] pointer-events-none" />
        
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Icon + integration */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-foreground/5 dark:bg-gradient-to-br dark:from-white/15 dark:to-white/5 border border-border/30 hover:border-primary/40 flex items-center justify-center shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-primary/10 shrink-0">
                {!providerType && <Package className="h-7 w-7 text-white/70" />}
                {providerType === "ALLEGRO" && <AllegroIcon className="max-h-7 max-w-[80%] w-auto shrink-0" />}
                {providerType === "BASELINKER" && <BaseLinkerIcon className="max-h-7 max-w-[80%] w-auto shrink-0" />}
                {providerType === "EMPIK" && <EmpikIcon className="max-h-7 max-w-[80%] w-auto rounded shrink-0" />}
                {providerType === "INPOST_BUY" && <InPostIcon className="max-h-7 max-w-[80%] w-auto rounded shrink-0" />}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold font-mono">
                  {order.integration?.name || "Zamówienie ręczne"}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <h1 className="text-xl font-black text-foreground leading-none tracking-tight">
                    #{order.external_order_id}
                  </h1>
                  {showMissingStock && order.flags?.includes("BRAK_STANU") && (
                    <Badge variant="destructive" className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 uppercase text-[9px] font-bold tracking-widest px-2 py-0.5 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] flex items-center gap-1.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      Brak Towaru
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-mono mt-1 select-all">{order.id}</p>
              </div>
            </div>
 
            {/* Stats pills */}
            <div className="flex flex-wrap gap-3 md:ml-auto items-center">
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
              <div className={cn(
                "flex items-center gap-3 bg-foreground/5 rounded-xl px-4 py-2.5 border border-border/30 shadow-md shadow-black/5 hover:bg-foreground/10 transition-all duration-300 transform hover:-translate-y-0.5 shrink-0",
                payInfo.color
              )}>
                <span className="bg-foreground/5 p-1.5 rounded-lg border border-border/20">{payInfo.icon}</span>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold font-mono">Status</p>
                  <p className="text-xs font-extrabold">{payInfo.label}</p>
                </div>
              </div>
            </div>
          </div>
 
          {/* ERP document number & Actions bar */}
          <div className="mt-6 pt-5 border-t border-border/20 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[10px] uppercase tracking-wider font-semibold">
                <Hash className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>Dokument ERP</span>
              </div>
              <ErpSymbolEdit
                orderId={order.id}
                initial={order.erp_sales_document_number}
                onSaved={(v) => setOrder((o) => o ? { ...o, erp_sales_document_number: v } : o)}
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {order.erp_sales_document_number && (
                <Button
                  id="header-download-invoice-pdf"
                  variant="outline"
                  size="sm"
                  className="border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 bg-white/5 gap-1.5 transition-all duration-300 shadow-md shadow-emerald-950/20 rounded-xl"
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
                className="border-border/30 text-foreground/80 hover:text-foreground hover:bg-foreground/5 gap-1.5 transition-all duration-300 rounded-xl"
                onClick={() => setSendTemplateOpen(true)}
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Wyślij e-mail
              </Button>
              <Button
                id="header-print-order-card"
                variant="outline"
                size="sm"
                className="border-border/30 text-foreground/80 hover:text-foreground hover:bg-foreground/5 gap-1.5 transition-all duration-300 rounded-xl"
                onClick={handlePrintOrderCard}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {printHubEnabled && printHubStatus === "connected" ? "Drukuj przez PrintHub" : "Drukuj kartę"}
              </Button>
              <Button
                id="header-download-order-card-pdf"
                variant="outline"
                size="sm"
                className="border-border/30 text-foreground/80 hover:text-foreground hover:bg-foreground/5 gap-1.5 transition-all duration-300 rounded-xl"
                onClick={handleDownloadOrderCardPdf}
                disabled={isSavingPdf}
              >
                {isSavingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                Zapisz PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT: Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border border-border bg-muted/40 p-1 rounded-2xl glass shadow-sm flex flex-wrap h-auto gap-1">
          <TabsTrigger value="details" className="rounded-xl gap-1.5 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300">
            <Home className="h-3.5 w-3.5" /> Szczegóły
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-xl gap-1.5 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300">
            <MessageSquare className="h-3.5 w-3.5" /> Wiadomości
            {(order.threads?.length || 0) > 0 && (
              <Badge
                variant="secondary"
                className={`ml-1 text-[9px] px-1.5 py-0 h-4 border-none font-bold rounded-full ${
                  order.threads?.some(t => !t.read)
                    ? "bg-blue-500/20 text-blue-400 animate-pulse"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {order.threads!.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="returns" className="rounded-xl gap-1.5 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Dyskusje i Zwroty
            {((order.returns?.length || 0) + (order.disputes?.length || 0)) > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-none font-bold rounded-full">
                {(order.returns?.length || 0) + (order.disputes?.length || 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl gap-1.5 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300">
            <History className="h-3.5 w-3.5" /> Historia
          </TabsTrigger>
          <TabsTrigger value="related_orders" className="rounded-xl gap-1.5 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300">
            <ShoppingBag className="h-3.5 w-3.5" /> Inne zamówienia klienta
            {order.related_orders && order.related_orders.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-none font-bold rounded-full">
                {order.related_orders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl gap-1.5 px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300">
            <ScrollText className="h-3.5 w-3.5" />
            Logi
            {order.event_logs.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-none font-bold rounded-full">{order.event_logs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
 
        {/* ── TAB: Details ── */}
        <TabsContent value="details" className="mt-4 space-y-4">
          {/* Customer Comments */}
          {mappedDetails.buyerComments && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 shadow-lg shadow-amber-500/5 rounded-2xl p-4 flex gap-4 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30 animate-pulse">
                <MessageSquare className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-400 mb-0.5">Uwagi od kupującego</h3>
                <p className="text-sm text-amber-300/90 whitespace-pre-wrap leading-relaxed">
                  {mappedDetails.buyerComments}
                </p>
              </div>
            </div>
          )}
 
          {/* ── Products — full width, at the top ── */}
          <Card className="border-border/60 shadow-lg shadow-black/5 overflow-hidden rounded-2xl">
            <CardHeader className="pb-3 bg-muted/20 border-b border-border/10">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-mono text-foreground/80">
                <Package className="h-4 w-4 text-primary" /> Produkty w zamówieniu
                <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-none font-bold rounded-full">{mappedDetails.line_items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {mappedDetails.line_items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8 px-5">Brak produktów.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/10 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                      <th className="text-left px-5 py-3 font-semibold">Produkt</th>
                      <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">SKU / EAN</th>
                      <th className="text-left px-3 py-3 font-semibold">Symbol ERP</th>
                      <th className="text-center px-3 py-3 font-semibold">Ilość</th>
                      <th className="text-right px-5 py-3 font-semibold">Cena</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {mappedDetails.line_items.map((item) => {
                      const offerId = (item as any).offerId || item.sku;
                      const mapping = productMappings?.[offerId] || productMappings?.[item.id];
                      return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-all duration-300 hover:translate-x-0.5 group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {(item as any).imageUrl ? (
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border/40 shrink-0 bg-white p-1 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-primary/30">
                                <img src={(item as any).imageUrl} alt={item.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-xl border border-border/40 bg-muted/40 flex items-center justify-center shrink-0 shadow-sm">
                                <Package className="h-6 w-6 text-muted-foreground/60" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs leading-snug text-foreground/90 group-hover:text-primary transition-colors">{item.name}</p>
                              {item.selectedAdditionalServices && item.selectedAdditionalServices.length > 0 && (
                                <div className="mt-1.5 pl-2 text-[10px] text-muted-foreground border-l border-primary/30 space-y-0.5">
                                  {item.selectedAdditionalServices.map((service: any, sIdx: number) => (
                                    <div key={sIdx} className="flex items-center gap-1">
                                      <span className="inline-block bg-primary/10 text-primary font-bold text-[8px] px-1 py-0.5 rounded uppercase">
                                        Usługa dodatkowa
                                      </span>
                                      <span className="font-medium">
                                        {service.name || service.definitionId}{" "}
                                        {service.price && (
                                          <span className="text-foreground/70 font-semibold font-mono">
                                            ({service.price.amount} {service.price.currency} x{service.quantity || 1})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 hidden md:table-cell">
                          <div className="flex flex-col gap-1">
                            {item.sku && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                <Tag className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                <span>{item.sku}</span>
                              </span>
                            )}
                            {item.ean && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                <Hash className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                <span>{item.ean}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                             {mapping ? (
                               <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold px-2 flex items-center gap-1 rounded-full">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                 ERP: {mapping.erp_product_symbol}
                               </Badge>
                             ) : (
                               <Badge variant="outline" className="text-[10px] h-5 bg-destructive/10 text-destructive border-destructive/20 font-semibold px-2 flex items-center gap-1 rounded-full">
                                 <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
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
                        <td className="px-3 py-3.5 text-center">
                          <Badge variant="outline" className="font-mono text-xs font-bold rounded-lg border-border/60 bg-muted/20 px-2 py-0.5">{item.quantity}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <p className="font-extrabold text-sm">{item.price}</p>
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-mono font-semibold">/ szt.</p>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
              {hasShippingCost && (
                <div className="border-t border-border/20 px-5 py-3.5 bg-muted/10 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider font-mono">Koszt transportu:</span>
                  <span className={cn(
                    "font-mono font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm text-xs",
                    isCod 
                      ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-extrabold shadow-yellow-500/5" 
                      : "bg-muted text-muted-foreground border border-border/40"
                  )}>
                    {shippingCost} PLN {isCod && " (POBRANIE)"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Grid: addresses + sidebar ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Delivery + Invoice side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-border/60 shadow-lg shadow-black/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 bg-gradient-to-b from-muted/40 to-muted/10 backdrop-blur-md">
                  <CardContent className="pt-5 pb-4 px-5">
                    <DeliverySection
                      order={order}
                      mapped={mappedDetails.delivery}
                      onEdit={() => setIsEditAddressOpen(true)}
                    />
                  </CardContent>
                </Card>
                <Card className="border-border/60 shadow-lg shadow-black/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 bg-gradient-to-b from-muted/40 to-muted/10 backdrop-blur-md">
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
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionLabel icon={<User className="h-3.5 w-3.5" />}>Kupujący</SectionLabel>
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
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionLabel icon={<CreditCard className="h-3.5 w-3.5" />}>Płatność</SectionLabel>
                  <InfoRow label="Status" value={payInfo.label} />
                  <InfoRow label="Typ" value={mappedDetails.payment.type === "CASH_ON_DELIVERY" ? "Za pobraniem" : "Online"} />
                  <InfoRow label="Operator" value={mappedDetails.payment.provider} />
                  <div className="flex justify-between items-center pt-3.5 mt-2.5 border-t border-border/20 bg-gradient-to-r from-emerald-500/10 to-violet-500/10 -mx-5 px-5 py-2.5">
                    <span className="text-xs text-muted-foreground/90 font-bold uppercase tracking-wider font-mono">Suma</span>
                    <span className="text-sm font-black font-mono text-foreground bg-gradient-to-r from-emerald-500/20 to-violet-500/20 px-3 py-1 rounded-xl shadow-lg shadow-emerald-500/5 border border-emerald-400/20">
                      {mappedDetails.payment.total}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Order info */}
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionLabel icon={<ShoppingBag className="h-3.5 w-3.5" />}>Zamówienie</SectionLabel>
                  <InfoRow label="Status" value={translateStatus(order.status)} />
                  <InfoRow label="Status zewnętrzny" value={translateStatus(order.external_status)} />
                  <div className="flex justify-between items-center gap-4 py-2.5 border-b border-border/20 hover:bg-muted/10 px-1 rounded-md transition-all duration-200">
                    <span className="text-xs text-muted-foreground/80 shrink-0 font-medium">Fulfillment</span>
                    <Select
                      value={order.fulfillment_status || "NEW"}
                      onValueChange={handleFulfillmentStatusChange}
                      disabled={isUpdatingStatus}
                    >
                      <SelectTrigger className="h-7 w-[160px] bg-background border-border/40 hover:border-border/60 focus:ring-primary/30 rounded-xl transition-all text-xs font-semibold">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/30 bg-background backdrop-blur-lg">
                        <SelectItem value="NEW" className="text-xs font-semibold text-amber-600">Nowe (NEW)</SelectItem>
                        <SelectItem value="PROCESSING" className="text-xs font-semibold text-cyan-600">W toku (PROCESSING)</SelectItem>
                        <SelectItem value="READY_FOR_SHIPMENT" className="text-xs font-semibold text-indigo-600">Gotowe (READY_FOR_SHIPMENT)</SelectItem>
                        <SelectItem value="SENT" className="text-xs font-semibold text-emerald-600">Wysłane (SENT)</SelectItem>
                        <SelectItem value="CANCELLED" className="text-xs font-semibold text-rose-600">Anulowane (CANCELLED)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <InfoRow label="Data zakupu" value={new Date(order.purchased_at).toLocaleString("pl-PL")} />
                  {order.tracking_numbers && order.tracking_numbers.length > 0 && (
                    <div className="py-2.5 border-t border-border/20 mt-2.5 space-y-1.5">
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-mono font-bold mb-1">Nr śledzenia</p>
                      {Array.from(new Set(order.tracking_numbers)).map((t) => {
                        const trackingUrl = getTrackingUrl(t);
                        return (
                          <div key={t} className="flex items-center justify-between gap-2 bg-muted/20 p-2 rounded-xl border border-border/40 hover:border-primary/20 transition-all duration-200">
                            <span className="font-mono text-xs font-semibold text-foreground/95">{t}</span>
                            {trackingUrl && (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary-hover hover:underline flex items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 transition-all"
                              >
                                Śledź <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Przesyłki wygenerowane przez nasz system */}
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
                <CardContent className="pt-5 pb-4 px-5">
                  <SectionLabel icon={<Truck className="h-3.5 w-3.5" />}>Przesyłki i Etykiety</SectionLabel>
                  {isShipmentsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (!shipments || shipments.length === 0) && externalTracking.length === 0 ? (
                    <p className="text-xs text-muted-foreground/80 italic text-center py-3">Brak przesyłek dla tego zamówienia.</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Przesyłki systemowe */}
                      {shipments && shipments.map((shipment) => {
                        const courierInteg = shippingConfig?.couriers.find((c) => c.id === shipment.courier_integration_id);
                        const trackingUrl = getTrackingUrl(
                          shipment.tracking_number || "", 
                          courierInteg?.provider_type,
                          shipment.courier_service_code
                        );
                        return (
                          <div key={shipment.id} className="p-3.5 rounded-xl border border-border/40 hover:border-primary/30 bg-muted/10 hover:bg-muted/20 transition-all duration-300 space-y-3 text-xs group">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-foreground/5 border-border/20 px-2 py-0.5 rounded-md">
                                {getCourierName(shipment.courier_integration_id)}
                              </Badge>
                              <Badge variant="outline" className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                shipment.status === "DELIVERED" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                                shipment.status === "ERROR" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 shadow-[0_0_12px_-3px_rgba(239,68,68,0.2)]" :
                                "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              )}>
                                {shipment.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-mono text-xs text-foreground/90 font-medium truncate select-all" title={shipment.tracking_number || "Brak numeru"}>
                                {shipment.tracking_number || "Brak numeru"}
                              </div>
                              {trackingUrl && shipment.tracking_number && (
                                <a 
                                  href={trackingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary-hover hover:underline flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-extrabold shrink-0 bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 transition-all"
                                >
                                  Śledź <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/10">
                              <span className="text-[10px] text-muted-foreground/60 font-mono font-medium">
                                {new Date(shipment.created_at).toLocaleDateString("pl-PL")}
                              </span>
                              {shipment.label_format && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] px-2.5 gap-1.5 border-border/30 hover:border-emerald-500/30 text-foreground/80 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all duration-300 rounded-lg shadow-sm"
                                  onClick={() => handleDownloadLabel(shipment)}
                                  disabled={downloadingShipmentId === shipment.id}
                                >
                                  {downloadingShipmentId === shipment.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                  Etykieta
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Przesyłki zewnętrzne */}
                      {externalTracking.map((t) => {
                        const trackingUrl = getTrackingUrl(t);
                        return (
                          <div key={t} className="p-3.5 rounded-xl border border-border/40 hover:border-primary/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-300 space-y-2.5 text-xs group">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                Przesyłka zewnętrzna
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted/20 text-muted-foreground">
                                Zewnętrzny
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-mono text-xs text-foreground/90 font-medium truncate select-all" title={t}>
                                {t}
                              </div>
                              {trackingUrl && (
                                <a 
                                  href={trackingUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary-hover hover:underline flex items-center gap-0.5 text-[10px] uppercase tracking-wider font-extrabold shrink-0 bg-primary/10 px-2 py-1 rounded-lg border border-primary/20 transition-all"
                                >
                                  Śledź <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Returns & Disputes ── */}
        <TabsContent value="returns" className="mt-4 space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Associated Returns (Zwroty) */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/10">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-mono text-foreground/80">
                    <ArrowRightLeft className="h-4 w-4 text-primary" /> Zwroty z Allegro
                    <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-none font-bold rounded-full">
                      {order.returns?.length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 px-5">
                  {!order.returns || order.returns.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Brak zwrotów powiązanych z tym zamówieniem.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/10">
                      {order.returns.map((ret) => (
                        <div key={ret.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground/95 select-all">
                                {ret.external_return_id || ret.reference_number}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-primary/5 text-primary border-primary/20">
                                {ret.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                              Utworzono: {new Date(ret.created_at_external).toLocaleString("pl-PL")}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild className="h-8 text-xs border-border/30 hover:border-primary/30 text-foreground/80 hover:text-foreground transition-all duration-300 rounded-xl">
                            <Link href={`/returns/${ret.id}`}>
                              Szczegóły zwrotu
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Powiązanie zwrotów ze sporami */}
              {(order.disputes?.length || 0) > 0 && (
                <Card className="border-red-500/20 shadow-lg shadow-red-500/5 rounded-2xl overflow-hidden bg-gradient-to-b from-red-500/10 to-transparent backdrop-blur-md">
                  <CardContent className="pt-4 pb-4 px-5 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5 animate-pulse" />
                    <div className="text-xs text-red-900 dark:text-red-300/90 leading-relaxed">
                      <p className="font-bold mb-1 text-red-700 dark:text-red-400">
                        {order.disputes!.filter(d => d.status === "ONGOING").length > 0
                          ? `Masz ${order.disputes!.filter(d => d.status === "ONGOING").length} aktywny spór powiązany z tym zamówieniem!`
                          : `To zamówienie posiada ${order.disputes!.length} zamkniętych sporów.`
                        }
                      </p>
                      <p className="text-red-800/70 dark:text-red-300/70">Szczegóły i odpowiedź znajdziesz w panelu <strong>Spory i Reklamacje Allegro</strong> po prawej stronie.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar: Associated Allegro Disputes */}
            <div className="space-y-4">
              <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-muted/20 border-b border-border/10">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-mono text-foreground/80">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" /> Spory i Reklamacje Allegro
                    <Badge
                      variant="secondary"
                      className={`ml-auto border-none font-bold rounded-full ${
                        (order.disputes?.filter(d => d.status === "ONGOING").length || 0) > 0
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {order.disputes?.length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 px-5">
                  {!order.disputes || order.disputes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2.5 opacity-20" />
                      <p className="text-xs">Brak sporów ani reklamacji powiązanych z tym zamówieniem.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {order.disputes.map((dispute) => (
                        <div
                          key={dispute.id}
                          className="p-3.5 rounded-xl border border-border/40 hover:border-red-500/30 bg-muted/10 hover:bg-red-500/5 transition-all duration-300 space-y-2.5 text-xs group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground/95 leading-tight">
                              {translateDisputeSubject(dispute.subject)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border-none ${
                                dispute.status === "ONGOING"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {dispute.status === "ONGOING" ? "W toku" : "Zamknięta"}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground/60 font-mono">
                            Kupujący: <span className="text-foreground/80">{dispute.buyer_login}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 font-mono">
                            Otwarty: {new Date(dispute.opened_date).toLocaleDateString("pl-PL")}
                          </p>
                          {dispute.decision_due_date && (
                            <p className="text-[10px] text-amber-400/80 font-mono font-semibold">
                              Termin decyzji: {new Date(dispute.decision_due_date).toLocaleDateString("pl-PL")}
                            </p>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center h-7 text-[10px] uppercase font-bold tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all duration-200"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setIsDisputeChatOpen(true);
                            }}
                          >
                            {dispute.status === "ONGOING" ? "Odpowiedz w sporze" : "Podgląd rozmowy"}
                          </Button>
                        </div>
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
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border/60 bg-white p-1 shrink-0 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/40">
                        <img
                          src={(item as any).imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain transition-transform duration-500 hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-center shrink-0 shadow-sm">
                        <Package className="h-8 w-8 text-muted-foreground/55" />
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug">{item.name}</p>
                      {item.selectedAdditionalServices && item.selectedAdditionalServices.length > 0 && (
                        <div className="mt-2 pl-2 text-xs text-muted-foreground border-l-2 border-primary/30 space-y-1">
                          {item.selectedAdditionalServices.map((service: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center gap-1.5">
                              <span className="inline-block bg-primary/10 text-primary font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                                Usługa dodatkowa
                              </span>
                              <span className="font-medium">
                                {service.name || service.definitionId}{" "}
                                {service.price && (
                                  <span className="text-foreground/75 font-semibold font-mono">
                                    ({service.price.amount} {service.price.currency} x{service.quantity || 1})
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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

        {/* ── TAB: Related Orders ── */}
        <TabsContent value="related_orders" className="mt-4">
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 bg-muted/20 border-b border-border/10">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider font-mono text-foreground/80">
                <ShoppingBag className="h-4 w-4 text-primary" /> Powiązane Zamówienia Klienta
                <span className="text-xs font-normal normal-case text-muted-foreground ml-2">
                  (Dopasowane po e-mail: <span className="font-semibold text-foreground/90 select-all">{order.buyer_email || "brak"}</span> lub loginie: <span className="font-semibold text-foreground/90 select-all">{order.buyer_login || "brak"}</span>)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-5">
              {!order.related_orders || order.related_orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-25" />
                  <p className="text-sm font-medium">Brak innych zamówień tego klienta w bazie danych.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                        <th className="pb-3 font-semibold">ID Zamówienia</th>
                        <th className="pb-3 font-semibold">Data zakupu</th>
                        <th className="pb-3 font-semibold">Kanał</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Wartość</th>
                        <th className="pb-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {order.related_orders.map((relOrder) => {
                        const integration = relOrder.service_integration;
                        const isCompleted = ["PICKED_LISTED", "SENT"].includes(relOrder.status);
                        
                        return (
                          <tr key={relOrder.id} className="group hover:bg-muted/10 transition-colors duration-200">
                            <td className="py-3.5 font-bold font-mono text-foreground/90 group-hover:text-primary transition-colors">
                              {relOrder.external_order_id ? relOrder.external_order_id.split("-").pop() : relOrder.id}
                            </td>
                            <td className="py-3.5 text-muted-foreground font-medium">
                              {format(new Date(relOrder.purchased_at), "dd.MM.yyyy HH:mm")}
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground/80">{integration?.name || "Ręczne"}</span>
                                <span className="text-[10px] text-muted-foreground/60 italic">({relOrder.buyer_login || "brak"})</span>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <Badge 
                                variant={isCompleted ? "default" : "outline"}
                                className={cn(
                                  "rounded-lg font-bold text-[9px] uppercase tracking-tighter h-5 px-1.5",
                                  isCompleted ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "border-primary/20 text-primary bg-primary/5"
                                )}
                              >
                                {relOrder.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 font-bold text-right text-foreground">
                              {relOrder.total_to_pay !== null && relOrder.total_to_pay !== undefined 
                                ? `${relOrder.total_to_pay.toFixed(2)} PLN`
                                : "—"
                              }
                            </td>
                            <td className="py-3.5 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10 transition-all px-0"
                                asChild
                              >
                                <Link href={`/orders/${relOrder.id}`} className="px-2.5 flex items-center justify-center h-full w-full">
                                  Szczegóły
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
      {selectedDispute && (
        <DisputeChatDialog
          isOpen={isDisputeChatOpen}
          onClose={() => { setIsDisputeChatOpen(false); setSelectedDispute(null); }}
          dispute={selectedDispute}
          onDisputeUpdated={fetchOrderDetails}
        />
      )}

      {/* ── PRINT-ONLY CONTAINER ── */}
      <div id="print-order-card" className="hidden print:block font-sans text-xs bg-white text-black p-4 max-w-[210mm] mx-auto">
        {/* Style block for print-specific styles (e.g. page margin, hiding non-print elements) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            html, body {
              height: 99%;
              overflow: hidden;
            }
            body {
              background-color: white !important;
              background-image: none !important;
              color: black !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden;
            }
            #print-order-card, #print-order-card * {
              visibility: visible;
            }
            #print-order-card {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              max-height: 297mm;
              margin: 0;
              padding: 0;
              box-shadow: none;
              border: none;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            @page {
              size: A4;
              margin: 0.8cm 1.0cm 0.8cm 1.0cm;
            }
          }
        `}} />

        {(() => {
          const da = order.delivery_address;
          const inv = order.invoice_address;

          const deliveryName = da
            ? formatName(da.first_name, da.last_name, da.company_name)
            : formatName(
                mappedDetails.delivery.address?.firstName,
                mappedDetails.delivery.address?.lastName,
                mappedDetails.delivery.address?.companyName
              );
          const deliveryStreet = da?.street || mappedDetails.delivery.address?.street;
          const deliveryZip = da?.zip_code || mappedDetails.delivery.address?.zipCode;
          const deliveryCity = da?.city || mappedDetails.delivery.address?.city;
          const deliveryCountry = da?.country_code || mappedDetails.delivery.address?.countryCode;
          const deliveryPhone = da?.phone_number || mappedDetails.delivery.address?.phoneNumber || (order as any).buyer_phone_number;

          const invoiceName = inv
            ? formatName(inv.first_name, inv.last_name, inv.company_name)
            : formatName(
                mappedDetails.invoice.address?.firstName,
                mappedDetails.invoice.address?.lastName,
                mappedDetails.invoice.address?.companyName
              );
          const invoiceTaxId = inv?.tax_id || mappedDetails.invoice.address?.taxId;
          const invoiceStreet = inv?.street || mappedDetails.invoice.address?.street;
          const invoiceZip = inv?.zip_code || mappedDetails.invoice.address?.zipCode;
          const invoiceCity = inv?.city || mappedDetails.invoice.address?.city;

          return (
            <>
              {/* Header: Logo, Title, Info */}
              <div className="flex justify-between items-start border-b-2 border-gray-900 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 40 40" className="h-9 w-9 text-indigo-600 fill-none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 12 12 C 12 6, 28 6, 28 16 C 28 26, 12 22, 12 30 C 12 34, 28 34, 28 30"
                      stroke="#4f46e5"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="28" cy="30" r="2.5" fill="#4f46e5" />
                  </svg>
                  <span className="font-bold tracking-tight text-xl text-gray-900">
                    Supp<span className="text-indigo-600">Sales</span>
                  </span>
                </div>
                <div className="text-right">
                  <h1 className="text-lg font-black tracking-tight text-gray-900">KARTA ZAMÓWIENIA</h1>
                  <p className="text-sm font-bold text-indigo-600 font-mono mt-0.5">#{order.external_order_id}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {order.id}</p>
                </div>
              </div>

              {/* Sub-header Metadata Row */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3 text-[10px]">
                <div>
                  <span className="text-gray-500 block uppercase font-bold tracking-wider">Kupujący (Login):</span>
                  <span className="font-bold text-gray-900 text-xs">{order.buyer_login || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold tracking-wider">Data zakupu:</span>
                  <span className="font-bold text-gray-900 text-xs">
                    {new Date(order.purchased_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold tracking-wider">Integracja / Źródło:</span>
                  <span className="font-bold text-gray-900 text-xs uppercase">
                    {order.integration?.name || order.service_integration?.name || "ZAMÓWIENIE RĘCZNE"}
                  </span>
                </div>
              </div>

              {/* Details Grid (Buyer/Delivery vs Invoice/Payment) */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                {/* Column 1: Delivery Details */}
                <div className="border border-gray-200 rounded-lg p-2.5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1 mb-1.5">
                    Adres Dostawy
                  </h3>
                  {mappedDetails.delivery.isPickupPoint ? (
                    <div className="space-y-1">
                      <div className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                        PUNKT ODBIORU: {mappedDetails.delivery.pickupPointName}
                      </div>
                      {(deliveryStreet || deliveryName) && (
                        <div className="space-y-0.5 text-gray-900 mt-1 text-[11px]">
                          {deliveryName && <p className="font-bold">{deliveryName}</p>}
                          {deliveryStreet && <p>{deliveryStreet}</p>}
                          {(deliveryZip || deliveryCity) && <p>{deliveryZip} {deliveryCity}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    (deliveryStreet || deliveryName) ? (
                      <div className="space-y-0.5 text-gray-900 text-[11px]">
                        {deliveryName && <p className="font-bold">{deliveryName}</p>}
                        {deliveryStreet && <p>{deliveryStreet}</p>}
                        {(deliveryZip || deliveryCity) && <p>{deliveryZip} {deliveryCity}</p>}
                        {deliveryCountry && (
                          <p className="text-[10px] text-gray-500 uppercase">{deliveryCountry}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">Brak adresu dostawy</p>
                    )
                  )}

                  {/* Delivery Method & Contact */}
                  <div className="mt-2 pt-1.5 border-t border-gray-100 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sposób wysyłki:</span>
                      <span className="font-bold text-gray-900 uppercase">{mappedDetails.delivery.methodName}</span>
                    </div>
                    {(order.buyer_email || deliveryPhone) && (
                      <div className="flex flex-col gap-0.5 text-[10px] text-gray-600 pt-1 border-t border-dashed border-gray-100 mt-1">
                        {order.buyer_email && <div>E-mail: <span className="font-mono text-gray-950 font-medium">{order.buyer_email}</span></div>}
                        {deliveryPhone && (
                          <div>Telefon: <span className="font-mono text-gray-950 font-bold text-xs">{deliveryPhone}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Invoice / Payment Info */}
                <div className="border border-gray-200 rounded-lg p-2.5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1 mb-1.5">
                      Rozliczenie i Faktura
                    </h3>
                    {(mappedDetails.invoice.required || inv) && (invoiceStreet || invoiceName || invoiceTaxId) ? (
                      <div className="space-y-0.5 text-gray-900 bg-amber-50/40 border border-amber-100 p-2 rounded-lg">
                        <div className="inline-block bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1.5 py-0.25 rounded mb-1 font-mono">
                          NIP: {invoiceTaxId || "Brak NIP"}
                        </div>
                        {invoiceName && <p className="font-bold text-[11px]">{invoiceName}</p>}
                        {invoiceStreet && <p className="text-[11px]">{invoiceStreet}</p>}
                        {(invoiceZip || invoiceCity) && <p className="text-[11px]">{invoiceZip} {invoiceCity}</p>}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic text-[11px] py-1">
                        Klient nie poprosił o fakturę VAT (Paragon).
                      </div>
                    )}
                  </div>

                  {/* Payment status, type, highlighted COD */}
                  <div className="mt-2 pt-1.5 border-t border-gray-100 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500">Płatność:</span>
                      <span className="font-bold text-gray-900 font-mono">
                        {mappedDetails.payment.provider} ({mappedDetails.payment.status})
                      </span>
                    </div>

                    {isCod ? (
                      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-1.5 mt-1.5 text-center shadow-sm">
                        <span className="block text-[10px] font-black text-red-600 uppercase tracking-widest">
                          ⚠️ PRZESYŁKA POBRANIOWA (COD) ⚠️
                        </span>
                        <span className="block text-xs font-black text-red-700 font-mono mt-0.5">
                          POBIERZ: {mappedDetails.payment.total}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-1 mt-1.5 text-center">
                        <span className="block text-[9px] font-bold text-green-700 uppercase tracking-wide">
                          ZAMÓWIENIE OPŁACONE (Z GÓRY)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Comments */}
              {mappedDetails.buyerComments && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-2 mb-3 rounded-r-lg">
                  <span className="block text-[10px] font-black uppercase text-yellow-800 tracking-wider mb-0.5">
                    Uwagi od kupującego:
                  </span>
                  <p className="text-xs font-semibold text-yellow-950 whitespace-pre-wrap leading-tight italic">
                    "{mappedDetails.buyerComments}"
                  </p>
                </div>
              )}

              {/* Product List Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 font-bold uppercase tracking-wider text-[9px] text-gray-600">
                      <th className="px-2 py-1 text-center w-8">LP.</th>
                      <th className="px-2 py-1">Nazwa produktu</th>
                      <th className="px-2 py-1 w-40">SKU / EAN</th>
                      <th className="px-2 py-1 text-center w-12">Ilość</th>
                      <th className="px-2 py-1 text-right w-20">Cena jedn.</th>
                      <th className="px-2 py-1 text-right w-20">Wartość</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {explodedLineItems.map((item: any, index) => {
                      const unitPriceFloat = parseFloat(item.price.replace(/[^\d.,]/g, "").replace(",", "."));
                      const lineVal = !isNaN(unitPriceFloat) ? (unitPriceFloat * item.quantity).toFixed(2) + " PLN" : item.price;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="px-2 py-1 text-center font-mono text-gray-500">{index + 1}</td>
                          <td className="px-2 py-1 font-medium text-gray-900 leading-tight">
                            <div>{item.name}</div>
                            {item.selectedAdditionalServices && item.selectedAdditionalServices.length > 0 && (
                              <div className="mt-1 pl-2 text-[10px] text-gray-600 border-l border-gray-300">
                                {item.selectedAdditionalServices.map((service: any, sIdx: number) => (
                                  <div key={sIdx}>
                                    [Usługa dodatkowa] {service.name || service.definitionId} (cena: {service.price?.amount} {service.price?.currency} x{service.quantity || 1})
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1 font-mono text-[10px] text-gray-500 space-y-0.5">
                            {item.sku && <div className="truncate">S: {item.sku}</div>}
                            {item.ean && <div className="truncate">E: {item.ean}</div>}
                          </td>
                          <td className="px-2 py-1 text-center font-black text-gray-900 text-xs">
                            {item.quantity}
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-gray-700">{item.price}</td>
                          <td className="px-2 py-1 text-right font-mono font-bold text-gray-900">{lineVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}

        {/* Pricing Summary Block */}
        <div className="grid grid-cols-2 gap-4 items-end mt-2 pt-2">
          <div>
            {/* Pusta sekcja po usunięciu podpisów */}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-right text-[11px]">
            <div className="flex justify-between px-2">
              <span className="text-gray-500">Wartość produktów:</span>
              <span className="font-mono text-gray-800">
                {(() => {
                  const totalFloat = parseFloat(mappedDetails.payment.total.replace(/[^\d.,]/g, "").replace(",", "."));
                  const shippingFloat = parseFloat(shippingCost || "0");
                  if (isNaN(totalFloat)) return "0.00 PLN";
                  if (isNaN(shippingFloat)) return totalFloat.toFixed(2) + " PLN";
                  return (totalFloat - shippingFloat).toFixed(2) + " PLN";
                })()}
              </span>
            </div>
            {hasShippingCost && (
              <div className="flex justify-between px-2">
                <span className="text-gray-500">Koszt wysyłki:</span>
                <span className="font-mono text-gray-800">{shippingCost} PLN</span>
              </div>
            )}
            <div className="flex justify-between items-center bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 mt-1">
              <span className="font-bold text-gray-900 text-xs uppercase font-mono">Do zapłaty (Razem):</span>
              <span className="font-mono font-black text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                {mappedDetails.payment.total}
              </span>
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div className="border-t border-gray-200 mt-5 pt-2 text-center text-[9px] text-gray-400 flex justify-between">
          <span>Wygenerowano automatycznie z systemu SuppSales</span>
          <span>Wydrukowano: {new Date().toLocaleString("pl-PL")}</span>
        </div>
      </div>
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
