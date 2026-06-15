"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { useShippingConfig } from "../_hooks/use-shipping-config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  PackageOpen,
  FileText,
  Loader2,
  AlertCircle,
  Info,
  Home,
  File as FileIcon,
  StickyNote,
  CreditCard,
  CheckCircle,
  MessageSquare,
  Package,
  PencilRuler,
  PlusCircle,
  X,
  DivideCircle,
  Edit,
  Truck,
  RefreshCcw,
  ChevronDown,
  BadgeCheck,
  MapPin,
  Calendar,
  Clock,
  Box,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ApaczkaService {
  id: string;
  name: string;
  courier_name: string;
  description: string;
}

interface ValuationItem {
  id: string;
  name: string;
  courier_name: string;
  price_net: number;
  price_gross: number;
}
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "../../orders/[id]/_components/chat-panel";
import { Thread } from "@/types/thread";
import { Shipment } from "@/types/shipment";
import { AdditionalServiceMapping } from "@/types/additional-service-mapping";
import { useOrderShipments } from "../_hooks/use-order-shipments";
import { ShipmentHistory } from "./ShipmentHistory";
import { cn, downloadFileFromBase64 } from "@/lib/utils";
import { SUUS_PACKAGE_CODES } from "@/lib/courier-data";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ServiceIntegration } from "@/types/service-integration";
import { ProductMappingDialog } from "./product-mapping-dialog";
import { EditAddressDialog } from "./EditAddressDialog";
import { EditInvoiceDialog } from "./EditInvoiceDialog";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";
import { AllegroIcon, BaseLinkerIcon, EmpikIcon } from "@/components/shared/icons";

interface OrderInfoProps {
  order: MarketplaceOrder;
  productMappings?: Record<string, any>;
  erpIntegration?: ServiceIntegration;
  refetchMappings?: () => void;
  courierProvider?: string;
  onOrderUpdate?: (updatedOrder: MarketplaceOrder) => void;
  refetchOrder?: () => void;
  isFetchingOrder?: boolean;
  hideHeader?: boolean;
  onlyHeader?: boolean;
  showPickupPoint?: boolean;
  overridePointId?: string;
  setOverridePointId?: (id: string) => void;
  subiektStock?: any;
}

const OrderInfoCard = ({
  order,
  productMappings,
  erpIntegration,
  refetchMappings,
  courierProvider,
  onOrderUpdate,
  refetchOrder,
  isFetchingOrder,
  hideHeader = false,
  onlyHeader = false,
  showPickupPoint = false,
  overridePointId = "",
  setOverridePointId,
  subiektStock,
}: OrderInfoProps) => {
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const handleCreateInvoice = async () => {
    try {
      setIsCreatingInvoice(true);
      const mappings: Record<string, string> = {};
      let missingMapping = false;

      for (const item of lineItems) {
        const offerId = item.offer?.id || item.product_id;
        if (!offerId) continue;
        const mappedSymbol = productMappings?.[offerId]?.erp_product_symbol;
        if (!mappedSymbol) {
          missingMapping = true;
          toast.error(`Brak mapowania dla produktu: ${item.offer?.name || item.name}`);
        } else {
          mappings[offerId] = mappedSymbol;
        }
      }

      if (missingMapping) {
        setIsCreatingInvoice(false);
        return;
      }

      const pollTaskStatus = (taskId: string): Promise<{ document_number: string }> => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 5 * 60 * 1000; // 5 minutes timeout
          const interval = setInterval(async () => {
            try {
              if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error("Przekroczono limit czasu oczekiwania na wystawienie faktury."));
                return;
              }
              const statusRes = await api.get(`/tasks/${taskId}/status`);
              const data = statusRes.data;
              if (data.status === "SUCCESS") {
                clearInterval(interval);
                resolve({
                  document_number: data.result?.document_number || "Dokument sprzedaży",
                });
              } else if (data.status === "FAILURE" || data.status === "FAILED") {
                clearInterval(interval);
                reject(new Error(data.result?.error || "Nieznany błąd podczas tworzenia faktury w Subiekcie GT."));
              }
            } catch (err: any) {
              clearInterval(interval);
              const errMsg = err.response?.data?.detail || err.message || "Błąd połączenia z serwerem";
              reject(new Error(errMsg));
            }
          }, 2000);
        });
      };

      const triggerPromise = async () => {
        const res = await api.post(`/sales-invoices/orders/${order.id}/create-sales-invoice`, {
          product_mappings: mappings,
        });
        const taskId = res.data.task_id;
        if (!taskId) {
          throw new Error("Nie otrzymano identyfikatora zadania z serwera.");
        }
        const pollResult = await pollTaskStatus(taskId);
        
        let updatedOrder = order;
        if (refetchOrder) {
          await refetchOrder();
        }
        try {
          const freshRes = await api.get(`/orders/${order.id}`);
          if (freshRes.data) {
            updatedOrder = freshRes.data;
          }
        } catch (e) {
          console.error("Failed to fetch fresh order details directly", e);
        }
        if (onOrderUpdate && updatedOrder) {
          onOrderUpdate(updatedOrder);
        }

        return pollResult;
      };

      await toast.promise(
        triggerPromise(),
        {
          loading: "Wystawianie faktury w Subiekt GT...",
          success: (res: any) => (
            <div className="flex flex-col gap-1 text-left">
              <span className="font-semibold text-emerald-400">Faktura wystawiona pomyślnie!</span>
              <span className="text-xs text-slate-300">Numer: <strong className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-white ml-1">{res.document_number}</strong></span>
            </div>
          ),
          error: (err: any) => {
            const detail = err.response?.data?.detail;
            const errMsg = detail
              ? (typeof detail === "object" && detail.message ? detail.message : (typeof detail === "string" ? detail : err.message))
              : (err.message || "Nieznany błąd");
            return (
              <div className="flex flex-col gap-1 text-left">
                <span className="font-semibold text-rose-400">Błąd wystawiania faktury</span>
                <span className="text-xs text-slate-300">{errMsg}</span>
              </div>
            );
          },
        },
        {
          style: {
            minWidth: "340px",
            background: "#0f172a",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)",
          },
          success: {
            duration: 6000,
            icon: "✅",
          },
          error: {
            duration: 8000,
            icon: "❌",
          },
        }
      );

    } catch (err: any) {
      // Errors handled inside toast.promise do not need extra toasts, 
      // but just in case triggering itself fails outside triggerPromise:
      if (err.message && !err.message.includes("Błąd wystawiania faktury")) {
        toast.error(err.message || "Błąd podczas tworzenia faktury.");
      }
    } finally {
      setIsCreatingInvoice(false);
    }
  };
  const payload = order.details_payload || {};
  const providerType = order.service_integration?.provider_type;

  const deliveryInfo = useMemo(() => {
    // Prefer normalized delivery_address if it exists
    if (order.delivery_address) {
      const da = order.delivery_address;
      const street = da.street;
      const zipCode = da.zip_code || (da as any).zipCode;
      const city = da.city;
      const firstName = da.first_name || (da as any).firstName || "";
      const lastName = da.last_name || (da as any).lastName || "";
      const name = `${firstName} ${lastName}`.trim() || da.company_name || "";
      return { name, street, zipCode, city, phone: da.phone_number };
    }
    // Fallback to legacy mapping
    const da = payload.delivery?.address || payload;
    const firstName = da.firstName || "";
    const lastName = da.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || payload.delivery_fullname || "";
    const street = da.street || payload.delivery_address;
    const zipCode = da.zipCode || payload.delivery_postcode;
    const city = da.city || payload.delivery_city;
    return { name, street, zipCode, city, phone: da.phoneNumber || payload.phone };
  }, [order.delivery_address, payload]);

  const pickupPointInfo = useMemo(() => {
    if (order.pickup_point) {
      return order.pickup_point;
    }
    const legacyPickup = payload.delivery?.pickupPoint || (payload.delivery_point_id ? payload : null);
    if (legacyPickup) {
      return {
        name: legacyPickup.name || legacyPickup.delivery_point_name,
        address: {
          street: legacyPickup.address?.street || legacyPickup.delivery_point_address,
          zipCode: legacyPickup.address?.zipCode || legacyPickup.delivery_point_postcode,
          city: legacyPickup.address?.city || legacyPickup.delivery_point_city,
        }
      };
    }
    return null;
  }, [order.pickup_point, payload]);

  const invoiceInfo = useMemo(() => {
    // Check if invoice is required
    const inv = order.invoice_address;
    const legacyInv = payload.invoice || (payload.want_invoice === "1" ? payload : null);
    const hasInvoice = !!(inv || legacyInv?.required || legacyInv?.invoice_company);

    if (!hasInvoice) {
      return { hasInvoice: false };
    }

    if (inv) {
      const firstName = inv.first_name || (inv as any).firstName || "";
      const lastName = inv.last_name || (inv as any).lastName || "";
      const companyName = inv.company_name || (inv as any).companyName || "";
      const name = companyName.trim() || `${firstName} ${lastName}`.trim();
      const taxId = inv.tax_id || (inv as any).taxId;
      const street = inv.street;
      const zipCode = inv.zip_code || (inv as any).zipCode;
      const city = inv.city;
      return { hasInvoice: true, name, taxId, street, zipCode, city };
    }

    const legacyInvAddress = legacyInv.address || legacyInv;
    const firstName = legacyInvAddress?.naturalPerson?.firstName || legacyInvAddress?.firstName || "";
    const lastName = legacyInvAddress?.naturalPerson?.lastName || legacyInvAddress?.lastName || "";
    const companyName = legacyInvAddress?.company?.name || legacyInv?.invoice_company || "";
    const name = companyName.trim() || `${firstName} ${lastName}`.trim();
    const taxId = legacyInvAddress?.company?.taxId || legacyInvAddress?.taxId || legacyInv?.invoice_nip;
    const street = legacyInvAddress.street || legacyInv.invoice_address;
    const zipCode = legacyInvAddress.zipCode || legacyInv.invoice_postcode;
    const city = legacyInvAddress.city || legacyInv.invoice_city;

    return { hasInvoice: true, name, taxId, street, zipCode, city };
  }, [order.invoice_address, payload]);

  const paymentInfo = useMemo(() => {
    const isCod = order.payment_type === "CASH_ON_DELIVERY" ||
                  payload.payment?.type === "CASH_ON_DELIVERY" || 
                  String(payload.payment_method_cod) === "1" ||
                  payload.payment_type?.toLowerCase().includes("pobran");

    if (isCod) {
      const amount = order.total_to_pay || payload.cashOnDelivery?.amount || payload.payment_done;
      return { type: "cod", label: "Pobranie", amount, variant: "warning" as const, icon: <CreditCard className="h-3.5 w-3.5" />, color: "text-amber-400" };
    }
    const amount = order.total_to_pay || payload.summary?.totalToPay?.amount || payload.payment_done;
    return { type: "paid", label: "Opłacone", amount, variant: "success" as const, icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-emerald-400" };
  }, [order.payment_type, order.total_to_pay, payload]);

  const lineItems = useMemo(() => {
    if (providerType === "EMPIK") {
      const currency = payload.currency_iso_code || "PLN";
      return (payload.order_lines || []).map((line: any) => {
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
          offer: {
            id: line.offer_id?.toString() || line.offer_sku,
            name: line.product_title,
          },
          imageUrl: imageUrl,
          sku: line.offer_sku,
        };
      });
    }
    return order.line_items || payload.lineItems || payload.products || [];
  }, [order.line_items, payload, providerType]);

  const message = payload.messageToSeller?.text || payload.user_comments || payload.message_to_seller;

  return (
    <div className={cn(!onlyHeader && "space-y-6")}>
      {/* ── HERO HEADER (Premium Design) ── */}
      {!hideHeader && (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800/90 to-slate-900 shadow-xl shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative p-5">
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              {/* Icon + integration */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
                  {!providerType && <Package className="h-6 w-6 text-white/70" />}
                  {providerType === "ALLEGRO" && <AllegroIcon className="h-9 w-9" />}
                  {providerType === "BASELINKER" && <BaseLinkerIcon className="h-9 w-9 rounded" />}
                  {providerType === "EMPIK" && <EmpikIcon className="h-9 w-9 rounded" />}
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">
                    {order.service_integration?.name || "Zamówienie ręczne"}
                  </p>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-white leading-tight">
                      #{order.external_order_id}
                    </h1>
                    {refetchOrder && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
                        onClick={() => refetchOrder()}
                        disabled={isFetchingOrder}
                        title="Odśwież zamówienie"
                      >
                        <RefreshCcw className={cn("h-3.5 w-3.5", isFetchingOrder && "animate-spin")} />
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 font-mono mt-0.5">{order.buyer_login}</p>
                </div>
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap gap-2 md:ml-auto">
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10">
                  <span className="text-white/50"><CreditCard className="h-3 w-3" /></span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">Kwota</p>
                    <p className="text-xs font-semibold text-white truncate">{paymentInfo.amount} {payload.currency || "PLN"}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10 ${paymentInfo.color}`}>
                  <span className={paymentInfo.color}>{paymentInfo.icon}</span>
                  <div>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">Status</p>
                    <p className="text-xs font-semibold truncate">{paymentInfo.label}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!onlyHeader && (
        <div className="space-y-6">
          {/* ── ADDRESSES & INFO ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dostawa */}
            <Card className="border-border/60 shadow-sm bg-card/40">
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5" /> Adres Dostawy
                  </p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditAddressOpen(true)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-sm space-y-3">
                  {/* Dane odbiorcy - zawsze widoczne i czytelne */}
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-200">{deliveryInfo.name || "Brak odbiorcy"}</p>
                    {deliveryInfo.phone && (
                      <p className="text-xs text-muted-foreground font-mono">Tel: {deliveryInfo.phone}</p>
                    )}
                  </div>

                  {pickupPointInfo || overridePointId ? (
                    <div className="pt-2.5 border-t border-white/5 space-y-1.5 bg-primary/5 rounded-lg p-2.5 border border-primary/10">
                      <div className="flex items-center gap-1.5 text-primary">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="font-bold text-[10px] uppercase tracking-wider">Punkt Odbioru / Paczkomat</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-primary-foreground">
                          {pickupPointInfo?.name || `Paczkomat ${overridePointId}`}
                        </p>
                        {pickupPointInfo?.address?.street ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{pickupPointInfo.address.street}</p>
                        ) : deliveryInfo.street ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{deliveryInfo.street}</p>
                        ) : null}
                        {pickupPointInfo?.address?.zipCode || pickupPointInfo?.address?.city ? (
                          <p className="text-xs text-muted-foreground">
                            {pickupPointInfo.address.zipCode} {pickupPointInfo.address.city}
                          </p>
                        ) : deliveryInfo.zipCode || deliveryInfo.city ? (
                          <p className="text-xs text-muted-foreground">
                            {deliveryInfo.zipCode} {deliveryInfo.city}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2.5 border-t border-white/5 space-y-0.5">
                      <p className="text-muted-foreground">{deliveryInfo.street || "Brak ulicy"}</p>
                      <p className="text-muted-foreground">
                        {deliveryInfo.zipCode} {deliveryInfo.city}
                      </p>
                    </div>
                  )}

                  {/* ID Punktu Paczkomatu wejściowe bezpośrednio w okienku adresu */}
                  {showPickupPoint && setOverridePointId && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5">
                      <Label htmlFor="address-point-id" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> Szybka zmiana ID punktu
                      </Label>
                      <Input
                        id="address-point-id"
                        value={overridePointId || ""}
                        onChange={(e) => setOverridePointId(e.target.value)}
                        placeholder="Wpisz ID punktu (np. WAW53AP)..."
                        className="h-8 text-xs bg-background/50 font-mono uppercase border-primary/20 focus:border-primary/50 focus:ring-0"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Faktura */}
            <Card className="border-border/60 shadow-sm bg-card/40">
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Dane do Faktury
                  </p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditInvoiceOpen(true)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-sm">
                  {invoiceInfo.hasInvoice ? (
                    <>
                      <p className="font-semibold">{invoiceInfo.name}</p>
                      {invoiceInfo.taxId && <p className="text-xs text-muted-foreground font-mono mb-0.5">NIP: {invoiceInfo.taxId}</p>}
                      <p className="text-muted-foreground">{invoiceInfo.street}</p>
                      <p className="text-muted-foreground">{invoiceInfo.zipCode} {invoiceInfo.city}</p>
                    </>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-muted-foreground">{deliveryInfo.name}</p>
                      <p className="text-muted-foreground">{deliveryInfo.street}</p>
                      <p className="text-muted-foreground">{deliveryInfo.zipCode} {deliveryInfo.city}</p>
                      <p className="text-[10px] italic text-muted-foreground mt-2">(Wysłanie domyślne - klient nie prosił o fakturę)</p>
                    </div>
                  )}

                  {/* Status Faktury i Przycisk Tworzenia */}
                  {order.erp_sales_document_number ? (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-400">
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold">Wystawiono fakturę:</p>
                        <p className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] text-white mt-1 truncate inline-block">
                          {order.erp_sales_document_number}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <Button
                        className="w-full h-8 text-xs font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg transition-all duration-300 gap-1.5"
                        onClick={handleCreateInvoice}
                        disabled={isCreatingInvoice}
                      >
                        {isCreatingInvoice ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Wystawianie...
                          </>
                        ) : (
                          <>
                            <FileText className="h-3.5 w-3.5" />
                            Wystaw fakturę w Subiekt GT
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── PRODUCTS LIST (Premium) ── */}
          {subiektStock && !subiektStock.is_connected && (
            <Alert variant="destructive" className="mb-3 bg-red-950/20 border-red-500/20 text-red-400 py-2 px-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Brak połączenia z ERP</AlertTitle>
              <AlertDescription className="text-[11px] leading-snug">
                {subiektStock.reason || "Nie można sprawdzić stanów magazynowych w Subiekcie."}
              </AlertDescription>
            </Alert>
          )}

          {lineItems.length > 0 && (
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-b border-border/40">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Produkty ({lineItems.length})
                </p>
              </div>
              <div className="divide-y divide-border/40">
                {lineItems.map((item: any, index: number) => {
                  const offerId = item.offer?.id || item.product_id;
                  const mapping = productMappings?.[offerId];
                  const stockInfo = subiektStock?.items?.find((s: any) => s.offer_id === offerId);
                  return (
                    <div key={`${item.id || item.order_product_id}-${index}`} className="p-3 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.offer?.name || item.name} className="w-10 h-10 rounded-md object-contain bg-white p-0.5 border border-border/60 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-md border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-1">{item.offer?.name || item.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku || offerId || 'Brak'}</span>
                            {mapping ? (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                ERP: {mapping.erp_product_symbol}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-destructive/10 text-destructive border-destructive/20">
                                Brak mapowania
                              </Badge>
                            )}
                            {subiektStock?.is_connected && stockInfo && stockInfo.has_mapping && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[9px] h-4 px-1.5",
                                  stockInfo.is_service
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    : stockInfo.has_sufficient_stock
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium"
                                )}
                              >
                                {stockInfo.is_service 
                                  ? "Usługa" 
                                  : `W ERP: ${stockInfo.quantity_available ?? 0} szt.`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <ProductMappingDialog 
                          offerId={offerId} 
                          offerName={item.offer?.name || item.name}
                          currentMapping={mapping}
                          sourceIntegrationId={order.service_integration?.id}
                          erpIntegrationId={erpIntegration?.id}
                          onMappingUpdated={refetchMappings || (() => {})}
                        />
                        <Badge variant="secondary" className="font-mono bg-background shadow-sm border border-border/60">
                          x{item.quantity}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── MESSAGE ── */}
          {message && (
            <Alert className="border-border/60 shadow-sm bg-muted/10">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              <AlertTitle className="text-xs font-semibold text-muted-foreground">Wiadomość od kupującego</AlertTitle>
              <AlertDescription className="mt-2 text-sm italic font-medium">"{message}"</AlertDescription>
            </Alert>
          )}

          {/* Dialogs */}
          <EditAddressDialog
            order={order}
            courierProvider={courierProvider}
            isOpen={isEditAddressOpen}
            onClose={() => setIsEditAddressOpen(false)}
            onSuccess={(updatedOrder) => { setIsEditAddressOpen(false); onOrderUpdate?.(updatedOrder); }}
          />
          <EditInvoiceDialog
            order={order}
            isOpen={isEditInvoiceOpen}
            onClose={() => setIsEditInvoiceOpen(false)}
            onSuccess={(updatedOrder) => { setIsEditInvoiceOpen(false); onOrderUpdate?.(updatedOrder); }}
          />
        </div>
      )}
    </div>  );
};

const PALLET_PRESETS = [
  { label: "Europaleta", length: "120", width: "80", height: "180", weight: "300" },
  { label: "Półpaleta", length: "80", width: "60", height: "120", weight: "150" },
  { label: "Ćwierćpaleta", length: "60", width: "40", height: "60", weight: "75" },
] as const;

const PICKUP_TYPES = [
  { value: "COURIER", label: "Kurier (podjazd)" },
  { value: "SELF", label: "Nadanie własne" },
  { value: "BOX_MACHINE", label: "Paczkomat nadawczy" },
  { value: "POCZTA", label: "Poczta" },
] as const;

const COURIER_COLORS: Record<string, string> = {
  INPOST: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DHL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  DPD: "bg-red-500/20 text-red-400 border-red-500/30",
  UPS: "bg-amber-700/20 text-amber-600 border-amber-700/30",
  GLS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  POCZTA: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  FEDEX: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  RABEN: "bg-green-500/20 text-green-400 border-green-500/30",
};

interface PackageState {
  id: string;
  mode: "predefined" | "custom";
  selectedPackageId?: string;
  customPackage: {
    length_cm: string;
    width_cm: string;
    height_cm: string;
    weight_kg: string;
  };
  codAmount: string;
  courier_code?: string;
  is_nstd: boolean;
}

interface OrderDetailsColumnProps {
  order: MarketplaceOrder | null;
  onShipmentCreated: (orderId: string) => void;
  onOrderUpdate?: (order: MarketplaceOrder | null) => void;
}

export function OrderDetailsColumn({
  order: propOrder,
  onShipmentCreated,
  onOrderUpdate,
}: OrderDetailsColumnProps) {
  const queryClient = useQueryClient();

  const { data: freshOrder, refetch: refetchOrder, isFetching: isFetchingOrder } = useQuery<MarketplaceOrder | null>({
    queryKey: ["orderDetails", propOrder?.id],
    queryFn: async () => {
      if (!propOrder?.id) return null;
      const res = await api.get(`/orders/${propOrder.id}`);
      return res.data;
    },
    enabled: !!propOrder?.id,
    initialData: propOrder || undefined,
  });

  const order = freshOrder || propOrder;

  const { data: integrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations"],
    queryFn: async () => (await api.get("/service-integrations")).data,
  });
  const erpIntegration = integrations?.find(i => i.provider_type === "SUBIEKT_GT");

  const { isEnabled: printHubEnabled, status: printHubStatus, defaultLabelPrinter, printErpSymbolOnLabel, labelItemsPerPage } = usePrintHub();

  const offerIds = useMemo(() => {
    if (!order) return [];
    if (order.service_integration?.provider_type === "EMPIK") {
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

  const { data: subiektStock, refetch: refetchSubiektStock } = useQuery<any>({
    queryKey: ["subiektStock", order?.id],
    queryFn: async () => {
      if (!order?.id) return null;
      const res = await api.get(`/orders/${order.id}/subiekt-stock`);
      return res.data;
    },
    enabled: !!order?.id && !!erpIntegration?.id,
  });

  const { data: organization } = useQuery<any>({
    queryKey: ["organization"],
    queryFn: async () => (await api.get("/organization")).data,
    staleTime: 5 * 60 * 1000,
  });

  const handleMappingUpdated = () => {
    refetchMappings();
    refetchSubiektStock();
  };

  // --- Stany ręcznego wyboru kuriera (przeniesione wyżej, by zapobiec błędom kompilacji) ---
  const [isManualCourier, setIsManualCourier] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>("");
  const [apaczkaServices, setApaczkaServices] = useState<ApaczkaService[]>([]);
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const [valuationItems, setValuationItems] = useState<ValuationItem[]>([]);
  const [isValuating, setIsValuating] = useState(false);
  const [overridePointId, setOverridePointId] = useState<string>("");
  const [pickupType, setPickupType] = useState("COURIER");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupHoursFrom, setPickupHoursFrom] = useState("09:00");
  const [pickupHoursTo, setPickupHoursTo] = useState("17:00");

  const lineItems = useMemo(() => {
    if (!order) return [];
    if (order.service_integration?.provider_type === "EMPIK") {
      const payload = order.details_payload || {};
      const currency = payload.currency_iso_code || "PLN";
      return (payload.order_lines || []).map((line: any) => {
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
          offer: {
            id: line.offer_id?.toString() || line.offer_sku,
            name: line.product_title,
          },
          imageUrl: imageUrl,
          sku: line.offer_sku,
        };
      });
    }
    const payload = order.details_payload || {};
    return order.line_items || payload.lineItems || payload.products || [];
  }, [order]);


  const {
    data: config,
    isLoading: isConfigLoading,
    error: configError,
  } = useShippingConfig();
  const [packages, setPackages] = useState<PackageState[]>([]);
  const getProductSummary = (orderInfo?: MarketplaceOrder | null) => {
    if (!orderInfo) return "";
    const providerType = orderInfo.service_integration?.provider_type;
    const payload = orderInfo.details_payload || {};
    let items = [];
    if (providerType === "EMPIK") {
      items = (payload.order_lines || []).map((line: any) => ({
        name: line.product_title || "Produkt",
        quantity: line.quantity || 1
      }));
    } else {
      const origItems = orderInfo.line_items || payload.lineItems || payload.products || [];
      items = origItems.map((item: any) => ({
        name: item.offer?.name || item.name || "Produkt",
        quantity: item.quantity || 1
      }));
    }
    return items
      .map((item: any) => `${item.name} x${item.quantity}`)
      .join(", ");
  };

  const [referenceNumber, setReferenceNumber] = useState("");

  const receiverFullName = useMemo(() => {
    if (!order) return "Brak";
    if (order.service_integration?.provider_type === "ALLEGRO") {
      return `${order.details_payload?.delivery?.address?.firstName || ""} ${
        order.details_payload?.delivery?.address?.lastName || ""
      }`.trim();
    }
    return order.details_payload?.delivery_fullname || "Brak";
  }, [order]);

  const maxRefLength = useMemo(() => {
    const selectedCourier = config?.couriers?.find((c) => c.id === selectedCourierId);
    if (!selectedCourier) return 35;

    if (selectedCourier.provider_type === "ALLEGRO") {
      return 35;
    }
    if (selectedCourier.provider_type === "SUUS") {
      return 43;
    }
    if (selectedCourier.provider_type === "APACZKA") {
      const activeService = apaczkaServices.find((s) => String(s.id) === String(selectedServiceCode));
      const serviceName = activeService?.name?.toLowerCase() || "";
      if (serviceName.includes("inpost") || serviceName.includes("paczkomat")) {
        return 50;
      }
      return 35;
    }
    return 35;
  }, [selectedCourierId, selectedServiceCode, apaczkaServices, config]);

  useEffect(() => {
    if (order && lineItems.length > 0) {
      const template = organization?.default_reference_number_template;
      let summary = "";
      
      if (template) {
        let resolved = template;
        
        // 1. {order_id}
        resolved = resolved.replace(/{order_id}/g, order.external_order_id || order.id || "");
        
        // 2. {buyer_login} / {login}
        resolved = resolved.replace(/{buyer_login}/g, order.buyer_login || "");
        resolved = resolved.replace(/{login}/g, order.buyer_login || "");
        
        // 3. {buyer_name} / {name}
        resolved = resolved.replace(/{buyer_name}/g, receiverFullName);
        resolved = resolved.replace(/{name}/g, receiverFullName);
        
        // 4. {product_names} / {products}
        const productNames = lineItems.map((item: any) => `${item.name} x${item.quantity}`).join(", ");
        resolved = resolved.replace(/{product_names}/g, productNames);
        resolved = resolved.replace(/{products}/g, productNames);
        
        // 5. {erp_symbols}
        const erpSymbolsList = lineItems
          .map((item: any) => {
            const offerId = item.offer?.id || item.product_id;
            return productMappings?.[offerId]?.erp_product_symbol;
          })
          .filter(Boolean);
        const erpSymbols = erpSymbolsList.join(", ");
        resolved = resolved.replace(/{erp_symbols}/g, erpSymbols);
        
        // 6. {source}
        const sourceName = order.service_integration?.provider_type || "";
        resolved = resolved.replace(/{source}/g, sourceName);
        
        summary = resolved.substring(0, maxRefLength);
      } else {
        summary = getProductSummary(order).substring(0, maxRefLength);
      }
      setReferenceNumber(summary);
    } else {
      setReferenceNumber("");
    }
  }, [order, lineItems, maxRefLength, organization, productMappings, receiverFullName]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set()
  );



  // Reset trybu ręcznego przy każdej zmianie zamówienia
  useEffect(() => {
    setIsManualCourier(false);
    setSelectedCourierId(null);
    setSelectedServiceCode("");
    setApaczkaServices([]);
    setValuationItems([]);
    
    // Inicjalizacja punktu odbioru
    const deliv = order?.details_payload?.delivery || {};
    const pointId = order?.pickup_point?.id || deliv?.pickupPoint?.id || order?.details_payload?.delivery_point_id || "";
    setOverridePointId(pointId);
  }, [order?.id, order?.pickup_point?.id]);

  const apaczkaIntegrations = integrations?.filter(i => i.provider_type === "APACZKA") ?? [];

  const {
    data: shipments,
    isLoading: areShipmentsLoading,
    error: shipmentsError,
    refetch: refetchShipments,
  } = useOrderShipments(order?.id);
  const { data: serviceMappings } = useQuery<AdditionalServiceMapping[]>({
    queryKey: ["additionalServiceMappings"],
    queryFn: async () => (await api.get("/additional-service-mappings")).data,
    enabled: !!order,
  });

  const isCodOrder = useMemo(
    () =>
      order?.details_payload?.payment?.type === "CASH_ON_DELIVERY" ||
      String(order?.details_payload?.payment_method_cod) === "1",
    [order]
  );
  const totalCodAmount = useMemo(() => {
    if (!isCodOrder || !order) return 0;
    const payload = order.details_payload;
    return parseFloat(
      payload.cashOnDelivery?.amount ||
        payload.payment_done ||
        order.total_to_pay ||
        "0"
    );
  }, [order, isCodOrder]);

  const { mappedCourier, mappedPackageId, mappingWarning } = useMemo(() => {
    if (!order || !config)
      return {
        mappedCourier: null,
        mappedPackageId: undefined,
        mappingWarning: null,
      };
    const deliveryMethodName =
      order.details_payload?.delivery?.method?.name ||
      order.details_payload?.delivery_method ||
      (order.service_integration?.provider_type === "EMPIK" ? order.details_payload?.shipping_type_label : null);
    if (!deliveryMethodName)
      return { mappingWarning: "W zamówieniu brakuje nazwy metody dostawy." };
    const mapping = config.mappings.find(
      (m) =>
        m.marketplace_delivery_method === deliveryMethodName &&
        m.source_integration &&
        m.source_integration.id === order.service_integration?.id
    );
    if (!mapping)
      return {
        mappingWarning: `Brak mapowania dla metody: "${deliveryMethodName}".`,
      };
    if (!mapping.service_integration_id || !mapping.courier_service_code)
      return {
        mappingWarning: `Mapowanie dla "${deliveryMethodName}" jest niekompletne.`,
      };
    const courier = config.couriers.find(
      (c) => c.id === mapping.service_integration_id
    );
    const defaultPackage = config.packages.find((p) => p.is_default);
    return {
      mappedCourier: courier,
      mappedPackageId:
        mapping.default_package_definition_id || defaultPackage?.id,
      mappingWarning: null,
    };
  }, [order, config]);

  useEffect(() => {
    if (order) {
      const initialCodAmount = isCodOrder ? totalCodAmount.toFixed(2) : "";
      setPackages([
        {
          id: crypto.randomUUID(),
          mode: "predefined",
          selectedPackageId: mappedPackageId,
          customPackage: {
            length_cm: "",
            width_cm: "",
            height_cm: "",
            weight_kg: "",
          },
          codAmount: initialCodAmount,
          courier_code: "COL",
          is_nstd: false,
        },
      ]);
    } else {
      setPackages([]);
    }
  }, [order, mappedPackageId, isCodOrder, totalCodAmount]);

  useEffect(() => {
    if (order?.buyer_login && order.service_integration) {
      api
        .get<Thread[]>("/threads/by-buyer-login", {
          params: {
            buyer_login: order.buyer_login,
            integration_id: order.service_integration.id,
          },
        })
        .then((response) => setThreads(response.data));
    } else {
      setThreads([]);
    }
  }, [order]);

  useEffect(() => {
    const autoSelected = new Set<string>();
    if (order && serviceMappings && mappedCourier) {
      const lineItems = order.details_payload?.lineItems || [];
      for (const item of lineItems) {
        const allegroServices = item.selectedAdditionalServices || [];
        for (const service of allegroServices) {
          const serviceMap = serviceMappings.find(
            (m) =>
              m.marketplace_service_id === service.definitionId &&
              m.courier_provider === mappedCourier.provider_type
          );
          if (serviceMap) {
            autoSelected.add(serviceMap.courier_service_code);
          }
        }
      }
    }
    setSelectedServices(autoSelected);
  }, [order, serviceMappings, mappedCourier]);

  const totalMessages = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.messages.length, 0),
    [threads]
  );
  const availableServicesForCourier = useMemo(() => {
    if (!serviceMappings || !mappedCourier) return [];
    return serviceMappings.filter(
      (m) => m.courier_provider === mappedCourier.provider_type
    );
  }, [serviceMappings, mappedCourier]);

  const handlePackageChange = (
    index: number,
    field: keyof PackageState,
    value: any
  ) => {
    setPackages((pkgs) =>
      pkgs.map((pkg, i) => (i === index ? { ...pkg, [field]: value } : pkg))
    );
  };

  const handleCustomDimensionChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPackages((pkgs) =>
      pkgs.map((pkg, i) =>
        i === index
          ? { ...pkg, customPackage: { ...pkg.customPackage, [name]: value } }
          : pkg
      )
    );
  };

  const handleCodAmountChange = (index: number, value: string) => {
    setPackages((pkgs) =>
      pkgs.map((pkg, i) => (i === index ? { ...pkg, codAmount: value } : pkg))
    );
  };

  const splitCodForPackages = (currentPackages: PackageState[]) => {
    const numPackages = currentPackages.length;
    if (!isCodOrder || numPackages === 0) return;

    const totalCents = Math.round(totalCodAmount * 100);
    const baseCents = Math.floor(totalCents / numPackages);
    let remainderCents = totalCents % numPackages;

    const updatedPackages = currentPackages.map((pkg) => {
      let packageCents = baseCents;
      if (remainderCents > 0) {
        packageCents += 1;
        remainderCents--;
      }
      const updatedPackage: PackageState = {
        ...pkg,
        codAmount: (packageCents / 100).toFixed(2),
      };
      return updatedPackage;
    });
    setPackages(updatedPackages);
  };

  const addPackage = () => {
    const newCodAmount = isCodOrder ? "0.00" : "";
    const newPackage: PackageState = {
      id: crypto.randomUUID(),
      mode: "predefined",
      selectedPackageId: config?.packages.find((p) => p.is_default)?.id,
      customPackage: {
        length_cm: "",
        width_cm: "",
        height_cm: "",
        weight_kg: "",
      },
      codAmount: newCodAmount,
      courier_code: "COL",
      is_nstd: false,
    };
    const newPackages = [...packages, newPackage];
    setPackages(newPackages);
    if (isCodOrder) {
      splitCodForPackages(newPackages);
    }
  };

  const removePackage = (id: string) => {
    const newPackages = packages.filter((p) => p.id !== id);
    setPackages(newPackages);
    if (isCodOrder && newPackages.length > 0) {
      splitCodForPackages(newPackages);
    }
  };

  const handleSplitCodClick = () => {
    splitCodForPackages(packages);
    toast.success("Kwota pobrania została podzielona.");
  };

  const handleServiceToggle = (serviceCode: string) => {
    setSelectedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceCode)) {
        newSet.delete(serviceCode);
      } else {
        newSet.add(serviceCode);
      }
      return newSet;
    });
  };

  const fetchApaczkaServices = async (courierId: number) => {
    setIsFetchingServices(true);
    setApaczkaServices([]);
    setValuationItems([]);
    setSelectedServiceCode("");
    try {
      const res = await api.get<ApaczkaService[]>(`/service-integrations/${courierId}/apaczka/services`);
      setApaczkaServices(res.data);
    } catch {
      toast.error("Nie udało się pobrać listy serwisów Apaczki.");
    } finally {
      setIsFetchingServices(false);
    }
  };

  const handleGetValuation = async () => {
    if (!order || !selectedCourierId || packages.length === 0) return;
    setIsValuating(true);
    setValuationItems([]);
    try {
      const packagesPayload = packages.map(pkg => {
        if (pkg.mode === "predefined" && pkg.selectedPackageId) {
          return { package_definition_id: pkg.selectedPackageId };
        }
        return {
          custom_package: {
            length_cm: parseFloat(pkg.customPackage.length_cm || "20"),
            width_cm: parseFloat(pkg.customPackage.width_cm || "20"),
            height_cm: parseFloat(pkg.customPackage.height_cm || "20"),
            weight_kg: parseFloat(pkg.customPackage.weight_kg || "1"),
          }
        };
      });
      const res = await api.post<ValuationItem[]>("/shipping/valuation", {
        order_id: order.id,
        packages: packagesPayload,
        courier_integration_id: selectedCourierId,
        service_id: selectedServiceCode || null,
      });
      setValuationItems(res.data);
      if (res.data.length === 0) toast("Brak dostępnych serwisów dla tych wymiarów.");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Błąd pobierania wyceny.");
    } finally {
      setIsValuating(false);
    }
  };

  const handleGenerateLabels = async () => {
    if (!order || !config) return;
    if (isCodOrder) {
      const totalEnteredCod = packages.reduce(
        (sum, pkg) => sum + parseFloat(pkg.codAmount.replace(",", ".") || "0"),
        0
      );
      if (Math.abs(totalEnteredCod - totalCodAmount) > 0.01) {
        toast.error(
          "Suma kwot pobrania nie zgadza się z wartością zamówienia."
        );
        return;
      }
    }
    setIsGenerating(true);
    const packagesPayload = [];
    for (const [index, pkg] of packages.entries()) {
      let packageDef = null;
      if (pkg.mode === "predefined") {
        if (!pkg.selectedPackageId) {
          toast.error(`Paczka #${index + 1}: Musisz wybrać opakowanie.`);
          setIsGenerating(false);
          return;
        }
        packageDef =
          config.packages.find((p) => p.id === pkg.selectedPackageId) || null;
      }
      const currentPayload: any = {
        cod_amount: isCodOrder
          ? parseFloat(pkg.codAmount.replace(",", "."))
          : undefined,
        package_definition: packageDef,
        is_nstd: pkg.is_nstd,
      };
      if (pkg.mode === "predefined") {
        currentPayload.package_definition_id = pkg.selectedPackageId;
      } else {
        try {
          const parsed = {
            length_cm: parseFloat(
              pkg.customPackage.length_cm.replace(",", ".")
            ),
            width_cm: parseFloat(pkg.customPackage.width_cm.replace(",", ".")),
            height_cm: parseFloat(
              pkg.customPackage.height_cm.replace(",", ".")
            ),
            weight_kg: parseFloat(
              pkg.customPackage.weight_kg.replace(",", ".")
            ),
          };
          if (Object.values(parsed).some((v) => isNaN(v) || v <= 0))
            throw new Error("Wymiary muszą być poprawnymi liczbami dodatnimi.");
          currentPayload.custom_package = parsed;
        } catch (error: any) {
          toast.error(`Paczka #${index + 1}: ${error.message}`);
          setIsGenerating(false);
          return;
        }
      }
      packagesPayload.push(currentPayload);
    }
    const finalPayload: any = {
      order_id: order.id,
      reference_number: referenceNumber,
      packages: packagesPayload,
      manual_additional_services: Array.from(selectedServices),
      override_point_id: overridePointId || undefined,
      pickup_override: {
        type: pickupType,
        date: pickupDate || undefined,
        hours_from: pickupHoursFrom,
        hours_to: pickupHoursTo,
      },
    };
    if (isManualCourier && selectedCourierId) {
      finalPayload.override_courier_integration_id = selectedCourierId;
      finalPayload.override_service_code = selectedServiceCode || undefined;
    }
    try {
      const response = await api.post(
        "/shipping/generate-labels",
        finalPayload
      );
      const createdShipments: Shipment[] = response.data;
      toast.success(
        `Pomyślnie utworzono ${createdShipments.length} etykiet. Rozpoczynanie pobierania...`
      );

      // Zbieramy pozycje które mają mapowanie ERP (raz dla całego zamówienia/paczek)
      const lineItems: any[] = order.details_payload?.lineItems || order.details_payload?.products || [];
      const erpItems = (productMappings
        ? lineItems
            .map((item: any) => {
              const offerId = item.offer?.id || item.product_id;
              const mapping = productMappings[offerId];
              if (!mapping) return null;
              return {
                erpSymbol: mapping.erp_product_symbol as string,
                name: (item.offer?.name || item.name || "Produkt") as string,
                quantity: item.quantity as number,
              };
            })
            .filter(Boolean)
        : []) as { erpSymbol: string; name: string; quantity: number }[];

      for (const shipment of createdShipments) {
        try {
          const labelResponse = await api.get(
            `/shipping/shipments/${shipment.id}/label`
          );
          const { label_data, label_format, tracking_number } =
            labelResponse.data;
          const fileName = `etykieta-${
            tracking_number || shipment.id
          }.${label_format.toLowerCase()}`;
          
          if (printHubEnabled && printHubStatus === "connected") {
            if (label_format === "ZPL" || label_format === "EPL") {
              printHubService.printRaw(label_data, fileName, {
                printerName: defaultLabelPrinter || undefined,
              });
              toast.success(`Wysłano etykietę ${shipment.id} do Print Hub`);
            } else {
              printHubService.printPdf(label_data, fileName, {
                printerName: defaultLabelPrinter || undefined,
                printErpSymbols: printErpSymbolOnLabel,
                labelItemsPerPage: labelItemsPerPage,
                erpItems: erpItems,
              });
              toast.success(`Wysłano etykietę ${shipment.id} do Print Hub`);
            }
          } else {
            downloadFileFromBase64(
              label_data,
              fileName,
              label_format === "PDF" ? "application/pdf" : "text/plain"
            );
          }
        } catch (downloadError) {
          toast.error(
            `Etykieta ${shipment.tracking_number} utworzona, nie udało się pobrać.`
          );
        }
      }
      onShipmentCreated(order.id);
      refetchShipments();
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Błąd podczas generowania etykiet.",
        { duration: 6000 }
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!order)
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/20">
        <PackageOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Wybierz zamówienie</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Wybierz zamówienie z listy po prawej, aby przygotować przesyłkę.
        </p>
      </div>
    );
  const isGenerateButtonDisabled =
    isGenerating ||
    (isManualCourier ? !selectedCourierId : !!mappingWarning) ||
    packages.length === 0 ||
    packages.some(
      (p) =>
        (p.mode === "predefined" && !p.selectedPackageId) ||
        (p.mode === "custom" &&
          (Object.values(p.customPackage).some((v) => v === "") ||
            !p.courier_code)) ||
        (isCodOrder && (p.codAmount === "" || isNaN(parseFloat(p.codAmount))))
    );

  const isApaczkaSelected = isManualCourier ? !!selectedCourierId : mappedCourier?.provider_type === "APACZKA";
  const hasPickupPoint = !!(order?.pickup_point || order?.pickupPoint || order?.details_payload?.delivery?.pickupPoint || order?.detailsPayload?.delivery?.pickupPoint);

  const isPickupPointService = (() => {
    let serviceNameOrCode = "";
    if (isManualCourier) {
      if (selectedServiceCode) {
        const s = apaczkaServices.find(s => s.id === selectedServiceCode);
        if (s) serviceNameOrCode = `${s.name} ${s.id}`.toLowerCase();
      }
    } else {
      if (config && order && mappedCourier) {
        const deliveryMethodName =
          order.details_payload?.delivery?.method?.name ||
          order.details_payload?.delivery_method ||
          (order.service_integration?.provider_type === "EMPIK" ? order.details_payload?.shipping_type_label : null);
        const mapping = config.mappings.find(m => m.marketplace_delivery_method === deliveryMethodName && m.source_integration?.id === order.service_integration?.id);
        if (mapping) {
           serviceNameOrCode = `${mapping.courier_service_code} ${deliveryMethodName}`.toLowerCase();
        }
      }
    }

    if (!serviceNameOrCode) return false;

    const keywords = ["paczkomat", "pickup", "punkt", "pop", "orlen paczka", "access point", "locker", "one box", "odbior"];
    return keywords.some(kw => serviceNameOrCode.includes(kw));
  })();

  const showPickupPoint = isApaczkaSelected ? isPickupPointService : hasPickupPoint;

  const buyerMessage = order.details_payload?.messageToSeller?.text || 
                       order.details_payload?.user_comments || 
                       order.details_payload?.message_to_seller;

  return (
    <div className="h-full flex flex-col overflow-hidden glass border-none rounded-2xl p-6 gap-4 bg-slate-900/40 backdrop-blur-md shadow-2xl">
      <OrderInfoCard 
        order={order} 
        productMappings={productMappings}
        erpIntegration={erpIntegration}
        refetchMappings={handleMappingUpdated}
        courierProvider={isManualCourier ? undefined : mappedCourier?.provider_type}
        onOrderUpdate={(updatedOrder) => {
          queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
          if (onOrderUpdate) {
            onOrderUpdate(updatedOrder);
          }
        }}
        refetchOrder={refetchOrder}
        isFetchingOrder={isFetchingOrder}
        onlyHeader={true}
        subiektStock={subiektStock}
      />

      {buyerMessage && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-200 shrink-0">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-xs font-semibold flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-amber-400" /> Uwaga! Wiadomość od kupującego
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm font-semibold italic">
            "{buyerMessage}"
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="main" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 bg-slate-950/40 p-1 border border-white/5 rounded-xl shrink-0">
          <TabsTrigger value="main" className="flex items-center justify-center gap-2 rounded-lg py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-white">
            <Info className="h-4 w-4" />
            <span className="text-xs font-medium">Główna</span>
          </TabsTrigger>
          
          <TabsTrigger value="chat" className="flex items-center justify-center gap-1.5 rounded-lg py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-white relative">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-medium">Rozmowa</span>
            {totalMessages > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-500 hover:bg-rose-600 text-white animate-pulse">
                {totalMessages}
              </Badge>
            )}
          </TabsTrigger>
          
          <TabsTrigger value="shipments" className="flex items-center justify-center gap-1.5 rounded-lg py-2 data-[state=active]:bg-primary/20 data-[state=active]:text-white">
            <Truck className="h-4 w-4" />
            <span className="text-xs font-medium">Przesyłki</span>
            {shipments && shipments.length > 0 && (
              <Badge className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500 hover:bg-indigo-600 text-white">
                {shipments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1 scrollbar-thin outline-none">
          <OrderInfoCard 
            order={order} 
            productMappings={productMappings}
            erpIntegration={erpIntegration}
            refetchMappings={handleMappingUpdated}
            courierProvider={isManualCourier ? undefined : mappedCourier?.provider_type}
            onOrderUpdate={(updatedOrder) => {
              queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
              if (onOrderUpdate) {
                onOrderUpdate(updatedOrder);
              }
            }}
            refetchOrder={refetchOrder}
            isFetchingOrder={isFetchingOrder}
            hideHeader={true}
            showPickupPoint={showPickupPoint}
            overridePointId={overridePointId}
            setOverridePointId={setOverridePointId}
            subiektStock={subiektStock}
          />

      {/* ── METODA WYSYŁKI ── */}
      <div className="rounded-xl border border-border/60 bg-card/40 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Metoda wysyłki</p>
          </div>
          <Button
            variant={isManualCourier ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => {
              setIsManualCourier(v => !v);
              if (isManualCourier) {
                setSelectedCourierId(null);
                setSelectedServiceCode("");
                setApaczkaServices([]);
                setValuationItems([]);
              }
            }}
          >
            {isManualCourier ? <BadgeCheck className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
            {isManualCourier ? "Tryb ręczny" : "Zmień metodę"}
          </Button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {!isManualCourier ? (
            // Tryb automatyczny
            mappingWarning ? (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{mappingWarning}</AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{mappedCourier?.name ?? "Nieznany kurier"}</p>
                  <p className="text-xs text-muted-foreground">{mappedCourier?.provider_type} · z mapowania dostawy</p>
                </div>
              </div>
            )
          ) : (
            // Tryb ręczny
            <div className="space-y-4">
              {/* Wybór integracji Apaczka */}
              {apaczkaIntegrations.length === 0 ? (
                <Alert className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Brak skonfigurowanej integracji Apaczka. Dodaj ją w Ustawieniach → Integracje.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Integracja Apaczka</Label>
                  <Select
                    value={selectedCourierId?.toString() ?? ""}
                    onValueChange={(val) => {
                      const id = parseInt(val);
                      setSelectedCourierId(id);
                      fetchApaczkaServices(id);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Wybierz konto Apaczka…" />
                    </SelectTrigger>
                    <SelectContent>
                      {apaczkaIntegrations.map(i => (
                        <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Wybór serwisu — grupowany po kurierze */}
              {selectedCourierId && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Serwis kurierski</Label>
                  {isFetchingServices ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ładowanie serwisów…
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/50 overflow-hidden max-h-72 overflow-y-auto">
                      {(() => {
                        const grouped: Record<string, ApaczkaService[]> = {};
                        for (const s of apaczkaServices) {
                          const key = s.courier_name || "Inne";
                          if (!grouped[key]) grouped[key] = [];
                          grouped[key].push(s);
                        }
                        return Object.entries(grouped).map(([courier, services]) => (
                          <div key={courier}>
                            <div className="px-3 py-1.5 bg-muted/40 border-b border-border/30 sticky top-0">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${COURIER_COLORS[courier] || "bg-muted text-muted-foreground border-border"}`}>
                                <Truck className="h-3 w-3" />
                                {courier}
                              </span>
                            </div>
                            {services.map(s => {
                              const valuation = valuationItems.find(v => v.id === s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => setSelectedServiceCode(s.id)}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors border-b border-border/20 ${
                                    selectedServiceCode === s.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium leading-tight truncate">{s.name}</p>
                                    {s.description && <p className="text-[10px] text-muted-foreground">{s.description}</p>}
                                  </div>
                                  {valuation && (
                                    <div className="text-right shrink-0 ml-3">
                                      <p className="text-xs font-bold text-primary">{valuation.price_gross.toFixed(2)} zł</p>
                                      <p className="text-[9px] text-muted-foreground">{valuation.price_net.toFixed(2)} netto</p>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Przycisk wyceny */}
              {selectedCourierId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs"
                  onClick={handleGetValuation}
                  disabled={isValuating || packages.length === 0}
                >
                  {isValuating
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Pobieranie wyceny…</>
                    : <><RefreshCcw className="h-3.5 w-3.5" /> Pobierz wycenę</>}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
        {/* Metoda wysyłki continues above, main tab remains open here */}
      {/* ── PRZYGOTUJ PRZESYŁKĘ (Sleek Compact Glass Layout) ── */}
      <div className="rounded-xl border border-white/5 bg-slate-900/20 shadow-lg mt-4 overflow-hidden">
        <div className="flex flex-col px-4 py-3 bg-white/5 border-b border-white/5 gap-0.5">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <Package className="h-4 w-4 text-primary" /> Przygotuj Przesyłkę
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Skonfiguruj paczki i wygeneruj etykiety.
          </p>
        </div>
        <div className="space-y-3 p-3">
          {isConfigLoading && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ładowanie konfiguracji...
            </div>
          )}
          {configError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Błąd</AlertTitle>
              <AlertDescription>
                Nie udało się załadować konfiguracji wysyłek.
              </AlertDescription>
            </Alert>
          )}
          {mappingWarning && !isConfigLoading && (
            <Alert variant="warning" className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">{mappingWarning}</AlertDescription>
            </Alert>
          )}

          {packages.map((pkg, index) => (
            <div
              key={pkg.id}
              className="p-3 border border-white/5 rounded-xl space-y-2.5 relative bg-slate-950/40 shadow-inner"
            >
              <div className="flex justify-between items-center h-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Paczka #{index + 1}</span>
                {packages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-md hover:bg-rose-500/10 hover:text-rose-500"
                    onClick={() => removePackage(pkg.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-white/5 w-fit">
                    <button
                      type="button"
                      onClick={() => handlePackageChange(index, "mode", "predefined")}
                      className={`text-[9px] font-medium py-1 px-2.5 rounded-md transition-all ${
                        pkg.mode === "predefined"
                          ? "bg-primary text-primary-foreground shadow font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Predefiniowane
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePackageChange(index, "mode", "custom")}
                      className={`text-[9px] font-medium py-1 px-2.5 rounded-md transition-all ${
                        pkg.mode === "custom"
                          ? "bg-primary text-primary-foreground shadow font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Własne wymiary
                    </button>
                  </div>

                  {pkg.mode === "custom" && (
                    <button
                      type="button"
                      onClick={() =>
                        setPackages((pkgs) =>
                          pkgs.map((p, i) =>
                            i === index ? { ...p, is_nstd: !p.is_nstd } : p
                          )
                        )
                      }
                      className={`h-[22px] px-2 rounded-md border text-[9px] font-semibold transition-all flex items-center justify-center ${
                        pkg.is_nstd
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-slate-300"
                      }`}
                    >
                      Niestandardowa (Gabaryt)
                    </button>
                  )}
                </div>

                {pkg.mode === "predefined" ? (
                  <div className="mt-0.5">
                    <Select
                      value={pkg.selectedPackageId}
                      onValueChange={(value) =>
                        handlePackageChange(index, "selectedPackageId", value)
                      }
                      disabled={isConfigLoading}
                    >
                      <SelectTrigger className="h-7 text-xs bg-slate-900/50 border-white/10 rounded-lg">
                        <SelectValue placeholder="Wybierz opakowanie..." />
                      </SelectTrigger>
                      <SelectContent>
                        {config?.packages.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} ({p.length_cm}x{p.width_cm}x{p.height_cm}cm, {p.weight_kg}kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 pt-0.5">
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-1.5 focus-within:border-primary/50 transition-all">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Dł</span>
                        <input
                          id={`length_cm-${pkg.id}`}
                          name="length_cm"
                          value={pkg.customPackage.length_cm}
                          onChange={(e) => handleCustomDimensionChange(index, e)}
                          className="w-full bg-transparent border-none shadow-none outline-none p-0 h-7 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                        />
                        <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">cm</span>
                      </div>

                      <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-1.5 focus-within:border-primary/50 transition-all">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Sz</span>
                        <input
                          id={`width_cm-${pkg.id}`}
                          name="width_cm"
                          value={pkg.customPackage.width_cm}
                          onChange={(e) => handleCustomDimensionChange(index, e)}
                          className="w-full bg-transparent border-none shadow-none outline-none p-0 h-7 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                        />
                        <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">cm</span>
                      </div>

                      <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-1.5 focus-within:border-primary/50 transition-all">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Wy</span>
                        <input
                          id={`height_cm-${pkg.id}`}
                          name="height_cm"
                          value={pkg.customPackage.height_cm}
                          onChange={(e) => handleCustomDimensionChange(index, e)}
                          className="w-full bg-transparent border-none shadow-none outline-none p-0 h-7 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                        />
                        <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">cm</span>
                      </div>

                      <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-1.5 focus-within:border-primary/50 transition-all">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Wg</span>
                        <input
                          id={`weight_kg-${pkg.id}`}
                          name="weight_kg"
                          value={pkg.customPackage.weight_kg}
                          onChange={(e) => handleCustomDimensionChange(index, e)}
                          className="w-full bg-transparent border-none shadow-none outline-none p-0 h-7 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                        />
                        <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">kg</span>
                      </div>
                    </div>

                    {mappedCourier?.provider_type === "SUUS" && (
                      <div className="space-y-1 mt-1">
                        <Label className="text-[10px] text-muted-foreground">Typ opakowania SUUS</Label>
                        <Select
                          onValueChange={(value) =>
                            handlePackageChange(index, "courier_code", value)
                          }
                          value={pkg.courier_code}
                        >
                          <SelectTrigger className="h-7 text-xs bg-slate-900/50 border-white/10 rounded-lg">
                            <SelectValue placeholder="Wybierz typ opakowania..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SUUS_PACKAGE_CODES).map(([code, name]) => (
                              <SelectItem key={code} value={code} className="text-xs">
                                {code} - {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Palet presets compact */}
                    <div className="pt-1.5 flex items-center justify-between gap-2 flex-wrap border-t border-white/5">
                      <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider select-none">Palety:</span>
                      <div className="flex gap-1">
                        {PALLET_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[8px] font-medium border border-white/5 transition-all flex items-center gap-0.5"
                            onClick={() => {
                              setPackages((pkgs) =>
                                pkgs.map((p, i) =>
                                  i === index
                                    ? {
                                        ...p,
                                        customPackage: {
                                          length_cm: preset.length,
                                          width_cm: preset.width,
                                          height_cm: preset.height,
                                          weight_kg: preset.weight,
                                        },
                                        is_nstd: true,
                                      }
                                    : p
                                )
                              );
                            }}
                          >
                            <Box className="h-2 w-2 text-primary" />
                            {preset.label.replace("paleta", "")} ({preset.length}×{preset.width})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isCodOrder && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 h-7 mt-1">
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider select-none flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-emerald-500" /> Kwota Pobrania
                    </span>
                    <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-2 focus-within:border-primary/50 transition-all max-w-[140px]">
                      <input
                        id={`cod-amount-${pkg.id}`}
                        value={pkg.codAmount}
                        onChange={(e) =>
                          handleCodAmountChange(index, e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full bg-transparent border-none shadow-none outline-none p-0 h-6 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200"
                        type="number"
                        step="0.01"
                      />
                      <span className="text-[9px] text-slate-500 ml-1.5 shrink-0 select-none font-medium">PLN</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-[11px] bg-slate-950/20 hover:bg-slate-950/40 border-white/5 rounded-lg transition-all"
              onClick={addPackage}
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-primary" /> Dodaj paczkę
            </Button>
            {isCodOrder && packages.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[11px] bg-slate-950/20 hover:bg-slate-950/40 border-white/5 rounded-lg transition-all"
                onClick={handleSplitCodClick}
              >
                <DivideCircle className="mr-1.5 h-3.5 w-3.5 text-primary" /> Podziel pobranie
              </Button>
            )}
          </div>

          {availableServicesForCourier.length > 0 && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Usługi dodatkowe</Label>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {availableServicesForCourier.map((serviceMap) => (
                  <div
                    key={serviceMap.id}
                    className="flex items-center space-x-1.5 bg-slate-950/20 border border-white/5 rounded-lg px-2 py-1.5 hover:bg-slate-950/40 transition-colors"
                  >
                    <Checkbox
                      id={serviceMap.id}
                      checked={selectedServices.has(
                        serviceMap.courier_service_code
                      )}
                      onCheckedChange={() =>
                        handleServiceToggle(serviceMap.courier_service_code)
                      }
                      className="h-3.5 w-3.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label
                      htmlFor={serviceMap.id}
                      className="text-[11px] text-slate-300 font-medium cursor-pointer truncate select-none leading-none"
                      title={`${serviceMap.marketplace_service_name} (${serviceMap.courier_service_code})`}
                    >
                      {serviceMap.marketplace_service_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PICKUP / COLLAPSIBLE DETAILS ── */}
          {isApaczkaSelected && (
            <details className="group border border-white/5 bg-slate-950/20 rounded-xl overflow-hidden transition-all duration-300 [&::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer select-none hover:bg-white/5 list-none">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Truck className="w-3.5 h-3.5 text-primary" />
                  <span>Zlecenie podjazdu kuriera</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">
                    {pickupType === "COURIER" ? "Kurier" : pickupType === "SELF" ? "Własne" : pickupType === "BOX_MACHINE" ? "Paczkomat" : "Poczta"}{pickupDate ? `, ${pickupDate}` : ""}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform duration-200" />
                </div>
              </summary>
              <div className="p-3 pt-2 border-t border-white/5 grid grid-cols-2 gap-2.5 bg-slate-950/40">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">Typ nadania</Label>
                  <Select value={pickupType} onValueChange={setPickupType}>
                    <SelectTrigger className="h-7 text-xs bg-slate-900/50 border-white/10 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PICKUP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">Data podjazdu</Label>
                  <Input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="h-7 text-xs bg-slate-900/50 border-white/10 rounded-md py-0 px-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">Od godziny</Label>
                  <Input
                    type="time"
                    value={pickupHoursFrom}
                    onChange={(e) => setPickupHoursFrom(e.target.value)}
                    className="h-7 text-xs bg-slate-900/50 border-white/10 rounded-md text-center py-0 px-2 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground font-medium">Do godziny</Label>
                  <Input
                    type="time"
                    value={pickupHoursTo}
                    onChange={(e) => setPickupHoursTo(e.target.value)}
                    className="h-7 text-xs bg-slate-900/50 border-white/10 rounded-md text-center py-0 px-2 text-slate-200"
                  />
                </div>
              </div>
            </details>
          )}

          <div className="pt-2 border-t border-white/5 space-y-2.5">
            <div className="flex items-center justify-between gap-3 bg-slate-950/20 border border-white/5 rounded-lg px-2.5 py-1.5">
              <Label htmlFor="reference-number" className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider shrink-0 select-none">
                Nr referencyjny etykiety
              </Label>
              <Input
                id="reference-number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Domyślnie: nr zamówienia"
                className="h-7 text-xs bg-slate-900/50 border-white/10 max-w-[160px] text-right text-slate-200"
              />
            </div>
            
            <Button
              onClick={handleGenerateLabels}
              className="w-full h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold text-xs shadow-lg hover:shadow-primary/10 transition-all duration-300 rounded-xl gap-2 mt-2"
              disabled={isGenerateButtonDisabled}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isGenerating
                ? "Generowanie etykiet..."
                : `Generuj Etykiety (${packages.length})`}
            </Button>
          </div>
        </div>
      </div>
      </TabsContent>

      <TabsContent value="chat" className="flex-1 overflow-hidden mt-3 outline-none flex flex-col h-full bg-slate-950/20 border border-white/5 rounded-xl p-4">
        {order.buyer_login && order.service_integration ? (
          <div className="flex-1 flex flex-col min-h-[450px]">
            <ChatPanel
              buyerLogin={order.buyer_login}
              integrationId={order.service_integration.id}
              currentOrderId={order.id}
              myLogin={order.service_integration.external_user_id}
            />
          </div>
        ) : (
          <div className="p-8 text-sm text-muted-foreground text-center flex flex-col items-center justify-center h-full">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-2" />
            Brak danych do załadowania rozmowy.
          </div>
        )}
      </TabsContent>

      <TabsContent value="shipments" className="flex-1 overflow-y-auto mt-3 space-y-4 pr-1 outline-none">
        <ShipmentHistory
          shipments={shipments || []}
          isLoading={areShipmentsLoading}
          error={shipmentsError}
        />
      </TabsContent>
      </Tabs>
    </div>
  );
}
