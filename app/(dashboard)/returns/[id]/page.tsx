// src/app/(dashboard)/returns/[id]/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AllegroIcon, BaseLinkerIcon, EmpikIcon } from "@/components/shared/icons";

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md shadow-black/5 hover:shadow-black/10 shrink-0">
      <span className="text-primary/80 bg-white/5 p-1.5 rounded-lg border border-white/5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold font-mono">{label}</p>
        <p className="text-xs font-extrabold text-white truncate">{value}</p>
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

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .get<ReturnDetails>(`/returns/${id}`)
      .then((response) => setReturnData(response.data))
      .catch(() => toast.error("Nie udało się pobrać szczegółów zwrotu."))
      .finally(() => setIsLoading(false));
  }, [id]);

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

  return (
    <div className="space-y-6 pb-10">

      {/* ── BACK BUTTON ── */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-xs font-semibold text-muted-foreground hover:text-white gap-2 transition-all px-3 py-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do listy zwrotów
        </Button>
      </div>

      {/* ── HERO HEADER ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0c0f1d] via-[#111322] to-[#07080f] shadow-2xl shadow-black/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Icon + integration */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 border border-white/20 hover:border-rose-500/40 flex items-center justify-center shadow-lg shadow-black/30 backdrop-blur-xl transition-all duration-500 hover:scale-105 shrink-0">
                {!providerType && <ArrowRightLeft className="h-7 w-7 text-rose-400" />}
                {providerType === "ALLEGRO" && <AllegroIcon className="max-h-7 max-w-[80%] w-auto shrink-0" />}
                {providerType === "BASELINKER" && <BaseLinkerIcon className="max-h-7 max-w-[80%] w-auto shrink-0" />}
                {providerType === "EMPIK" && <EmpikIcon className="max-h-7 max-w-[80%] w-auto rounded shrink-0" />}
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold font-mono">
                  {returnData.service_integration?.name || "Brak integracji"}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <h1 className="text-xl font-black text-white leading-none tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                    #{returnData.external_return_id || returnData.reference_number || returnData.id.slice(0, 8)}
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

      {/* ── CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Podstawowe informacje */}
          <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl hover:border-white/20 transition-all duration-300">
            <CardContent className="p-5">
              <SectionHeader title="Informacje o zwrocie" icon={<Info className="h-3.5 w-3.5" />} />
              <div className="space-y-0">
                <InfoRow label="ID zwrotu" value={returnData.external_return_id} mono />
                <InfoRow label="Nr referencyjny" value={returnData.reference_number} mono />
                <InfoRow label="Status" value={statusCfg.label} />
                <InfoRow label="Login kupującego" value={returnData.buyer_login} />
                <InfoRow label="Data zgłoszenia" value={createdAt ? format(createdAt, "dd.MM.yyyy HH:mm") : null} />
                {reason && <InfoRow label="Powód zwrotu" value={String(reason)} />}
              </div>
            </CardContent>
          </Card>

          {/* Źródło integracji */}
          {returnData.service_integration && (
            <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl hover:border-white/20 transition-all duration-300">
              <CardContent className="p-5">
                <SectionHeader title="Źródło" icon={<Tag className="h-3.5 w-3.5" />} />
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

          {/* Powiązane zamówienie */}
          {returnData.order && (
            <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl hover:border-primary/20 transition-all duration-300 group cursor-pointer"
              onClick={() => router.push(`/orders/${returnData.order!.id}`)}>
              <CardContent className="p-5">
                <SectionHeader title="Powiązane zamówienie" icon={<Package className="h-3.5 w-3.5" />} />
                <div className="flex items-center justify-between mt-1 p-3 rounded-xl bg-primary/5 border border-primary/10 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-primary/60" />
                    <span className="text-sm font-bold font-mono text-primary">{returnData.order.external_order_id}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    <span className="hidden sm:inline">Otwórz</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">Kliknij, aby przejść do szczegółów zamówienia</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Zwrócone produkty (jeśli są w payload) */}
          {items.length > 0 && (
            <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl hover:border-white/20 transition-all duration-300">
              <CardContent className="p-5">
                <SectionHeader title="Zwrócone produkty" icon={<Package className="h-3.5 w-3.5" />} />
                <div className="space-y-3">
                  {items.map((item: any, idx: number) => {
                    const nameRaw = item.name || item.offer?.name || item.product?.name || item.title;
                    const name = typeof nameRaw === "string" ? nameRaw : nameRaw ? JSON.stringify(nameRaw) : `Produkt #${idx + 1}`;
                    const qtyRaw = item.quantity ?? item.qty ?? 1;
                    const qty = typeof qtyRaw === "object" ? JSON.stringify(qtyRaw) : String(qtyRaw);
                    const skuRaw = item.sku || item.offer?.id || item.product_id;
                    const sku = skuRaw ? (typeof skuRaw === "object" ? JSON.stringify(skuRaw) : String(skuRaw)) : null;
                    const priceRaw = item.price || item.unitPrice || item.price_brutto;
                    const price = priceRaw ? (typeof priceRaw === "object" ? JSON.stringify(priceRaw) : String(priceRaw)) : null;
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-200">
                        <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
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
              </CardContent>
            </Card>
          )}

          {/* Surowe dane z platformy (payload) */}
          <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl hover:border-white/20 transition-all duration-300">
            <CardContent className="p-5">
              <SectionHeader title="Szczegółowe dane z platformy" icon={<FileText className="h-3.5 w-3.5" />} />
              {Object.keys(payload).length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground/60 italic">Brak danych szczegółowych dla tego zwrotu.</p>
                </div>
              ) : (
                <div className="space-y-0 max-h-[500px] overflow-y-auto pr-1">
                  {Object.entries(payload).map(([key, val]) => (
                    <PayloadField key={key} label={key} value={val} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw JSON toggle */}
          <Card className="bg-[#0c0f1d]/50 border-white/10 backdrop-blur-xl shadow-xl">
            <CardContent className="p-5">
              <SectionHeader title="Surowy JSON (payload)" icon={<ExternalLink className="h-3.5 w-3.5" />} />
              <pre className="text-[10px] font-mono text-muted-foreground/70 bg-black/30 rounded-xl p-4 overflow-x-auto border border-white/5 max-h-[300px]">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
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
