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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ChatPanel } from "../../orders/[id]/_components/chat-panel";
import { Thread } from "@/types/thread";
import { Shipment } from "@/types/shipment";
import { AdditionalServiceMapping } from "@/types/additional-service-mapping";
import { useOrderShipments } from "../_hooks/use-order-shipments";
import { ShipmentHistory } from "./ShipmentHistory";
import { downloadFileFromBase64 } from "@/lib/utils";
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

interface OrderInfoProps {
  order: MarketplaceOrder;
  productMappings?: Record<string, any>;
  erpIntegration?: ServiceIntegration;
  refetchMappings?: () => void;
  courierProvider?: string;
  onOrderUpdate?: (updatedOrder: MarketplaceOrder) => void;
}

const OrderInfoCard = ({ order, productMappings, erpIntegration, refetchMappings, courierProvider, onOrderUpdate }: OrderInfoProps) => {
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
  const payload = order.details_payload || {};
  const deliveryAddress = payload.delivery?.address || payload;
  const pickupPoint = payload.delivery?.pickupPoint || (payload.delivery_point_id ? payload : null);
  
  const recipientName = `${deliveryAddress.firstName || ""} ${deliveryAddress.lastName || ""}`.trim() || payload.delivery_fullname;
  const lineItems = payload.lineItems || payload.products || [];
  
  const paymentInfo = useMemo(() => {
    if (payload.payment?.type === "CASH_ON_DELIVERY" || String(payload.payment_method_cod) === "1") {
      const amount = payload.cashOnDelivery?.amount || payload.payment_done || order.total_to_pay;
      return { type: "cod", label: "Pobranie", amount, variant: "warning" as const, icon: <CreditCard className="h-3.5 w-3.5" />, color: "text-amber-400" };
    }
    const amount = payload.summary?.totalToPay?.amount || payload.payment_done || order.total_to_pay;
    return { type: "paid", label: "Opłacone", amount, variant: "success" as const, icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-emerald-400" };
  }, [payload, order.total_to_pay]);

  const invoice = payload.invoice || (payload.want_invoice === "1" ? payload : null);
  const hasInvoice = !!(invoice?.required || invoice?.invoice_company);
  const invoiceAddress = hasInvoice ? invoice.address || invoice : {};
  const invoiceName = invoiceAddress?.company?.name || invoiceAddress?.invoice_company || `${invoiceAddress?.naturalPerson?.firstName || invoiceAddress?.firstName || ""} ${invoiceAddress?.naturalPerson?.lastName || invoiceAddress?.lastName || ""}`.trim();
  const taxId = invoiceAddress?.company?.taxId || invoiceAddress?.taxId || invoiceAddress?.invoice_nip;
  const message = payload.messageToSeller?.text || payload.user_comments;
  
  const providerType = order.service_integration?.provider_type;

  return (
    <div className="space-y-6">
      {/* ── HERO HEADER (Premium Design) ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800/90 to-slate-900 shadow-xl shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative p-5">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            {/* Icon + integration */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
                {!providerType && <Package className="h-6 w-6 text-white/70" />}
                {providerType === "ALLEGRO" && <span className="text-white font-bold text-xs uppercase">ALL</span>}
                {providerType === "BASELINKER" && <span className="text-white font-bold text-xs uppercase">BL</span>}
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">
                  {order.service_integration?.name || "Zamówienie ręczne"}
                </p>
                <h1 className="text-lg font-bold text-white leading-tight">
                  #{order.external_order_id}
                </h1>
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

      {/* ── ADDRESSES & INFO ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dostawa */}
        <Card className="border-border/60 shadow-sm bg-card/40">
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" /> Adres Dostawy
              </p>
              {!pickupPoint && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditAddressOpen(true)}>
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="text-sm">
              {pickupPoint ? (
                <>
                  <p className="font-semibold text-primary">{pickupPoint.name || pickupPoint.delivery_point_name}</p>
                  <p className="text-muted-foreground">{pickupPoint.address?.street || pickupPoint.delivery_point_address}</p>
                  <p className="text-muted-foreground">{pickupPoint.address?.zipCode || pickupPoint.delivery_point_postcode} {pickupPoint.address?.city || pickupPoint.delivery_point_city}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">Odbiór w punkcie</Badge>
                </>
              ) : (
                <>
                  <p className="font-semibold">{recipientName}</p>
                  <p className="text-muted-foreground">{deliveryAddress.street || payload.delivery_address}</p>
                  <p className="text-muted-foreground">{deliveryAddress.zipCode || payload.delivery_postcode} {deliveryAddress.city || payload.delivery_city}</p>
                </>
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
              {hasInvoice ? (
                <>
                  <p className="font-semibold">{invoiceName}</p>
                  {taxId && <p className="text-xs text-muted-foreground font-mono mb-0.5">NIP: {taxId}</p>}
                  <p className="text-muted-foreground">{invoiceAddress.street || invoiceAddress.invoice_address}</p>
                  <p className="text-muted-foreground">{invoiceAddress.zipCode || invoiceAddress.invoice_postcode} {invoiceAddress.city || invoiceAddress.invoice_city}</p>
                </>
              ) : (
                <div className="space-y-0.5">
                  <p className="font-semibold text-muted-foreground">{recipientName}</p>
                  <p className="text-muted-foreground">{deliveryAddress.street || payload.delivery_address}</p>
                  <p className="text-muted-foreground">{deliveryAddress.zipCode || payload.delivery_postcode} {deliveryAddress.city || payload.delivery_city}</p>
                  <p className="text-[10px] italic text-muted-foreground mt-2">(Wysłanie domyślne - klient nie prosił o fakturę)</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── PRODUCTS LIST (Premium) ── */}
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
              return (
                <div key={`${item.id || item.order_product_id}-${index}`} className="p-3 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.offer?.name || item.name} className="w-10 h-10 rounded-md object-cover border border-border/60 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-md border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-1">{item.offer?.name || item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-mono">SKU: {offerId || 'Brak'}</span>
                        {mapping ? (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            ERP: {mapping.erp_product_symbol}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-destructive/10 text-destructive border-destructive/20">
                            Brak mapowania
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
}

export function OrderDetailsColumn({
  order,
  onShipmentCreated,
}: OrderDetailsColumnProps) {
  const queryClient = useQueryClient();
  const { data: integrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations"],
    queryFn: async () => (await api.get("/service-integrations")).data,
  });
  const erpIntegration = integrations?.find(i => i.provider_type === "SUBIEKT_GT");

  const { isEnabled: printHubEnabled, status: printHubStatus, defaultLabelPrinter } = usePrintHub();

  const offerIds = useMemo(() => {
    if (!order) return [];
    const items = order.details_payload?.lineItems || order.details_payload?.products || [];
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

  const {
    data: config,
    isLoading: isConfigLoading,
    error: configError,
  } = useShippingConfig();
  const [packages, setPackages] = useState<PackageState[]>([]);
  const getProductSummary = (orderInfo?: MarketplaceOrder | null) => {
    if (!orderInfo) return "";
    const items = orderInfo.details_payload?.lineItems || orderInfo.details_payload?.products || [];
    return items
      .map((item: any) => {
        const name = item.offer?.name || item.name || "Produkt";
        return `${name} x${item.quantity}`;
      })
      .join(", ")
      .substring(0, 50); // Ograniczenie długości referencji InPost
  };

  const [referenceNumber, setReferenceNumber] = useState(getProductSummary(order));

  useEffect(() => {
    setReferenceNumber(getProductSummary(order));
  }, [order]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set()
  );

  // --- Stany ręcznego wyboru kuriera ---
  const [isManualCourier, setIsManualCourier] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>("");
  const [apaczkaServices, setApaczkaServices] = useState<ApaczkaService[]>([]);
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const [valuationItems, setValuationItems] = useState<ValuationItem[]>([]);
  const [isValuating, setIsValuating] = useState(false);

  const [overridePointId, setOverridePointId] = useState<string>("");

  // --- Pickup override states ---
  const [pickupType, setPickupType] = useState("COURIER");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupHoursFrom, setPickupHoursFrom] = useState("09:00");
  const [pickupHoursTo, setPickupHoursTo] = useState("17:00");

  // Reset trybu ręcznego przy każdej zmianie zamówienia
  useEffect(() => {
    setIsManualCourier(false);
    setSelectedCourierId(null);
    setSelectedServiceCode("");
    setApaczkaServices([]);
    setValuationItems([]);
    
    // Inicjalizacja punktu odbioru
    const deliv = order?.details_payload?.delivery || {};
    const pointId = deliv?.pickupPoint?.id || order?.details_payload?.delivery_point_id || "";
    setOverridePointId(pointId);
  }, [order?.id]);

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
      order.details_payload?.delivery_method;
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
      setReferenceNumber(getProductSummary(order));
    } else {
      setPackages([]);
      setReferenceNumber("");
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
        const deliveryMethodName = order.details_payload?.delivery?.method?.name || order.details_payload?.delivery_method;
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

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto glass border-none rounded-2xl">
      <OrderInfoCard 
        order={order} 
        productMappings={productMappings}
        erpIntegration={erpIntegration}
        refetchMappings={refetchMappings}
        courierProvider={isManualCourier ? undefined : mappedCourier?.provider_type}
        onOrderUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
        }}
      />
      {order && (
        <ShipmentHistory
          shipments={shipments || []}
          isLoading={areShipmentsLoading}
          error={shipmentsError}
        />
      )}

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
      <Accordion
        type="single"
        collapsible
        className="w-full border border-border/60 rounded-xl bg-card/40 shadow-sm overflow-hidden"
        defaultValue={totalMessages > 0 ? "chat-history" : undefined}
      >
        <AccordionItem value="chat-history" className="border-0">
          <AccordionTrigger className="text-base font-semibold px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span>Historia Rozmowy</span>
              {totalMessages > 0 && <Badge variant="secondary" className="ml-2">{totalMessages}</Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="border-t border-border/40 h-[400px] overflow-y-auto">
              {order.buyer_login && order.service_integration ? (
                <ChatPanel
                  buyerLogin={order.buyer_login}
                  integrationId={order.service_integration.id}
                  currentOrderId={order.id}
                  myLogin={order.service_integration.external_user_id}
                />
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Brak danych do załadowania rozmowy.
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Card className="border-border/60 shadow-sm bg-card/40 mt-4">
        <CardHeader className="pb-3 border-b border-border/40 mb-3 bg-muted/10">
          <CardTitle className="text-base">Przygotuj Przesyłkę</CardTitle>
          <CardDescription className="text-xs">
            Skonfiguruj paczki i wygeneruj etykiety.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
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
            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertTitle>Wymagana Konfiguracja</AlertTitle>
              <AlertDescription>{mappingWarning}</AlertDescription>
            </Alert>
          )}

          {packages.map((pkg, index) => (
            <div
              key={pkg.id}
              className="p-3 border rounded-lg space-y-3 relative bg-card shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-semibold text-muted-foreground">Paczka #{index + 1}</p>
                {packages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 absolute top-1.5 right-1.5 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removePackage(pkg.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <RadioGroup
                value={pkg.mode}
                onValueChange={(value) =>
                  handlePackageChange(index, "mode", value as any)
                }
                className="flex gap-4 mb-1"
              >
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="predefined" id={`predefined-${pkg.id}`} className="h-3.5 w-3.5" />
                  <Label htmlFor={`predefined-${pkg.id}`} className="cursor-pointer text-xs">Predefiniowane</Label>
                </div>
                <div className="flex items-center space-x-1.5">
                  <RadioGroupItem value="custom" id={`custom-${pkg.id}`} className="h-3.5 w-3.5" />
                  <Label htmlFor={`custom-${pkg.id}`} className="cursor-pointer text-xs">Własne wymiary</Label>
                </div>
              </RadioGroup>

              {pkg.mode === "predefined" ? (
                <div>
                  <Select
                    value={pkg.selectedPackageId}
                    onValueChange={(value) =>
                      handlePackageChange(index, "selectedPackageId", value)
                    }
                    disabled={isConfigLoading}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Wybierz opakowanie..." />
                    </SelectTrigger>
                    <SelectContent>
                      {config?.packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.length_cm}x{p.width_cm}x{p.height_cm}cm,
                          {p.weight_kg}kg)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="pt-2 border-t">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[100px]">
                      <Label htmlFor={`length_cm-${pkg.id}`} className="text-xs text-muted-foreground">Dł. (cm)</Label>
                      <Input id={`length_cm-${pkg.id}`} name="length_cm" value={pkg.customPackage.length_cm} onChange={(e) => handleCustomDimensionChange(index, e)} className="h-8 mt-1" />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <Label htmlFor={`width_cm-${pkg.id}`} className="text-xs text-muted-foreground">Szer. (cm)</Label>
                      <Input id={`width_cm-${pkg.id}`} name="width_cm" value={pkg.customPackage.width_cm} onChange={(e) => handleCustomDimensionChange(index, e)} className="h-8 mt-1" />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <Label htmlFor={`height_cm-${pkg.id}`} className="text-xs text-muted-foreground">Wys. (cm)</Label>
                      <Input id={`height_cm-${pkg.id}`} name="height_cm" value={pkg.customPackage.height_cm} onChange={(e) => handleCustomDimensionChange(index, e)} className="h-8 mt-1" />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <Label htmlFor={`weight_kg-${pkg.id}`} className="text-xs text-muted-foreground">Waga (kg)</Label>
                      <Input id={`weight_kg-${pkg.id}`} name="weight_kg" value={pkg.customPackage.weight_kg} onChange={(e) => handleCustomDimensionChange(index, e)} className="h-8 mt-1" />
                    </div>
                  </div>
                  {mappedCourier?.provider_type === "SUUS" && (
                    <div className="col-span-2">
                      <Label>Typ opakowania SUUS</Label>
                      <Select
                        onValueChange={(value) =>
                          handlePackageChange(index, "courier_code", value)
                        }
                        value={pkg.courier_code}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Wybierz typ opakowania..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SUUS_PACKAGE_CODES).map(
                            ([code, name]) => (
                              <SelectItem key={code} value={code}>
                                {code} - {name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Palet presets */}
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Szybki wybór — Palety</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PALLET_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] gap-1"
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
                          <Box className="h-3 w-3" />
                          {preset.label} ({preset.length}×{preset.width})
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Niestandardowa checkbox */}
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id={`nstd-${pkg.id}`}
                      checked={pkg.is_nstd}
                      onCheckedChange={(checked) =>
                        setPackages((pkgs) =>
                          pkgs.map((p, i) =>
                            i === index ? { ...p, is_nstd: !!checked } : p
                          )
                        )
                      }
                    />
                    <label htmlFor={`nstd-${pkg.id}`} className="text-xs font-medium cursor-pointer">
                      Przesyłka niestandardowa (paleta / gabaryt)
                    </label>
                  </div>
                </div>
              )}

              {isCodOrder && (
                <div className="pt-4 border-t">
                  <Label
                    htmlFor={`cod-amount-${pkg.id}`}
                    className="text-sm font-medium"
                  >
                    Kwota pobrania dla tej paczki (PLN)
                  </Label>
                  <Input
                    id={`cod-amount-${pkg.id}`}
                    value={pkg.codAmount}
                    onChange={(e) =>
                      handleCodAmountChange(index, e.target.value)
                    }
                    placeholder="np. 123.45"
                    className="mt-2"
                    type="number"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addPackage}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Dodaj kolejną paczkę
            </Button>
            {isCodOrder && packages.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSplitCodClick}
              >
                <DivideCircle className="mr-2 h-4 w-4" /> Podziel pobranie równo
              </Button>
            )}
          </div>

          {availableServicesForCourier.length > 0 && (
            <>
              <Separator />
              <div>
                <Label>Usługi dodatkowe</Label>
                <div className="space-y-2 pt-2">
                  {availableServicesForCourier.map((serviceMap) => (
                    <div
                      key={serviceMap.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={serviceMap.id}
                        checked={selectedServices.has(
                          serviceMap.courier_service_code
                        )}
                        onCheckedChange={() =>
                          handleServiceToggle(serviceMap.courier_service_code)
                        }
                      />
                      <label
                        htmlFor={serviceMap.id}
                        className="text-sm font-medium"
                      >
                        {serviceMap.marketplace_service_name}
                        <span className="text-muted-foreground">
                          ({serviceMap.courier_service_code})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── PICKUP / PODJAZD ── */}
          {isApaczkaSelected && (
            <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-3 mt-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Truck className="w-4 h-4 text-muted-foreground" />
                Podjazd kuriera
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Typ nadania</Label>
                  <Select value={pickupType} onValueChange={setPickupType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PICKUP_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data podjazdu</Label>
                  <Input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Od godziny</Label>
                  <Input
                    type="time"
                    value={pickupHoursFrom}
                    onChange={(e) => setPickupHoursFrom(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Do godziny</Label>
                  <Input
                    type="time"
                    value={pickupHoursTo}
                    onChange={(e) => setPickupHoursTo(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── PUNKT ODBIORU ── */}
          {showPickupPoint && (
            <div className="bg-muted/30 p-3 rounded-lg border border-primary/20 space-y-3 mt-4">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <MapPin className="w-4 h-4" />
                Punkt Odbioru / Paczkomat
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="point-id" className="text-xs flex items-center gap-2">
                  ID Punktu (np. WAW53AP, PL12345)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Wprowadź kod punktu odbioru (np. InPost, DHL POP, DPD Pickup). 
                          Jeśli pole jest puste, system spróbuje pobrać dane z zamówienia.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="point-id"
                  value={overridePointId}
                  onChange={(e) => setOverridePointId(e.target.value)}
                  placeholder="Wpisz ID punktu..."
                  className="bg-background font-mono uppercase"
                />
              </div>
            </div>
          )}

          <Separator />
          <div>
            <Label htmlFor="reference-number">
              Numer referencyjny (na etykiecie)
            </Label>
            <Input
              id="reference-number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Domyślnie: nr zamówienia"
              className="mt-2"
            />
          </div>
          <Button
            onClick={handleGenerateLabels}
            className="w-full"
            disabled={isGenerateButtonDisabled}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {isGenerating
              ? "Generowanie..."
              : `Generuj Etykiety (${packages.length})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
