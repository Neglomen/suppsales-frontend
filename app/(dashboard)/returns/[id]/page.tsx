// src/app/(dashboard)/returns/[id]/page.tsx
"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  ArrowRightLeft,
  User,
  Clock,
  Package,
  ExternalLink,
  Hash,
  FileText,
  Info,
  Tag,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Truck,
  MessageSquare,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  Mail,
  Link as LinkIcon,
  Phone,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AllegroIcon, BaseLinkerIcon, EmpikIcon } from "@/components/shared/icons";
import { ChatPanel } from "@/app/(dashboard)/orders/[id]/_components/chat-panel";
import { DisputeChatDialog, translateDisputeSubject } from "@/app/(dashboard)/orders/[id]/_components/dispute-chat-dialog";
import { ProcessingPanel } from "./_components/processing-panel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReturnOrderInfo {
  id: string;
  external_order_id: string;
}

interface ServiceIntegrationInfo {
  id: number;
  name: string;
  provider_type: string;
  external_user_id?: string | null;
}

interface ReturnDetails {
  id: string;
  external_return_id: string | null;
  reference_number: string | null;
  status: string;
  buyer_login: string | null;
  created_at_external: string;
  order: ReturnOrderInfo | null;
  integration_id: number | null;
  service_integration: ServiceIntegrationInfo | null;
  details_payload: Record<string, any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getIntegrationStyle = (providerType: string | undefined) => {
  switch (providerType?.toUpperCase()) {
    case "ALLEGRO":
      return { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" };
    case "BASELINKER":
      return { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" };
    case "EMPIK":
      return { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" };
    default:
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" };
  }
};

const getReturnStatusConfig = (status: string) => {
  switch (status?.toUpperCase()) {
    case "CREATED":
      return { label: "Utworzony", className: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: <AlertCircle className="h-4 w-4" />, dot: "bg-slate-400" };
    case "SENT":
      return { label: "Wysłany", className: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: <Truck className="h-4 w-4" />, dot: "bg-blue-400" };
    case "DELIVERED":
      return { label: "Dostarczony", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: <CheckCircle2 className="h-4 w-4" />, dot: "bg-indigo-400" };
    case "READY_FOR_PICKUP":
      return { label: "Gotowy do odbioru", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: <Package className="h-4 w-4" />, dot: "bg-yellow-400" };
    case "RECEIVED":
      return { label: "Odebrany", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 className="h-4 w-4" />, dot: "bg-emerald-400" };
    case "CANCELLED":
      return { label: "Anulowany", className: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: <XCircle className="h-4 w-4" />, dot: "bg-rose-500" };
    case "REFUNDED":
      return { label: "Zwrócono środki", className: "bg-teal-500/10 text-teal-400 border-teal-500/20", icon: <RefreshCw className="h-4 w-4" />, dot: "bg-teal-400" };
    default:
      return { label: status || "Nieznany", className: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: <AlertCircle className="h-4 w-4" />, dot: "bg-slate-400" };
  }
};

const getOrderStatusConfig = (status: string | undefined) => {
  if (!status) return { label: "Brak", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  switch (status.toUpperCase()) {
    case "NEW":
      return { label: "Nowe", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "PROCESSING":
      return { label: "W realizacji", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    case "READY_FOR_SHIPMENT":
      return { label: "Gotowe do wysyłki", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
    case "SENT":
    case "SHIPPED":
      return { label: "Wysłane", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "CANCELLED":
    case "CANCELED":
      return { label: "Anulowane", className: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
    default:
      return { label: status, className: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
  }
};

function getTrackingUrl(trackingNumber: string): string {
  const clean = trackingNumber.trim();
  if (/^\d{24}$/.test(clean)) {
    return `https://inpost.pl/sledzenie-przesylek?number=${clean}`;
  }
  if (/^\d{13,14}[A-Za-z]?$/.test(clean)) {
    return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${clean}`;
  }
  if (/^\d{10,11}$/.test(clean)) {
    return `https://sprawdz.dhl.com.pl/szukaj.aspx?m=0&num=${clean}`;
  }
  return `https://allegro.pl/allegrodelivery/sledzenie-paczki?numer=${clean}`;
}

const formatPrice = (price: any): string | null => {
  if (price === null || price === undefined) return null;
  if (typeof price === "object") {
    if (price.amount !== undefined && price.currency !== undefined) {
      return `${price.amount} ${price.currency}`;
    }
    if (price.amount !== undefined) {
      return `${price.amount}`;
    }
    return JSON.stringify(price);
  }
  return String(price);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl px-4 py-2.5 border border-slate-200/50 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm dark:shadow-md shadow-slate-200/20 dark:shadow-black/5 shrink-0">
      <span className="text-primary/80 bg-white dark:bg-white/5 p-1.5 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm dark:shadow-none">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60 dark:text-white/40 uppercase tracking-widest font-semibold font-mono">{label}</p>
        <p className="text-xs font-extrabold text-foreground dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}

// InfoRow helper
function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center gap-4 py-2.5 border-b border-border/20 last:border-0 hover:bg-muted/10 px-2 rounded-md transition-all duration-200">
      <span className="text-xs text-muted-foreground/80 shrink-0 font-medium">{label}</span>
      <span className={`text-xs font-semibold text-foreground text-right ${mono ? "font-mono tracking-tight text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/90 font-mono pb-2 mb-3.5 border-b border-border/20">
      {icon && <span className="text-primary/70">{icon}</span>}
      <span>{title}</span>
    </div>
  );
}

// ─── Payload field recursive renderer ─────────────────────────────────────────

function PayloadField({ label, value, depth = 0 }: { label: string; value: any; depth?: number }) {
  if (value === null || value === undefined) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return null;
    return (
      <div className={cn("mt-1", depth > 0 && "ml-3 pl-3 border-l border-border/20")}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">{label}</p>
        {entries.map(([k, v]) => (
          <PayloadField key={k} label={k} value={v} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <div className={cn("mt-1", depth > 0 && "ml-3 pl-3 border-l border-border/20")}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">{label}</p>
        {value.map((item, i) => (
          <PayloadField key={i} label={`[${i}]`} value={item} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-border/10 last:border-0 hover:bg-muted/10 px-1 rounded-md transition-all duration-200">
      <span className="text-[11px] text-muted-foreground/70 shrink-0 font-medium font-mono">{label}</span>
      <span className="text-[11px] font-semibold text-foreground/90 text-right font-mono break-all max-w-[60%]">{String(value)}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ReturnDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [returnData, setReturnData] = useState<ReturnDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States for associated order details
  const [orderData, setOrderData] = useState<any | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  // States for dispute dialog
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [isDisputeChatOpen, setIsDisputeChatOpen] = useState(false);

  const loadData = useCallback(() => {
    if (!id) return;
    api
      .get<ReturnDetails>(`/returns/${id}`)
      .then((response) => setReturnData(response.data))
      .catch(() => toast.error("Nie udało się pobrać szczegółów zwrotu."));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .get<ReturnDetails>(`/returns/${id}`)
      .then((response) => setReturnData(response.data))
      .catch(() => toast.error("Nie udało się pobrać szczegółów zwrotu."))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!returnData?.order?.id) {
      setOrderData(null);
      return;
    }
    setIsLoadingOrder(true);
    api
      .get<any>(`/orders/${returnData.order.id}`)
      .then((response) => setOrderData(response.data))
      .catch(() => toast.error("Nie udało się pobrać szczegółów powiązanego zamówienia."))
      .finally(() => setIsLoadingOrder(false));
  }, [returnData?.order?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nie znaleziono zwrotu.
      </div>
    );
  }

  const statusCfg = getReturnStatusConfig(returnData.status);
  const intStyle = getIntegrationStyle(returnData.service_integration?.provider_type);
  const providerType = returnData.service_integration?.provider_type;
  const createdAt = returnData.created_at_external ? new Date(returnData.created_at_external) : null;

  // Extract useful fields from payload
  const payload = returnData.details_payload || {};

  // Helper: safely convert any value to a displayable string
  const toStr = (val: any): string | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  // Try to find reason/comment/items in common payload structures
  const reasonRaw = payload.reason || payload.returnReason || payload.return_reason || null;
  const reason = toStr(reasonRaw);
  const items: any[] = payload.items || payload.lineItems || payload.products || payload.returnedItems || [];

  // refund amount — could be a nested object like {amount:"10.00", currency:"PLN"}
  const refundRaw = payload.refund?.amount ?? payload.refundAmount ?? payload.refund_amount ?? null;
  const refundAmount = refundRaw !== null ? toStr(refundRaw) : null;
  const refundCurrency =
    typeof payload.refund?.currency === "string"
      ? payload.refund.currency
      : typeof payload.currency === "string"
      ? payload.currency
      : "PLN";

  const otherOrders = (orderData?.related_orders || []).filter((o: any) => o.id !== orderData?.id);

  return (
    <div className="space-y-6 pb-10">

      {/* ── BACK BUTTON ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground gap-2 transition-all px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy zwrotów
        </Button>

        {returnData.order && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/orders/${returnData.order!.id}`)}
            className="text-xs font-semibold text-muted-foreground hover:text-primary gap-2 transition-all px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/40 hover:bg-primary/5"
          >
            <LinkIcon className="h-3.5 w-3.5 text-primary/60" />
            Otwórz kartę zamówienia
          </Button>
        )}
      </div>

      {/* ── HERO HEADER ── */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-[#0c0f1d] dark:via-[#111322] dark:to-[#07080f] shadow-xl dark:shadow-2xl shadow-slate-200/40 dark:shadow-black/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute inset-0 opacity-[0.01] dark:opacity-[0.03] pointer-events-none" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Icon + integration */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100/80 to-slate-50/50 dark:from-white/15 dark:to-white/5 border border-slate-200 dark:border-white/20 hover:border-rose-500/40 flex items-center justify-center shadow-md dark:shadow-lg shadow-slate-200/30 dark:shadow-black/30 backdrop-blur-xl transition-all duration-500 hover:scale-105 shrink-0">
                {!providerType && <ArrowRightLeft className="h-7 w-7 text-rose-400" />}
                {providerType === "ALLEGRO" && <AllegroIcon className="max-h-7 max-w-[80%] w-auto shrink-0" />}
                {providerType === "BASELINKER" && <BaseLinkerIcon className="max-h-7 max-w-[80%] w-auto shrink-0" />}
                {providerType === "EMPIK" && <EmpikIcon className="max-h-7 max-w-[80%] w-auto rounded shrink-0" />}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/60 dark:text-white/40 uppercase tracking-widest font-bold font-mono">
                  {returnData.service_integration?.name || "Brak integracji"}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <h1 className="text-xl font-black text-foreground dark:text-white leading-none tracking-tight dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                    #{returnData.details_payload?.referenceNumber || returnData.external_return_id || returnData.reference_number || returnData.id.slice(0, 8)}
                  </h1>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5",
                      statusCfg.className
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", statusCfg.dot)} />
                    {statusCfg.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2 md:ml-auto">
              {returnData.buyer_login && (
                <StatPill icon={<User className="h-4 w-4" />} label="Kupujący" value={returnData.buyer_login} />
              )}
              {createdAt && (
                <StatPill icon={<Clock className="h-4 w-4" />} label="Data utworzenia" value={format(createdAt, "dd.MM.yyyy HH:mm")} />
              )}
              {refundAmount && (
                <StatPill icon={<ArrowRightLeft className="h-4 w-4" />} label="Kwota zwrotu" value={`${refundAmount} ${refundCurrency}`} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <Tabs defaultValue="details" className="w-full space-y-6">
        <TabsList className="bg-slate-100/80 dark:bg-[#0c0f1d]/60 border border-slate-200/80 dark:border-white/10 p-1 rounded-xl">
          <TabsTrigger value="details" className="text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Szczegóły Zwrotu i Zamówienia
          </TabsTrigger>
          <TabsTrigger value="communication" className="hidden md:flex text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground items-center gap-2">
            Dyskusje i Wiadomości
            {orderData?.disputes?.filter((d: any) => d.status === "ONGOING").length > 0 && (
              <Badge className="bg-red-500 text-white font-mono text-[9px] px-1.5 py-0.5 animate-pulse">
                {orderData.disputes.filter((d: any) => d.status === "ONGOING").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing" className="hidden md:flex text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Przetwarzanie Zwrotu (BOK)
          </TabsTrigger>
          <TabsTrigger value="order-logs" className="text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Logi Zamówienia
          </TabsTrigger>
          {otherOrders.length > 0 && (
            <TabsTrigger value="other-orders" className="text-xs font-semibold px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Inne Zamówienia ({otherOrders.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── TAB 1: DETAILS ── */}
        <TabsContent value="details" className="space-y-6 outline-none focus:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Return Info */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Return Info Card */}
              <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
                <CardContent className="p-5">
                  <SectionHeader title="Informacje o zwrocie" icon={<Info className="h-3.5 w-3.5" />} />
                  <div className="space-y-0">
                    <InfoRow label="ID zwrotu" value={returnData.external_return_id} mono />
                    <InfoRow label="Nr referencyjny" value={returnData.details_payload?.referenceNumber || returnData.reference_number} mono />
                    <InfoRow label="Status" value={statusCfg.label} />
                    <InfoRow label="Login kupującego" value={returnData.buyer_login} />
                    <InfoRow label="Data zgłoszenia" value={createdAt ? format(createdAt, "dd.MM.yyyy HH:mm") : null} />
                    {reason && <InfoRow label="Powód zwrotu" value={String(reason)} />}
                  </div>
                </CardContent>
              </Card>

              {/* Returned products */}
              <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
                <CardContent className="p-5">
                  <SectionHeader title="Zwrócone produkty" icon={<Package className="h-3.5 w-3.5" />} />
                  {items.length > 0 ? (
                    <div className="space-y-3">
                      {items.map((item: any, idx: number) => {
                        const nameRaw = item.name || item.offer?.name || item.product?.name || item.title;
                        const name = typeof nameRaw === "string" ? nameRaw : nameRaw ? JSON.stringify(nameRaw) : `Produkt #${idx + 1}`;
                        const qtyRaw = item.quantity ?? item.qty ?? 1;
                        const qty = typeof qtyRaw === "object" ? JSON.stringify(qtyRaw) : String(qtyRaw);
                        const skuRaw = item.sku || item.offer?.id || item.product_id;
                        const sku = skuRaw ? (typeof skuRaw === "object" ? JSON.stringify(skuRaw) : String(skuRaw)) : null;
                        const priceRaw = item.price || item.unitPrice || item.price_brutto;
                        const price = formatPrice(priceRaw);
                        return (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground/95 truncate">{name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {sku && <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-mono bg-primary/5 text-primary border-primary/10">{sku}</Badge>}
                                <span className="text-[10px] text-muted-foreground">Ilość: <span className="font-bold text-foreground/80">{qty}</span></span>
                                {price && <span className="text-[10px] text-muted-foreground">Cena: <span className="font-bold text-foreground/80">{price}</span></span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Brak pozycji w danych zwrotu.</p>
                  )}
                </CardContent>
              </Card>

              {/* Integration source */}
              {returnData.service_integration && (
                <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-5">
                    <SectionHeader title="Źródło integracji" icon={<Tag className="h-3.5 w-3.5" />} />
                    <div className="flex items-center gap-3 mt-1">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", intStyle.bg, intStyle.border)}>
                        <span className={cn("text-sm font-black font-mono", intStyle.text)}>
                          {providerType?.[0] || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{returnData.service_integration.name}</p>
                        <p className="text-[11px] text-muted-foreground italic truncate">{returnData.service_integration.external_user_id || "Brak konta"}</p>
                        <Badge variant="outline" className={cn("text-[9px] font-bold mt-1 uppercase tracking-widest", intStyle.text, intStyle.border)}>
                          {providerType}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Order Details */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {isLoadingOrder ? (
                <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </Card>
              ) : orderData ? (
                <>
                  {/* Order Overview Card */}
                  <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-border/20 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-bold font-mono text-foreground dark:text-white">Powiązane zamówienie #{orderData.external_order_id}</h3>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline" className={cn("text-[9px] font-bold", getOrderStatusConfig(orderData.status).className)}>
                            Status: {getOrderStatusConfig(orderData.status).label}
                          </Badge>
                          {orderData.fulfillment_status && (
                            <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20">
                              Realizacja: {orderData.fulfillment_status}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Order details columns */}
                        <div className="space-y-3">
                          <SectionHeader title="Dane Zamówienia i Płatności" icon={<CreditCard className="h-3 w-3" />} />
                          <div className="space-y-0 text-xs">
                            <div className="flex justify-between py-2 border-b border-slate-200/40 dark:border-white/5">
                              <span className="text-muted-foreground">Data zakupu</span>
                              <span className="font-semibold text-foreground dark:text-white">{orderData.purchased_at ? format(new Date(orderData.purchased_at), "dd.MM.yyyy HH:mm") : "—"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-200/40 dark:border-white/5">
                              <span className="text-muted-foreground">Kwota łączna</span>
                              <span className="font-extrabold text-foreground dark:text-white text-sm">{orderData.total_to_pay || "—"} PLN</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-200/40 dark:border-white/5">
                              <span className="text-muted-foreground">Metoda płatności</span>
                              <span className="font-semibold text-foreground dark:text-white">{orderData.payment_type || "—"}</span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span className="text-muted-foreground">Status płatności</span>
                              <span className={cn(
                                "font-bold",
                                orderData.payment_status === "COMPLETED" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                              )}>{orderData.payment_status === "COMPLETED" ? "Opłacone" : orderData.payment_status || "—"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Delivery address details */}
                        <div className="space-y-3">
                          <SectionHeader title="Adres Dostawy" icon={<Truck className="h-3 w-3" />} />
                          <div className="space-y-2 text-xs">
                            {orderData.delivery_address ? (
                              <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/40 dark:border-white/5">
                                <p className="font-bold text-foreground dark:text-white">
                                  {orderData.delivery_address.first_name} {orderData.delivery_address.last_name}
                                </p>
                                <p className="text-foreground/80 dark:text-white/70 mt-1 flex items-start gap-1">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span>{orderData.delivery_address.street}, {orderData.delivery_address.zip_code} {orderData.delivery_address.city}</span>
                                </p>
                                {orderData.delivery_address.phone_number && (
                                  <p className="text-foreground/80 dark:text-white/70 mt-1 flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span>{orderData.delivery_address.phone_number}</span>
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground/60 italic">Brak adresu dostawy w zamówieniu</p>
                            )}

                            {/* Tracking Numbers */}
                            {orderData.tracking_numbers && orderData.tracking_numbers.length > 0 && (
                              <div className="pt-2">
                                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider mb-1">Numery śledzenia</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {orderData.tracking_numbers.map((tn: string, i: number) => (
                                    <a
                                      key={i}
                                      href={getTrackingUrl(tn)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[10px] font-mono text-primary transition-colors"
                                    >
                                      {tn}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Items Card */}
                  <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300">
                    <CardContent className="p-5">
                      <SectionHeader title="Przedmioty w Zamówieniu (Porównanie ze zwrotem)" icon={<ShoppingBag className="h-3.5 w-3.5" />} />
                      {orderData.line_items && orderData.line_items.length > 0 ? (
                        <div className="space-y-3">
                          {orderData.line_items.map((item: any, idx: number) => {
                            const isReturned = items.some(retItem => {
                              const retSku = retItem.sku || retItem.offer?.id || retItem.product_id;
                              const itemSku = item.sku || item.offer_id;
                              return retSku && itemSku && String(retSku) === String(itemSku);
                            });

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-start justify-between gap-3 p-3 rounded-xl border transition-all duration-200",
                                  isReturned
                                    ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
                                    : "bg-slate-50/50 dark:bg-white/5 border-slate-200/30 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                                )}
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border",
                                    isReturned ? "bg-rose-500/10 border-rose-500/20" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                  )}>
                                    <ShoppingBag className={cn("h-5 w-5", isReturned ? "text-rose-400" : "text-muted-foreground/60")} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground/95 truncate">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-muted-foreground">
                                      {item.sku && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-mono bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10">
                                          SKU: {item.sku}
                                        </Badge>
                                      )}
                                      <span>Ilość: <span className="font-bold text-foreground/80">{item.quantity}</span></span>
                                      {item.price && <span>Cena: <span className="font-bold text-foreground/80">{formatPrice(item.price)}</span></span>}
                                    </div>
                                  </div>
                                </div>

                                {isReturned && (
                                  <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-bold uppercase tracking-wider shrink-0 mt-1">
                                    Zwrócony
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center py-4">Brak pozycji w tym zamówieniu.</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl p-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Brak powiązanego zamówienia w bazie danych.</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Ten zwrot nie jest przypisany do żadnej transakcji w systemie.</p>
                </Card>
              )}
            </div>
          </div>

          {/* ── COLLAPSIBLE PLATFORM DATA ── */}
          <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl mt-6">
            <CardContent className="p-0">
              <details className="group">
                <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-[10px] uppercase tracking-widest text-muted-foreground/90 font-mono select-none list-none outline-none">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary/70" />
                    <span>Szczegółowe dane techniczne z platformy (payload JSON)</span>
                  </div>
                  <ChevronRight className="h-4 w-4 transition-transform duration-300 group-open:rotate-90 text-muted-foreground" />
                </summary>
                <div className="px-5 pb-5 pt-1 border-t border-slate-200/40 dark:border-white/5 space-y-6">
                  {Object.keys(payload).length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic py-4 text-center">Brak danych szczegółowych dla tego zwrotu.</p>
                  ) : (
                    <>
                      <div className="space-y-0 max-h-[400px] overflow-y-auto pr-1">
                        {Object.entries(payload).map(([key, val]) => (
                          <PayloadField key={key} label={key} value={val} />
                        ))}
                      </div>
                      <div className="pt-4 border-t border-slate-200/40 dark:border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 font-mono">Surowy JSON (payload)</p>
                        <pre className="text-[10px] font-mono text-foreground/70 dark:text-muted-foreground/70 bg-slate-100 dark:bg-black/30 rounded-xl p-4 overflow-x-auto border border-slate-200/60 dark:border-white/5 max-h-[300px]">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              </details>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: COMMUNICATION ── */}
        <TabsContent value="communication" className="space-y-6 outline-none focus:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Direct messages chat */}
            <div className="lg:col-span-2">
              <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl flex flex-col h-full min-h-[500px]">
                <CardContent className="p-5 flex-1 flex flex-col min-h-[450px]">
                  <SectionHeader title="Historia wiadomości z klientem" icon={<MessageSquare className="h-3.5 w-3.5" />} />
                  <div className="flex-1 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col min-h-[400px]">
                    {returnData.buyer_login && returnData.integration_id && returnData.order?.id ? (
                      <ChatPanel
                        buyerLogin={returnData.buyer_login}
                        integrationId={returnData.integration_id}
                        currentOrderId={returnData.order.id}
                        myLogin={returnData.service_integration?.external_user_id || null}
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <Mail className="h-10 w-10 text-muted-foreground/20 mb-2" />
                        <p className="text-sm font-semibold">Brak możliwości uruchomienia czatu</p>
                        <p className="text-xs text-muted-foreground/50 max-w-xs mt-1">
                          Do otwarcia wątków wymagany jest login kupującego, identyfikator integracji oraz powiązane zamówienie.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Allegro disputes list */}
            <div className="lg:col-span-1">
              <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl h-full">
                <CardContent className="p-5">
                  <SectionHeader title="Spory i Dyskusje (Allegro)" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
                  
                  {isLoadingOrder ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : orderData?.disputes && orderData.disputes.length > 0 ? (
                    <div className="space-y-4 mt-2">
                      {orderData.disputes.map((dispute: any) => {
                        const isOngoing = dispute.status === "ONGOING";
                        return (
                          <div
                            key={dispute.id}
                            className={cn(
                              "p-4 rounded-xl border transition-all duration-300 bg-slate-50 dark:bg-white/5",
                              isOngoing 
                                ? "border-red-500/30 hover:border-red-500/50 shadow-md shadow-red-500/5" 
                                : "border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                            )}
                          >
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-[10px] text-muted-foreground/60 dark:text-white/40 font-semibold font-mono uppercase tracking-wider">{dispute.type}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] font-bold uppercase",
                                  isOngoing 
                                    ? "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20" 
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                )}
                              >
                                {isOngoing ? "W toku" : "Rozwiązana"}
                              </Badge>
                            </div>

                            <h4 className="text-xs font-extrabold text-foreground dark:text-white mt-2 leading-snug">
                              {translateDisputeSubject(dispute.subject)}
                            </h4>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-3 pt-3 border-t border-slate-200/40 dark:border-white/5">
                              <div className="flex flex-col">
                                <span>Kupujący: <span className="font-bold text-foreground/80 dark:text-white/80 font-mono">{dispute.buyer_login}</span></span>
                                <span className="mt-0.5">Otwarto: {format(new Date(dispute.opened_date), "dd.MM.yyyy")}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedDispute(dispute);
                                  setIsDisputeChatOpen(true);
                                }}
                                className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-foreground dark:hover:text-white border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 gap-1"
                              >
                                Otwórz dyskusję
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground/60">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs italic">Brak sporów i dyskusji Allegro dla powiązanego zamówienia.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6 outline-none focus:ring-0">
          <ProcessingPanel
            returnData={returnData}
            orderData={orderData}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="order-logs" className="space-y-6 outline-none focus:ring-0">
          <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
            <CardContent className="p-5">
              <SectionHeader title="Logi i Historia Zamówienia" icon={<Clock className="h-3.5 w-3.5" />} />
              {orderData?.event_logs && orderData.event_logs.length > 0 ? (
                <div className="relative border-l border-slate-200 dark:border-white/10 ml-3 pl-6 space-y-6 py-2">
                  {orderData.event_logs.map((log: any) => (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-primary/40 ring-4 ring-slate-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                      
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-foreground dark:text-white leading-snug">
                            {log.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                            <Badge variant="outline" className="px-1.5 h-4 bg-primary/5 text-primary border-primary/10">
                              Źródło: {log.source}
                            </Badge>
                            <Badge variant="outline" className="px-1.5 h-4 bg-slate-100 dark:bg-white/5 text-muted-foreground border-slate-200 dark:border-white/10">
                              Typ: {log.type}
                            </Badge>
                          </div>
                          {log.details_payload && Object.keys(log.details_payload).length > 0 && (
                            <details className="mt-2 text-[10px] text-muted-foreground cursor-pointer">
                              <summary className="hover:text-foreground transition-colors select-none font-bold">Pokaż szczegóły logu</summary>
                              <pre className="mt-1 p-2 bg-black/40 rounded border border-white/5 font-mono overflow-x-auto text-[9px] max-w-full">
                                {JSON.stringify(log.details_payload, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">
                          {format(new Date(log.occurred_at), "dd.MM.yyyy HH:mm:ss")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-6">Brak logów zdarzeń dla tego zamówienia.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {otherOrders.length > 0 && (
          <TabsContent value="other-orders" className="space-y-6 outline-none focus:ring-0">
            <Card className="bg-white/60 dark:bg-[#0c0f1d]/50 border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl">
              <CardContent className="p-5">
                <SectionHeader title="Inne Zamówienia Tego Klienta" icon={<ShoppingBag className="h-3.5 w-3.5" />} />
                <div className="space-y-4">
                  {otherOrders.map((ord: any) => (
                    <div
                      key={ord.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all duration-300"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground dark:text-white font-mono">
                            #{ord.external_order_id}
                          </span>
                          <Badge variant="outline" className={cn("text-[9px] font-bold", getOrderStatusConfig(ord.status).className)}>
                            {getOrderStatusConfig(ord.status).label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>Data zakupu: {ord.purchased_at ? format(new Date(ord.purchased_at), "dd.MM.yyyy HH:mm") : "—"}</span>
                          <span>•</span>
                          <span>Metoda: {ord.payment_type || "—"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Wartość</p>
                          <p className="text-sm font-extrabold text-foreground dark:text-white">{ord.total_to_pay} PLN</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/orders/${ord.id}`)}
                          className="text-xs font-semibold border-slate-200 dark:border-white/10 hover:bg-primary/5 hover:text-primary transition-all rounded-xl"
                        >
                          Pokaż Zamówienie
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── DISPUTE CHAT DIALOG ── */}
      {selectedDispute && (
        <DisputeChatDialog
          isOpen={isDisputeChatOpen}
          onClose={() => {
            setIsDisputeChatOpen(false);
            setSelectedDispute(null);
          }}
          dispute={selectedDispute}
          onDisputeUpdated={() => {
            if (returnData?.order?.id) {
              api.get<any>(`/orders/${returnData.order.id}`).then((response) => setOrderData(response.data));
            }
          }}
        />
      )}
    </div>
  );
}

export default function ReturnDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ReturnDetailsContent />
    </Suspense>
  );
}
