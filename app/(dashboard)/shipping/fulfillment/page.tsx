"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";
import { useShippingConfig } from "../_hooks/use-shipping-config";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { ServiceIntegration } from "@/types/service-integration";
import { useMobile } from "@/hooks/use-mobile";
import { MobileLock } from "@/components/shared/mobile-lock";
import { EditAddressDialog } from "../_components/EditAddressDialog";
import { EditInvoiceDialog } from "../_components/EditInvoiceDialog";
import { ProductMappingDialog } from "../_components/product-mapping-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "../../orders/[id]/_components/chat-panel";
import { Thread } from "@/types/thread";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  ArrowLeft,
  Box,
  CreditCard,
  PackageCheck,
  MapPin,
  Truck,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Printer,
  ArrowRight,
  Tag,
  X,
  Keyboard,
  AlertTriangle,
  Flame,
  MessageSquare,
  Search,
  Layers,
  FileWarning,
  SkipForward,
  CheckCircle,
  History,
  Sparkles,
  ArrowRightLeft,
  ShoppingBag,
  Undo2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AllegroIcon,
  BaseLinkerIcon,
  EmpikIcon,
  InPostIcon,
  SuusIcon,
  RabenIcon,
  GeisIcon,
  GeodisIcon,
  ABIcon,
  SubiektIcon,
} from "@/components/shared/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Plus, Trash, ClipboardList, User, StickyNote, Headphones } from "lucide-react";
import { cn, explodeBundleItems } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SUUS_PACKAGE_CODES, RABEN_PACKAGE_CODES } from "@/lib/courier-data";

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

const getCourierIcon = (providerType?: string, name?: string, className: string = "h-5 w-auto") => {
  const pType = (providerType || "").toUpperCase();
  const cName = (name || "").toUpperCase();

  if (pType === "SUUS" || cName.includes("SUUS")) {
    return <SuusIcon className={cn("shrink-0 drop-shadow", className)} />;
  }
  if (pType === "RABEN" || cName.includes("RABEN")) {
    return <RabenIcon className={cn("shrink-0 drop-shadow", className)} />;
  }
  if (pType === "GEIS" || cName.includes("GEIS")) {
    return <GeisIcon className={cn("shrink-0 drop-shadow", className)} />;
  }
  if (pType === "GEODIS" || cName.includes("GEODIS")) {
    return <GeodisIcon className={cn("shrink-0 drop-shadow", className)} />;
  }
  if (pType.includes("INPOST") || cName.includes("INPOST")) {
    return <InPostIcon className={cn("shrink-0 drop-shadow", className)} />;
  }
  if (pType === "ALLEGRO" || cName.includes("ALLEGRO") || cName.includes("WZA")) {
    return <AllegroIcon className={cn("shrink-0 drop-shadow", className)} />;
  }
  if (pType === "BASELINKER" || cName.includes("BASELINKER")) {
    return <BaseLinkerIcon className={cn("shrink-0 rounded drop-shadow", className)} />;
  }
  if (pType === "EMPIK" || cName.includes("EMPIK")) {
    return <EmpikIcon className={cn("shrink-0 drop-shadow", className)} />;
  }
  if (pType === "APACZKA" || cName.includes("APACZKA")) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs shrink-0 shadow-sm">
        <Truck className="h-3.5 w-3.5" /> Apaczka
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold text-xs shrink-0 shadow-sm">
      <Truck className="h-3.5 w-3.5" /> {name || providerType || "Kurier"}
    </div>
  );
};

// --- Funkcje Pomocnicze do Śledzenia Przesyłek ---
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

function getAllegroCarrierForWaybill(detailsPayload: any, waybill: string): string | undefined {
  if (!detailsPayload) return undefined;
  const shipments: any[] = detailsPayload?.shipments || [];
  const shipMatch = shipments.find((s: any) => s.waybill === waybill || s.waybill?.trim() === waybill.trim());
  if (shipMatch?.carrierId) return shipMatch.carrierId;

  const methodName: string = (detailsPayload?.delivery?.method?.name || "").toLowerCase();
  if (!methodName) return undefined;

  if (methodName.includes("inpost") || methodName.includes("paczkomat")) return "INPOST";
  if (methodName.includes("dpd")) return "DPD";
  if (methodName.includes("dhl")) return "DHL";
  if (methodName.includes("gls")) return "GLS";
  if (methodName.includes("ups")) return "UPS";
  if (methodName.includes("fedex")) return "FEDEX";
  if (methodName.includes("raben")) return "RABEN";
  if (methodName.includes("geis")) return "GEIS";
  if (methodName.includes("suus") || methodName.includes("rohlig")) return "SUUS";
  if (methodName.includes("allegro one") || methodName.includes("allegroone")) return "ALLEGRO_ONE";
  if (methodName.includes("poczta") || methodName.includes("pocztex")) return "POCZTA_POLSKA";

  return undefined;
}

export default function FulfillmentPage() {
  const isMobile = useMobile(1023);
  const router = useRouter();
  const queryClient = useQueryClient();

  // PrintHub hook to auto-print documents
  const {
    isEnabled: printHubEnabled,
    status: printHubStatus,
    defaultLabelPrinter,
    printErpSymbolOnLabel,
    printFullNameOnLabel,
    labelItemsPerPage,
    printHubExcludeNip,
    printHubExcludeB2c,
  } = usePrintHub();

  // 1. Fetch Shipping Config (couriers, predefined packages, delivery mappings)
  const { data: config, isLoading: isConfigLoading } = useShippingConfig();

  // Fetch Organization for custom reference template
  const { data: organization } = useQuery<any>({
    queryKey: ["organization"],
    queryFn: async () => (await api.get("/organization")).data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: serviceMappings } = useQuery<any[]>({
    queryKey: ["additionalServiceMappings"],
    queryFn: async () => (await api.get("/additional-service-mappings")).data,
    enabled: !!config,
  });

  const [pageOffset, setPageOffset] = useState(0);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "ERR_FV" | "ERR_LBL" | "SKIP" | "COMPLETED" | "DROPSHIP">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [lastAction, setLastAction] = useState<{ orderId: string; flag: string } | null>(null);

  // Debounce search query update
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Sync local search when searchQuery is set externally (e.g. from history drawer)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Query to fetch the last 20 completed (SENT) orders for history drawer
  const { data: completedOrdersData, isLoading: isCompletedLoading } = useQuery({
    queryKey: ["completedOrders"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("fulfillmentStatus", "SENT");
      params.append("size", "20");
      params.append("sortBy", "purchased_at");
      params.append("sortOrder", "desc");
      const res = await api.get(`/orders?${params.toString()}`);
      return res.data;
    },
    enabled: isHistoryOpen,
  });

  // Reset offset when filter or search query changes
  useEffect(() => {
    setPageOffset(0);
  }, [queueFilter, searchQuery]);

  // 2. Fetch the order in the queue at the current offset
  const {
    data: queueData,
    isLoading: isQueueLoading,
    refetch: refetchQueue,
    isFetching: isQueueFetching,
  } = useQuery({
    queryKey: ["fulfillmentQueue", pageOffset, queueFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(pageOffset + 1));
      params.append("size", "1");
      params.append("sortBy", "purchased_at");
      params.append("sortOrder", "asc"); // FIFO logic
      
      if (searchQuery) {
        params.append("search", searchQuery);
      } else {
        if (queueFilter === "COMPLETED") {
          params.append("fulfillmentStatus", "SENT");
        } else {
          ["NEW", "PROCESSING", "READY_FOR_SHIPMENT"].forEach((status) => {
            params.append("fulfillmentStatus", status);
          });
        }
        
        if (queueFilter === "ALL") {
          ["SKIP", "TO_CHECK", "ERR_FV", "ERR_LBL", "DROPSHIP"].forEach((flag) => {
            params.append("excludeFlags", flag);
          });
        } else if (queueFilter === "ERR_FV") {
          params.append("flags", "ERR_FV");
        } else if (queueFilter === "ERR_LBL") {
          params.append("flags", "ERR_LBL");
        } else if (queueFilter === "SKIP") {
          params.append("flags", "SKIP");
        } else if (queueFilter === "DROPSHIP") {
          params.append("flags", "DROPSHIP");
        }
      }

      const res = await api.get(`/orders?${params.toString()}`);
      return res.data;
    },
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const currentOrder = queueData?.items?.[0] as MarketplaceOrder | undefined;
  const totalOrders = queueData?.total || 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__currentFulfillmentOrder = currentOrder;
      window.dispatchEvent(new CustomEvent("fulfillment-order-changed", { detail: { order: currentOrder } }));
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__currentFulfillmentOrder;
        window.dispatchEvent(new CustomEvent("fulfillment-order-changed", { detail: { order: null } }));
      }
    };
  }, [currentOrder]);

  // 3. Fetch Service Integrations to find Subiekt GT
  const { data: integrations } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations"],
    queryFn: async () => (await api.get("/service-integrations")).data,
  });
  const erpIntegration = integrations?.find((i) => i.provider_type === "SUBIEKT_GT");

  // Pobieramy konfigurację agenta Subiekt GT (URL + klucz API) bezpośrednio z backendu,
  // żeby PrintHub mógł samodzielnie pobrać PDF faktury bez ręcznej konfiguracji.
  const { data: subiektAgentConfig } = useQuery<{ agent_url: string; api_key: string } | null>({
    queryKey: ["subiektAgentConfig"],
    queryFn: async () => {
      try {
        const res = await api.get("/service-integrations/subiekt-gt/agent-config");
        return res.data;
      } catch {
        // Brak konfiguracji lub integracji — wydruk po prostu nie zadziała (nieblokujące)
        return null;
      }
    },
    enabled: !!erpIntegration && printHubEnabled,
    staleTime: 10 * 60 * 1000, // 10 minut — dane agenta rzadko się zmieniają
    retry: false,
  });

  // 4. Extract line items and fetch ERP product mappings (with image extraction)
  const lineItems = useMemo(() => {
    if (!currentOrder) return [];
    if (currentOrder.service_integration?.provider_type === "EMPIK") {
      return (currentOrder.details_payload?.order_lines || []).map((line: any) => {
        const mediumMedia = line.product_medias?.find((m: any) => m.type === "MEDIUM") || line.product_medias?.[0];
        let imageUrl = mediumMedia?.media_url || null;
        if (imageUrl && imageUrl.startsWith("/")) {
          imageUrl = "https://marketplace.empik.com/mmp" + imageUrl;
        }
        return {
          id: line.offer_id?.toString() || line.offer_sku,
          name: line.product_title || "Produkt",
          quantity: line.quantity || 1,
          offer: { id: line.offer_id?.toString(), name: line.product_title },
          product_id: line.offer_id?.toString(),
          imageUrl: imageUrl,
        };
      });
    }
    const origItems =
      currentOrder.line_items ||
      currentOrder.details_payload?.lineItems ||
      currentOrder.details_payload?.products ||
      [];
    return origItems.map((item: any) => ({
      id: item.offer?.id || item.product_id || item.id,
      name: item.offer?.name || item.name || "Produkt",
      quantity: item.quantity || 1,
      offer: item.offer,
      product_id: item.product_id,
      imageUrl: item.imageUrl || item.image_url || null,
      price: item.price || item.unitPrice || item.unit_price || item.price_unit || item.price_gross || null,
    }));
  }, [currentOrder]);

  const offerIds = useMemo(() => {
    return lineItems.map((item: any) => item.offer?.id || item.product_id).filter(Boolean);
  }, [lineItems]);

  const { data: productMappings, isLoading: isMappingsLoading } = useQuery<Record<string, any>>({
    queryKey: ["productMappings", currentOrder?.service_integration?.id, erpIntegration?.id, offerIds],
    queryFn: async () => {
      if (!currentOrder?.service_integration?.id || !erpIntegration?.id || offerIds.length === 0) return {};
      const params = new URLSearchParams();
      params.append("source_integration_id", currentOrder.service_integration.id.toString());
      params.append("erp_integration_id", erpIntegration.id.toString());
      offerIds.forEach((id: string) => params.append("offer_ids", id));
      const response = await api.get(`/product-erp-mappings/by-offers-and-integrations?${params.toString()}`);
      return response.data;
    },
    enabled: !!currentOrder?.service_integration?.id && !!erpIntegration?.id && offerIds.length > 0,
  });

  const { data: subiektStock, refetch: refetchSubiektStock } = useQuery<any>({
    queryKey: ["subiektStock", currentOrder?.id],
    queryFn: async () => {
      if (!currentOrder?.id) return null;
      const res = await api.get(`/orders/${currentOrder.id}/subiekt-stock`);
      return res.data;
    },
    enabled: !!currentOrder?.id && !!erpIntegration?.id,
  });


  // 5. Package and courier mapping calculation
  const { mappedCourier, mappedPackageId, mappedServiceCode } = useMemo(() => {
    if (!currentOrder || !config) {
      return { mappedCourier: null, mappedPackageId: null, mappedServiceCode: "" };
    }

    // 1. Sprawdź, czy usługi dodatkowe w zamówieniu wymuszają konkretnego kuriera
    if (serviceMappings && serviceMappings.length > 0) {
      const details = currentOrder.details_payload || {};
      const orderServices: string[] = [];

      // Sprawdź w details_payload.delivery.additionalServices
      const deliveryServices = details.delivery?.additionalServices || [];
      deliveryServices.forEach((s: any) => {
        if (s && s.definitionId) {
          orderServices.push(s.definitionId);
        }
      });

      // Sprawdź w lineItems
      const lineItemsList = details.lineItems || details.line_items || [];
      lineItemsList.forEach((item: any) => {
        if (item && item.selectedAdditionalServices) {
          item.selectedAdditionalServices.forEach((s: any) => {
            if (s && s.definitionId) {
              orderServices.push(s.definitionId);
            }
          });
        }
      });

      const providerType = currentOrder.service_integration?.provider_type || "";

      for (const serviceId of orderServices) {
        const matchedSrv = serviceMappings.find(
          (m) =>
            m.marketplace_service_id === serviceId &&
            m.source_integration_provider === providerType
        );
        if (matchedSrv) {
          // Szukamy integracji dla tego kuriera
          const courier = config.couriers.find(
            (c) => c.provider_type === matchedSrv.courier_provider && c.is_active !== false
          );
          if (courier) {
            const defaultPackage = config.packages.find((p) => p.is_default);
            return {
              mappedCourier: courier,
              mappedPackageId: defaultPackage?.id || null,
              mappedServiceCode: matchedSrv.courier_service_code || "",
            };
          }
        }
      }
    }

    // 2. Normalna ścieżka na podstawie metody dostawy
    const deliveryMethodName =
      currentOrder.details_payload?.delivery?.method?.name ||
      currentOrder.details_payload?.delivery_method ||
      (currentOrder.service_integration?.provider_type === "EMPIK" ? currentOrder.details_payload?.shipping_type_label || currentOrder.details_payload?.shipping_type_code : null);
    
    if (!deliveryMethodName) {
      const defaultPackage = config.packages.find((p) => p.is_default);
      return { mappedCourier: null, mappedPackageId: defaultPackage?.id || null, mappedServiceCode: "" };
    }

    const mapping = config.mappings.find(
      (m) =>
        m.marketplace_delivery_method === deliveryMethodName &&
        m.source_integration &&
        m.source_integration.id === currentOrder.service_integration?.id
    );

    const defaultPackage = config.packages.find((p) => p.is_default);
    if (!mapping) {
      return {
        mappedCourier: null,
        mappedPackageId: defaultPackage?.id || null,
        mappedServiceCode: "",
      };
    }
    const courier = config.couriers.find((c) => c.id === mapping.service_integration_id);
    return {
      mappedCourier: courier,
      mappedPackageId: mapping.default_package_definition_id || defaultPackage?.id || null,
      mappedServiceCode: mapping.courier_service_code || "",
    };
  }, [currentOrder, config, serviceMappings]);

  const selectedPackage = useMemo(() => {
    if (!config || !mappedPackageId) return null;
    return config.packages.find((p) => p.id === mappedPackageId) || null;
  }, [config, mappedPackageId]);

  // Order flags and address parsing
  const isCod = useMemo(() => {
    if (!currentOrder) return false;
    if (currentOrder.payment_type === "CASH_ON_DELIVERY") return true;
    if (currentOrder.service_integration?.provider_type === "ALLEGRO") {
      return currentOrder.details_payload?.payment?.type === "CASH_ON_DELIVERY";
    }
    if (currentOrder.service_integration?.provider_type === "EMPIK") {
      const ptype = currentOrder.details_payload?.payment_type || currentOrder.details_payload?.paymentType;
      return !!(ptype && String(ptype).toLowerCase().includes("pobran"));
    }
    return String(currentOrder.details_payload?.payment_method_cod) === "1";
  }, [currentOrder]);

  const shippingCost = useMemo(() => {
    if (!currentOrder || !currentOrder.details_payload) return "0.00";
    const payload = currentOrder.details_payload;
    if (currentOrder.service_integration?.provider_type === "EMPIK") {
      return payload.shipping_price !== undefined && payload.shipping_price !== null 
        ? parseFloat(payload.shipping_price).toFixed(2)
        : "0.00";
    }
    if (currentOrder.service_integration?.provider_type === "ALLEGRO") {
      return payload.delivery?.cost?.amount !== undefined && payload.delivery?.cost?.amount !== null
        ? parseFloat(payload.delivery.cost.amount).toFixed(2)
        : "0.00";
    }
    return payload.delivery_price !== undefined && payload.delivery_price !== null
      ? parseFloat(payload.delivery_price).toFixed(2)
      : "0.00";
  }, [currentOrder]);

  const hasShippingCost = useMemo(() => {
    return shippingCost && parseFloat(shippingCost) > 0;
  }, [shippingCost]);

  const hasInvoiceRequired = useMemo(() => {
    if (!currentOrder) return false;
    if (currentOrder.invoice_address) return true;
    if (currentOrder.details_payload?.invoice?.required) return true;
    return currentOrder.details_payload?.want_invoice === "1";
  }, [currentOrder]);

  const buyerMessage = useMemo(() => {
    if (!currentOrder) return null;
    const payload = currentOrder.details_payload;
    if (!payload) return null;

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
    
    return null;
  }, [currentOrder]);

  const sellerNote = useMemo(() => {
    if (!currentOrder) return undefined;
    const payload = currentOrder.details_payload;
    if (!payload) return undefined;

    if (payload.admin_comments) return payload.admin_comments;
    if (payload.adminComments) return payload.adminComments;
    
    if (payload.note) {
      if (typeof payload.note === "object" && payload.note.text) {
        return payload.note.text;
      }
      if (typeof payload.note === "string") {
        return payload.note;
      }
    }

    if (payload.seller_note) return payload.seller_note;
    if (payload.seller_comment) return payload.seller_comment;
    if (payload.notes && typeof payload.notes === "string") return payload.notes;

    return undefined;
  }, [currentOrder]);

  const deliveryPointId = useMemo(() => {
    if (!currentOrder) return "";
    return (
      currentOrder.details_payload?.delivery?.pickupPoint?.id ||
      currentOrder.details_payload?.delivery_point_id ||
      ""
    );
  }, [currentOrder]);

  // Processing state variables
  const [isProcessing, setIsProcessing] = useState(false);

  // States to override courier, package dimension and service
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [packages, setPackages] = useState<PackageState[]>([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>("");
  const [suggestedPackageInfo, setSuggestedPackageInfo] = useState<{ id: string | null; isNstd: boolean } | null>(null);
  const [apaczkaServices, setApaczkaServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [codEnabled, setCodEnabled] = useState(true);
  const [isReturnLabel, setIsReturnLabel] = useState(false);

  useEffect(() => {
    setCodEnabled(true);
    setIsReturnLabel(false);
  }, [currentOrder?.id]);

  const effectiveIsCod = isCod && codEnabled;

  const courierProvider = useMemo(() => {
    if (selectedCourierId) {
      return config?.couriers.find((c) => c.id === selectedCourierId)?.provider_type;
    }
    return mappedCourier?.provider_type;
  }, [selectedCourierId, mappedCourier, config]);

  const handleServiceToggle = (serviceCode: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceCode)) {
        next.delete(serviceCode);
      } else {
        next.add(serviceCode);
      }
      return next;
    });
  };

  useEffect(() => {
    const autoSelected = new Set<string>();
    if (currentOrder && serviceMappings && courierProvider) {
      const lineItems = currentOrder.details_payload?.lineItems || [];
      for (const item of lineItems) {
        const allegroServices = item.selectedAdditionalServices || [];
        for (const service of allegroServices) {
          const serviceMap = serviceMappings.find(
            (m) =>
              m.marketplace_service_id === service.definitionId &&
              m.courier_provider === courierProvider
          );
          if (serviceMap) {
            autoSelected.add(serviceMap.courier_service_code);
          } else if (courierProvider === "SUUS" && service.definitionId === "CARRY_IN") {
            autoSelected.add("StdWniesienie2");
          }
        }
      }
    }
    setSelectedServices(autoSelected);
  }, [currentOrder, serviceMappings, courierProvider]);

  const availableServicesForCourier = useMemo(() => {
    if (!serviceMappings) return [];
    const filtered = serviceMappings.filter(
      (m) => m.courier_provider === courierProvider
    );

    // Add default SUUS carry-in service if it's SUUS and not already mapped
    if (courierProvider === "SUUS") {
      const hasWniesienie = filtered.some((m) => m.courier_service_code === "StdWniesienie2");
      if (!hasWniesienie) {
        filtered.push({
          id: "default-suus-wniesienie",
          marketplace_service_id: "CARRY_IN",
          marketplace_service_name: "Wniesienie",
          source_integration_provider: "ALLEGRO",
          courier_provider: "SUUS",
          courier_service_code: "StdWniesienie2",
        });
      }
    }

    return filtered;
  }, [serviceMappings, courierProvider]);

  // Dialog open states for address and billing editing
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);

  // Reference number & Conversations states
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Full order details (disputes, returns, related_orders) — fetched separately from queue data
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);

  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [orderTasks, setOrderTasks] = useState<any[]>([]);
  const [isOrderTasksLoading, setIsOrderTasksLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const fetchOrderNotes = useCallback(async () => {
    if (!orderDetails?.id) return;
    setIsNotesLoading(true);
    try {
      const res = await api.get(`/orders/${orderDetails.id}/notes`);
      setOrderNotes(res.data || []);
    } catch {
      // ignore
    } finally {
      setIsNotesLoading(false);
    }
  }, [orderDetails?.id]);

  const fetchOrderTasks = useCallback(async () => {
    if (!orderDetails?.id) return;
    setIsOrderTasksLoading(true);
    try {
      const res = await api.get(`/internal-tasks/?order_id=${orderDetails.id}`);
      setOrderTasks(res.data.items || []);
    } catch {
      // ignore
    } finally {
      setIsOrderTasksLoading(false);
    }
  }, [orderDetails?.id]);

  useEffect(() => {
    if (orderDetails?.id) {
      fetchOrderNotes();
      fetchOrderTasks();
    } else {
      setOrderNotes([]);
      setOrderTasks([]);
    }
  }, [orderDetails?.id, fetchOrderNotes, fetchOrderTasks]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchOrderTasks();
    };
    window.addEventListener("refresh-tasks", handleRefresh);
    return () => window.removeEventListener("refresh-tasks", handleRefresh);
  }, [fetchOrderTasks]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !orderDetails?.id) return;
    setIsSubmittingNote(true);
    try {
      await api.post(`/orders/${orderDetails.id}/notes`, { content: newNoteContent.trim() });
      setNewNoteContent("");
      toast.success("Notatka została dodana.");
      fetchOrderNotes();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Błąd dodawania notatki.";
      toast.error(msg);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę notatkę?")) return;
    try {
      await api.delete(`/notes/${noteId}`);
      toast.success("Notatka została usunięta.");
      fetchOrderNotes();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Błąd usuwania notatki.";
      toast.error(msg);
    }
  };

  const totalCodAmount = currentOrder?.total_to_pay || 0;

  useEffect(() => {
    if (mappedCourier) {
      setSelectedCourierId(mappedCourier.id);
    } else {
      setSelectedCourierId(null);
    }
  }, [mappedCourier]);

  // Synchronize packages on order and suggested package change
  useEffect(() => {
    if (currentOrder && suggestedPackageInfo) {
      const initialCodAmount = effectiveIsCod ? totalCodAmount.toFixed(2) : "";
      setPackages([
        {
          id: crypto.randomUUID(),
          mode: "predefined",
          selectedPackageId: suggestedPackageInfo.id || undefined,
          customPackage: {
            length_cm: "",
            width_cm: "",
            height_cm: "",
            weight_kg: "",
          },
          codAmount: initialCodAmount,
          courier_code: "COL",
          is_nstd: suggestedPackageInfo.isNstd,
        },
      ]);
    } else if (!currentOrder) {
      setPackages([]);
    }
  }, [currentOrder, suggestedPackageInfo, effectiveIsCod, totalCodAmount]);

  // Max reference length based on selected courier and active service
  const maxRefLength = useMemo(() => {
    const selectedCourier = config?.couriers?.find((c) => c.id === selectedCourierId);
    if (!selectedCourier) return 35; // najbezpieczniejszy domyślny fallback

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
      return 35; // DPD, DHL, FedEx, UPS mają limit 35 znaków
    }
    return 35;
  }, [selectedCourierId, selectedServiceCode, apaczkaServices, config]);

  // System automatycznego przycinania numeru referencyjnego przy zmianie limitu kuriera
  useEffect(() => {
    if (referenceNumber && referenceNumber.length > maxRefLength) {
      const truncated = referenceNumber.substring(0, maxRefLength);
      setReferenceNumber(truncated);
      toast(`Numer referencyjny został automatycznie przycięty do ${maxRefLength} znaków ze względu na ograniczenia wybranego kuriera.`, {
        icon: "✂️",
        duration: 3500,
      });
    }
  }, [maxRefLength, referenceNumber]);

  // Address rendering helper (moved up to be used in reference number template)
  const receiverFullName = useMemo(() => {
    if (!currentOrder) return "Brak";
    if (currentOrder.service_integration?.provider_type === "ALLEGRO") {
      return `${currentOrder.details_payload?.delivery?.address?.firstName || ""} ${
        currentOrder.details_payload?.delivery?.address?.lastName || ""
      }`.trim();
    }
    if (currentOrder.service_integration?.provider_type === "EMPIK") {
      const da = currentOrder.delivery_address;
      if (da) {
        return `${da.first_name || ""} ${da.last_name || ""}`.trim();
      }
      const customer = currentOrder.details_payload?.customer;
      if (customer) {
        return `${customer.firstname || ""} ${customer.lastname || ""}`.trim();
      }
    }
    return currentOrder.details_payload?.delivery_fullname || "Brak";
  }, [currentOrder]);

  // Synchronize reference number on order load
  useEffect(() => {
    if (currentOrder && lineItems.length > 0) {
      const template = organization?.default_reference_number_template;
      let summary = "";
      
      if (template) {
        let resolved = template;
        
        // 1. {order_id}
        resolved = resolved.replace(/{order_id}/g, currentOrder.external_order_id || currentOrder.id || "");
        
        // 2. {buyer_login} / {login}
        resolved = resolved.replace(/{buyer_login}/g, currentOrder.buyer_login || "");
        resolved = resolved.replace(/{login}/g, currentOrder.buyer_login || "");
        
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
        const sourceName = currentOrder.service_integration?.provider_type || "";
        resolved = resolved.replace(/{source}/g, sourceName);
        
        summary = resolved.substring(0, maxRefLength);
      } else {
        summary = lineItems
          .map((item: any) => `${item.name} x${item.quantity}`)
          .join(", ")
          .substring(0, maxRefLength);
      }
      setReferenceNumber(summary);
    } else {
      setReferenceNumber("");
    }
  }, [currentOrder, lineItems, maxRefLength, organization, productMappings, receiverFullName]);

  // Fetch threads for the buyer on order load
  useEffect(() => {
    if (currentOrder?.buyer_login && currentOrder?.service_integration?.id) {
      setIsLoadingThreads(true);
      api
        .get<Thread[]>("/threads/by-buyer-login", {
          params: {
            buyer_login: currentOrder.buyer_login,
            integration_id: currentOrder.service_integration.id,
          },
        })
        .then((response) => setThreads(response.data))
        .catch((err) => console.error("Error loading chat threads:", err))
        .finally(() => setIsLoadingThreads(false));
    } else {
      setThreads([]);
    }
  }, [currentOrder]);

  // Fetch full order details (disputes, returns, related_orders) when current order changes
  useEffect(() => {
    if (currentOrder?.id) {
      setIsLoadingOrderDetails(true);
      api
        .get(`/orders/${currentOrder.id}`)
        .then((res) => setOrderDetails(res.data))
        .catch((err) => console.error("Error loading order details:", err))
        .finally(() => setIsLoadingOrderDetails(false));
    } else {
      setOrderDetails(null);
    }
  }, [currentOrder?.id]);

  // Fetch suggested package definition (intelligent mapping) when current order, selected courier or service changes
  useEffect(() => {
    if (!currentOrder) {
      setSuggestedPackageInfo(null);
      return;
    }

    const currentCourierId = selectedCourierId !== null ? selectedCourierId : mappedCourier?.id;
    const currentServiceCode = selectedCourierId !== null ? selectedServiceCode : undefined;

    const controller = new AbortController();

    api
      .get<{ package_definition_id: string | null; is_nstd: boolean }>("/shipping/suggest-packages", {
        params: {
          order_id: currentOrder.id,
          courier_integration_id: currentCourierId || undefined,
          service_code: currentServiceCode || undefined,
        },
        signal: controller.signal,
      })
      .then((res) => {
        setSuggestedPackageInfo({
          id: res.data.package_definition_id,
          isNstd: res.data.is_nstd,
        });
      })
      .catch((err) => {
        if (err.name !== "CanceledError" && err.message !== "canceled") {
          console.error("Failed to fetch suggested package:", err);
          setSuggestedPackageInfo({
            id: mappedPackageId || null,
            isNstd: false,
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [currentOrder, selectedCourierId, selectedServiceCode, mappedCourier, mappedPackageId]);

  const totalMessages = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.messages?.length || 0), 0),
    [threads]
  );


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

  const handleToggleCod = (enabled: boolean) => {
    setCodEnabled(enabled);
    if (!enabled) {
      setPackages((pkgs) => pkgs.map((p) => ({ ...p, codAmount: "" })));
    } else {
      if (isCod) {
        const numPackages = packages.length;
        if (numPackages > 0) {
          const totalCents = Math.round(totalCodAmount * 100);
          const baseCents = Math.floor(totalCents / numPackages);
          let remainderCents = totalCents % numPackages;

          setPackages((pkgs) =>
            pkgs.map((pkg) => {
              let packageCents = baseCents;
              if (remainderCents > 0) {
                packageCents += 1;
                remainderCents--;
              }
              return {
                ...pkg,
                codAmount: (packageCents / 100).toFixed(2),
              };
            })
          );
        }
      }
    }
  };

  const splitCodForPackages = (currentPackages: PackageState[]) => {
    const numPackages = currentPackages.length;
    if (!effectiveIsCod || numPackages === 0) return;

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
    const newCodAmount = effectiveIsCod ? "0.00" : "";
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
    if (effectiveIsCod) {
      splitCodForPackages(newPackages);
    }
  };

  const removePackage = (id: string) => {
    const newPackages = packages.filter((p) => p.id !== id);
    setPackages(newPackages);
    if (effectiveIsCod && newPackages.length > 0) {
      splitCodForPackages(newPackages);
    }
  };

  const handleSplitCodClick = () => {
    splitCodForPackages(packages);
    toast.success("Kwota pobrania została podzielona.");
  };

  // Invoice details extraction and completeness checks
  const invoiceData = useMemo(() => {
    if (!currentOrder) return null;
    
    // Priority 1: Normalized invoice address from DB
    const inv = currentOrder.invoice_address;
    if (inv) {
      return {
        companyName: inv.company_name || null,
        taxId: inv.tax_id || null,
        firstName: inv.first_name || null,
        lastName: inv.last_name || null,
        street: inv.street || null,
        zipCode: inv.zip_code || null,
        city: inv.city || null,
      };
    }
    
    // Priority 2: From details_payload
    const payload = currentOrder.details_payload || {};
    const invoice = payload.invoice || (payload.want_invoice === "1" ? payload : null);
    const invoiceAddress = invoice?.address || invoice || {};
    
    return {
      companyName: invoiceAddress.company?.name || invoiceAddress.invoice_company || null,
      taxId: invoiceAddress.company?.taxId || invoiceAddress.taxId || invoiceAddress.invoice_nip || null,
      firstName: invoiceAddress.naturalPerson?.firstName || invoiceAddress.firstName || invoiceAddress.invoice_fullname?.split(" ")[0] || null,
      lastName: invoiceAddress.naturalPerson?.lastName || invoiceAddress.lastName || invoiceAddress.invoice_fullname?.split(" ").slice(1).join(" ") || null,
      street: invoiceAddress.street || invoiceAddress.invoice_address || null,
      zipCode: invoiceAddress.zipCode || invoiceAddress.zip_code || invoiceAddress.invoice_postcode || null,
      city: invoiceAddress.city || invoiceAddress.invoice_city || null,
    };
  }, [currentOrder]);

  const isInvoiceDataIncomplete = useMemo(() => {
    if (!hasInvoiceRequired) return false;
    if (!invoiceData) return true;
    
    const hasName = !!(invoiceData.companyName?.trim()) || !!(invoiceData.firstName?.trim() && invoiceData.lastName?.trim());
    const hasAddress = !!(invoiceData.street?.trim() && invoiceData.zipCode?.trim() && invoiceData.city?.trim());
    
    return !hasName || !hasAddress;
  }, [hasInvoiceRequired, invoiceData]);

  useEffect(() => {
    if (!selectedCourierId) {
      setApaczkaServices([]);
      setSelectedServiceCode("");
      return;
    }
    // Endpoint /apaczka/services działa tylko dla integracji typu APACZKA
    const selectedCourier = config?.couriers?.find((c) => c.id === selectedCourierId);
    if (!selectedCourier || selectedCourier.provider_type !== "APACZKA") {
      setApaczkaServices([]);
      setSelectedServiceCode("");
      return;
    }
    const fetchServices = async () => {
      try {
        const res = await api.get(`/service-integrations/${selectedCourierId}/apaczka/services`);
        setApaczkaServices(res.data || []);
        if (res.data && res.data.length > 0) {
          const defaultCode = (selectedCourierId === mappedCourier?.id && mappedServiceCode)
            ? mappedServiceCode
            : res.data[0].id;
          setSelectedServiceCode(defaultCode);
        }
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchServices();
  }, [selectedCourierId, config?.couriers, mappedCourier?.id, mappedServiceCode]);

  // Sync index to stay within queue limits if items are processed/flagged
  useEffect(() => {
    if (totalOrders > 0 && pageOffset >= totalOrders) {
      setPageOffset(Math.max(0, totalOrders - 1));
    }
  }, [totalOrders, pageOffset]);

  const handleAddFlag = useCallback(async (flagType: "SKIP" | "TO_CHECK" | "DROPSHIP") => {
    if (!currentOrder || isFlagging) return;
    if (currentOrder.flags?.includes(flagType)) return;
    setIsFlagging(true);
    try {
      await api.post(`/orders/${currentOrder.id}/flags`, { flag: flagType });
      setLastAction({ orderId: currentOrder.id, flag: flagType });
      toast.success(
        `Przypisano flagę: ${
          flagType === "SKIP"
            ? "Omiń"
            : flagType === "DROPSHIP"
            ? "Dropshipping"
            : "Do sprawdzenia"
        }`
      );
      queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Nie udało się przypisać flagi.");
    } finally {
      setIsFlagging(false);
    }
  }, [currentOrder, isFlagging, queryClient]);

  const handleUndo = useCallback(async () => {
    if (!lastAction) {
      toast("Brak akcji do cofnięcia.", { icon: "ℹ️" });
      return;
    }
    const { orderId, flag } = lastAction;
    try {
      await api.delete(`/orders/${orderId}/flags/${flag}`);
      toast.success(`Cofnięto dodanie flagy: ${flag}`);
      setLastAction(null);
      queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
    } catch (err) {
      toast.error("Nie udało się cofnąć dodania flagy.");
    }
  }, [lastAction, queryClient]);

  const handleRemoveFlag = useCallback(async (flag: string) => {
    if (!currentOrder) return;
    try {
      await api.delete(`/orders/${currentOrder.id}/flags/${flag}`);
      toast.success(`Usunięto flagę: ${flag}`);
      queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Nie udało się usunąć flagi.");
    }
  }, [currentOrder, queryClient]);

  const handleUpdateFulfillmentStatus = useCallback(async (newStatus: string) => {
    if (!currentOrder) return;
    try {
      await api.patch(`/orders/${currentOrder.id}/fulfillment-status`, { fulfillment_status: newStatus });
      toast.success(`Zmieniono status realizacji na: ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Nie udało się zmienić statusu.");
    }
  }, [currentOrder, queryClient]);

  // Polling Subiekt GT invoice creation task
  const pollTaskStatus = useCallback((taskId: string): Promise<{ document_number: string }> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes
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
            // Backend zapisuje result jako data.result.result.document_number
            // (tasks endpoint zwraca cały obiekt Redis jako `result`, a wynik zadania jest w result.result)
            const docNumber =
              data.result?.result?.document_number ||
              data.result?.document_number;
            if (!docNumber) {
              reject(new Error("Faktura wystawiona, ale brak numeru dokumentu w odpowiedzi serwera."));
              return;
            }
            resolve({ document_number: docNumber });
          } else if (data.status === "FAILURE" || data.status === "FAILED") {
            clearInterval(interval);
            const errMsg =
              data.result?.result?.error ||
              data.result?.error ||
              "Błąd podczas tworzenia faktury w Subiekcie GT.";
            reject(new Error(errMsg));
          }
        } catch (err: any) {
          clearInterval(interval);
          const errMsg = err.response?.data?.detail || err.message || "Błąd połączenia z serwerem";
          reject(new Error(errMsg));
        }
      }, 2000);
    });
  }, []);

  // Main automated fulfillment sequence
  const handleProcessOrder = useCallback(async () => {
    if (!currentOrder || isProcessing) return;

    // Verify product mappings
    let missingMapping = false;
    for (const item of lineItems) {
      const offerId = item.offer?.id || item.product_id;
      if (!offerId) continue;
      const mappedSymbol = productMappings?.[offerId]?.erp_product_symbol;
      if (!mappedSymbol) {
        missingMapping = true;
      }
    }

    if (missingMapping) {
      toast.error("Nie możesz nabbić zamówienia z brakującym mapowaniem ERP! Użyj flagi 'Do sprawdzenia' lub 'Omiń'.");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Rozpoczynanie procesu szybkiej realizacji...");

    try {
      // 1. Invoice creation check and execution
      const existingInvoice = currentOrder.erp_sales_document_number || currentOrder.erpSalesDocumentNumber;
      let invoiceResult = { document_number: existingInvoice || "" };

      if (!existingInvoice) {
        toast.loading("Wystawianie faktury w Subiekcie GT...", { id: toastId });
        const mappingsPayload: Record<string, string> = {};
        for (const item of lineItems) {
          const offerId = item.offer?.id || item.product_id;
          if (offerId) {
            mappingsPayload[offerId] = productMappings?.[offerId]?.erp_product_symbol;
          }
        }

        const invoiceRes = await api.post(`/sales-invoices/orders/${currentOrder.id}/create-sales-invoice`, {
          product_mappings: mappingsPayload,
        });

        const taskId = invoiceRes.data.task_id;
        if (!taskId) {
          throw new Error("Brak identyfikatora zadania wystawiania faktury.");
        }

        try {
          invoiceResult = await pollTaskStatus(taskId);
        } catch (invoiceErr: any) {
          // Tag order with ERR_FV flag
          try {
            await api.post(`/orders/${currentOrder.id}/flags`, { flag: "ERR_FV" });
          } catch (flagErr) {
            console.error("Failed to set ERR_FV flag:", flagErr);
          }
          throw invoiceErr;
        }

        // ── Automatyczny wydruk faktury FS przez PrintHub + suppprint.exe ──
        // Ta operacja jest NIEBLOKUJĄCA — błąd wydruku nie przerywa realizacji zamówienia.
        const taxId = currentOrder?.invoice_address?.tax_id || currentOrder?.invoiceAddress?.tax_id || currentOrder?.invoiceAddress?.taxId;
        const hasNip = !!(taxId && taxId.trim());
        const isExcluded = (hasNip && printHubExcludeNip) || (!hasNip && printHubExcludeB2c);

        if (printHubEnabled && printHubStatus === "connected" && invoiceResult.document_number && !isExcluded) {
          try {
            printHubService.printSalesInvoice(
              invoiceResult.document_number,
              subiektAgentConfig?.agent_url,
              subiektAgentConfig?.api_key
            );
            console.log(
              `[FulfillmentPage] Zlecono wydruk faktury FS: ${invoiceResult.document_number}`
            );
          } catch (printErr) {
            // Błąd call-site (np. WS zamknięty) — logujemy jako ostrzeżenie
            console.warn("[FulfillmentPage] Nie udało się zlecić wydruku faktury FS:", printErr);
            toast("⚠️ Nie udało się zlecić wydruku faktury FS — PrintHub niedostępny.", {
              duration: 3000,
            });
          }
        }

        // Clear ERR_FV flag on success if present
        if (currentOrder.flags?.includes("ERR_FV")) {
          try {
            await api.delete(`/orders/${currentOrder.id}/flags/ERR_FV`);
          } catch (flagErr) {
            console.error("Failed to clear ERR_FV flag:", flagErr);
          }
        }
      } else {
        toast.loading("Faktura już wystawiona w ERP: " + existingInvoice, { id: toastId });
        // Clear ERR_FV flag if present since invoice exists
        if (currentOrder.flags?.includes("ERR_FV")) {
          try {
            await api.delete(`/orders/${currentOrder.id}/flags/ERR_FV`);
          } catch (flagErr) {
            console.error("Failed to clear ERR_FV flag:", flagErr);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      toast.loading("Generowanie listu przewozowego kuriera...", { id: toastId });

      // 2. Shipping labels generation
      const activeCourier = config?.couriers?.find((c) => c.id === selectedCourierId);
      if (activeCourier?.provider_type === "APACZKA" && !selectedServiceCode) {
        toast.error("Musisz wybrać usługę kurierską Apaczki.");
        setIsProcessing(false);
        return;
      }
      const refToUse = referenceNumber.trim() || lineItems.map((item: any) => `${item.name} x${item.quantity}`).join(", ").substring(0, maxRefLength);
      
      const packagesPayload = [];
      for (const [index, pkg] of packages.entries()) {
        let packageDef = null;
        if (pkg.mode === "predefined") {
          if (!pkg.selectedPackageId) {
            toast.error(`Paczka #${index + 1}: Musisz wybrać opakowanie.`);
            setIsProcessing(false);
            return;
          }
          packageDef = config?.packages.find((p) => p.id === pkg.selectedPackageId) || null;
        }
        const currentPayload: any = {
          cod_amount: effectiveIsCod ? parseFloat(pkg.codAmount.replace(",", ".")) : undefined,
          is_nstd: pkg.is_nstd,
          courier_code: pkg.courier_code || undefined,
        };
        if (pkg.mode === "predefined") {
          currentPayload.package_definition_id = pkg.selectedPackageId;
        } else {
          try {
            const parsed = {
              length_cm: parseFloat(pkg.customPackage.length_cm.replace(",", ".")),
              width_cm: parseFloat(pkg.customPackage.width_cm.replace(",", ".")),
              height_cm: parseFloat(pkg.customPackage.height_cm.replace(",", ".")),
              weight_kg: parseFloat(pkg.customPackage.weight_kg.replace(",", ".")),
            };
            if (Object.values(parsed).some((v) => isNaN(v) || v <= 0))
              throw new Error("Wymiary muszą być poprawnymi liczbami dodatnimi.");
            currentPayload.custom_package = parsed;
          } catch (error: any) {
            toast.error(`Paczka #${index + 1}: ${error.message}`);
            setIsProcessing(false);
            return;
          }
        }
        packagesPayload.push(currentPayload);
      }

      const labelsPayload: any = {
        order_id: currentOrder.id,
        reference_number: refToUse,
        packages: packagesPayload,
        manual_additional_services: Array.from(selectedServices),
        is_return: isReturnLabel,
      };

      const selectedCourier = config?.couriers?.find((c) => c.id === selectedCourierId);
      const isManual = selectedCourierId !== mappedCourier?.id || 
                       (selectedCourier?.provider_type === "APACZKA" && selectedServiceCode !== mappedServiceCode);
      if (isManual && selectedCourierId) {
        labelsPayload.override_courier_integration_id = selectedCourierId;
        if (selectedServiceCode) {
          labelsPayload.override_service_code = selectedServiceCode;
        }
      }

      let createdShipments = [];
      try {
        const generateRes = await api.post("/shipping/generate-labels", labelsPayload);
        createdShipments = generateRes.data || [];
      } catch (labelErr: any) {
        // Tag order with ERR_LBL flag
        try {
          await api.post(`/orders/${currentOrder.id}/flags`, { flag: "ERR_LBL" });
        } catch (flagErr) {
          console.error("Failed to set ERR_LBL flag:", flagErr);
        }
        throw labelErr;
      }

      // Clear ERR_LBL flag on success if present
      if (currentOrder.flags?.includes("ERR_LBL")) {
        try {
          await api.delete(`/orders/${currentOrder.id}/flags/ERR_LBL`);
        } catch (flagErr) {
          console.error("Failed to clear ERR_LBL flag:", flagErr);
        }
      }

      toast.loading("Automatyczny wydruk etykiet kurierskich...", { id: toastId });

      // Zbieramy pozycje które mają mapowanie ERP (raz dla całego zamówienia/paczek)
      let erpItems = (productMappings
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

      if (erpIntegration?.id && erpItems.length > 0 && productMappings) {
        try {
          const symbols = erpItems.map((item) => item.erpSymbol);
          const componentsResponse = await api.post(`/erp-proxy/integrations/${erpIntegration.id}/products/components/bulk`, { symbols });
          const bundleComponents = componentsResponse.data;
          erpItems = explodeBundleItems(lineItems, productMappings, bundleComponents);
        } catch (compErr) {
          console.error("Failed to fetch bundle components for printing, using fallback:", compErr);
        }
      }

      // 3. PrintHub Direct Printing
      let printSuccess = false;
      for (const shipment of createdShipments) {
        try {
          const labelResponse = await api.get(`/shipping/shipments/${shipment.id}/label`);
          const { label_data, label_format, tracking_number } = labelResponse.data;
          const fileName = `etykieta-${tracking_number || shipment.id}.${label_format.toLowerCase()}`;

          if (printHubEnabled && printHubStatus === "connected") {
            if (label_format === "ZPL" || label_format === "EPL") {
              printHubService.printRaw(label_data, fileName, {
                printerName: defaultLabelPrinter || undefined,
              });
            } else {
              printHubService.printPdf(label_data, fileName, {
                printerName: defaultLabelPrinter || undefined,
                printErpSymbols: printErpSymbolOnLabel,
                printFullName: printFullNameOnLabel,
                labelItemsPerPage: labelItemsPerPage,
                erpItems: erpItems,
              });
            }
            printSuccess = true;
          }
        } catch (printErr) {
          console.error("PrintHub Error:", printErr);
        }
      }

      toast.success(
        <div className="flex flex-col gap-1 text-left text-sm">
          <span className="font-semibold text-emerald-400">Zamówienie zrealizowane!</span>
          <span className="text-xs text-muted-foreground">
            Faktura: <strong className="font-mono bg-emerald-500/15 dark:bg-emerald-500/20 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400 ml-1">{invoiceResult.document_number}</strong>
          </span>
          {printSuccess && <span className="text-[11px] text-emerald-300">Wysłano dokumenty do PrintHub</span>}
        </div>,
        { id: toastId, duration: 4000 }
      );

      // Invalidate queries to refresh list & load next order
      queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
      queryClient.invalidateQueries({ queryKey: ["completedOrders"] });

    } catch (err: any) {
      console.error(err);
      // Invalidate queries to ensure UI is in sync and error flags / erp numbers are fetched immediately
      queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });

      const detail = err.response?.data?.detail;
      const errMsg = detail
        ? (typeof detail === "object" && detail.message ? detail.message : (typeof detail === "string" ? detail : err.message))
        : (err.message || "Nieznany błąd podczas szybkiego nabijania.");

      toast.error(
        <div className="flex flex-col gap-1 text-left text-sm">
          <span className="font-semibold text-rose-400">Realizacja nie powiodła się</span>
          <span className="text-xs text-slate-300">{errMsg}</span>
        </div>,
        { id: toastId, duration: 5000 }
      );
    } finally {
      setIsProcessing(false);
    }
  }, [currentOrder, lineItems, productMappings, isCod, packages, config, selectedCourierId, mappedCourier, selectedServiceCode, isProcessing, pollTaskStatus, printHubEnabled, printHubStatus, defaultLabelPrinter, printErpSymbolOnLabel, subiektAgentConfig, queryClient]);

  // 6. Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts if user is typing in inputs or textareas
      const activeEl = document.activeElement?.tagName;
      if (activeEl === "INPUT" || activeEl === "TEXTAREA") return;

      // Sprawdź skrót Ctrl+Z (Undo)
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ignoruj skróty przy wciśniętych klawiszach modyfikujących (Ctrl, Alt, Meta/Command)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      if (!currentOrder || isProcessing || isFlagging) {
        if (e.key === "Escape") {
          e.preventDefault();
          router.push("/shipping");
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "enter":
        case " ":
          e.preventDefault();
          handleProcessOrder();
          break;
        case "s":
        case "arrowright":
          e.preventDefault();
          handleAddFlag("SKIP");
          break;
        case "t":
          e.preventDefault();
          handleAddFlag("TO_CHECK");
          break;
        case "d":
          e.preventDefault();
          handleAddFlag("DROPSHIP");
          break;
        case "r":
          e.preventDefault();
          if (currentOrder.flags && currentOrder.flags.length > 0) {
            currentOrder.flags.forEach((f) => handleRemoveFlag(f));
          } else {
            toast("Brak przypisanych flag do usunięcia.", { icon: "🧹" });
          }
          break;
        case "[":
          e.preventDefault();
          setPageOffset((prev) => Math.max(0, prev - 1));
          break;
        case "]":
          e.preventDefault();
          setPageOffset((prev) => prev + 1);
          break;
        case "escape":
          e.preventDefault();
          router.push("/shipping");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentOrder, isProcessing, isFlagging, handleProcessOrder, handleAddFlag, handleRemoveFlag, handleUndo, router, setPageOffset]);

  if (isMobile) {
    return (
      <MobileLock
        title="Panel Realizacji Zamówień Niedostępny na Tablecie/Telefonie"
        description="Fulfillment (pakowanie i realizacja wysyłek) wymaga stacjonarnego ekranu o rozdzielczości min. 1024px, a także podłączenia lokalnej drukarki etykiet i stacjonarnego skanera za pośrednictwem PrintHub. Ze względów bezpieczeństwa ta sekcja jest zablokowana na urządzeniach mobilnych."
      />
    );
  }

  // Page loader and state checks
  if (isConfigLoading || isQueueLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-3 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="text-sm font-medium">Ładowanie kolejki realizacji...</span>
      </div>
    );
  }



  const deliveryMethodName = currentOrder
    ? (currentOrder.service_integration?.provider_type === "ALLEGRO"
      ? currentOrder.details_payload?.delivery?.method?.name || "Nie określono"
      : currentOrder.service_integration?.provider_type === "EMPIK"
      ? currentOrder.details_payload?.shipping_type_label || currentOrder.details_payload?.shipping_type_code || "Nie określono"
      : currentOrder.details_payload?.delivery_method || "Nie określono")
    : "Nie określono";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background text-foreground">
      
      {/* 1. TOP HEADER SECTION */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-slate-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/shipping")}
            className="text-muted-foreground hover:text-foreground rounded-lg px-2 hover:bg-accent/5"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Powrót (Esc)
          </Button>
          <div className="h-4 w-px bg-border/30" />
          <h1 className="text-lg font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500" /> Stacja Nabijania
          </h1>
          
          <div className="relative w-64 ml-4 shrink-0">
            {isQueueFetching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-550 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            <input
              type="text"
              placeholder="Szukaj (ID, login, email)..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-950/20 border border-border/30 rounded-xl py-1.5 pl-9 pr-8 text-xs text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Queue filter selection pills */}
        <div className="flex bg-slate-950/20 p-1 border border-border/30 rounded-xl gap-1 text-[11px] shrink-0">
          <button
            type="button"
            onClick={() => setQueueFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 border",
              queueFilter === "ALL"
                ? "bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 dark:border-indigo-500/30"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-500" /> Kolejka główna
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter("ERR_FV")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 border",
              queueFilter === "ERR_FV"
                ? "bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Błąd FV
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter("ERR_LBL")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 border",
              queueFilter === "ERR_LBL"
                ? "bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            <Box className="h-3.5 w-3.5 text-amber-500" /> Błąd Listu
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter("DROPSHIP")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 border",
              queueFilter === "DROPSHIP"
                ? "bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/20 dark:border-indigo-500/30"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            <Truck className="h-3.5 w-3.5 text-indigo-500" /> Dropshipping
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter("SKIP")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 border",
              queueFilter === "SKIP"
                ? "bg-slate-900/15 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-border"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            <SkipForward className="h-3.5 w-3.5 text-muted-foreground" /> Ominięte
          </button>
        </div>

        {/* Queue navigation & History buttons */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-border/30 hover:bg-accent/5 text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold cursor-pointer"
              >
                <History className="h-3.5 w-3.5" />
                <span>Zrealizowane</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-950/95 border-l border-border/30 text-foreground w-[450px] sm:max-w-[450px] flex flex-col p-0">
              <SheetHeader className="p-6 border-b border-border/30">
                <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-500" />
                  Historia zrealizowanych
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                {isCompletedLoading ? (
                  <div className="flex flex-col justify-center items-center h-[200px] gap-2 text-slate-400 text-xs">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                    <span>Pobieranie historii...</span>
                  </div>
                ) : !completedOrdersData?.items || completedOrdersData.items.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-[200px] text-slate-400 text-xs italic">
                    Brak zrealizowanych zamówień.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {completedOrdersData.items.map((order: MarketplaceOrder) => {
                      const clientName = order.service_integration?.provider_type === "ALLEGRO"
                        ? `${order.details_payload?.delivery?.address?.firstName || ""} ${order.details_payload?.delivery?.address?.lastName || ""}`.trim()
                        : order.details_payload?.delivery_fullname || order.buyer_login || "Brak danych";
                        
                      return (
                        <div
                          key={order.id}
                          onClick={() => {
                            setSearchQuery(order.external_order_id || order.id);
                            setIsHistoryOpen(false);
                            toast.success(`Załadowano zamówienie ${order.external_order_id || order.id}`);
                          }}
                          className="group flex flex-col gap-1.5 p-3 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {order.service_integration?.provider_type === "ALLEGRO" && <AllegroIcon className="h-4 w-auto shrink-0" />}
                              {order.service_integration?.provider_type === "BASELINKER" && <BaseLinkerIcon className="h-4 w-auto rounded-sm shrink-0" />}
                              {order.service_integration?.provider_type === "EMPIK" && <EmpikIcon className="h-4 w-auto rounded-sm shrink-0" />}
                              <span className="text-xs font-mono font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                                {order.external_order_id || order.id}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {order.purchased_at ? new Date(order.purchased_at).toLocaleString("pl-PL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium truncate max-w-[220px]">{clientName}</span>
                            <span className="text-indigo-300 font-semibold font-mono">
                              {((order.total_to_pay || order.totalToPay || 0)).toFixed(2)} PLN
                            </span>
                          </div>
                          {order.tracking_numbers && order.tracking_numbers.length > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                              <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              {order.tracking_numbers.map((t, idx) => {
                                const allegroCarrier = getAllegroCarrierForWaybill(order.details_payload || order.detailsPayload, t);
                                const trackingUrl = getTrackingUrl(
                                  t,
                                  allegroCarrier || order.service_integration?.provider_type || order.serviceIntegration?.provider_type
                                );
                                return trackingUrl ? (
                                  <a
                                    key={idx}
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300"
                                  >
                                    {t} <ExternalLink className="h-2 w-2" />
                                  </a>
                                ) : (
                                  <span key={idx}>{t}</span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-full">
            <Button
              variant="ghost"
              size="icon"
              disabled={pageOffset === 0}
              onClick={() => setPageOffset((prev) => Math.max(0, prev - 1))}
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
              title="Poprzednie zamówienie ([)"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-slate-300 font-semibold px-1 text-xs min-w-[130px] text-center">
              {totalOrders > 0 ? (
                <>
                  Zamówienie <span className="text-indigo-400 font-mono font-bold">{pageOffset + 1}</span> z <span className="text-indigo-400 font-mono font-bold">{totalOrders}</span>
                </>
              ) : (
                <span className="text-slate-400 italic">Kolejka pusta</span>
              )}
            </span>

            <Button
              variant="ghost"
              size="icon"
              disabled={totalOrders === 0 || pageOffset >= totalOrders - 1}
              onClick={() => setPageOffset((prev) => prev + 1)}
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
              title="Następne zamówienie (])"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* 2. PROGRESS QUEUE PROGRESS BAR */}
      <div className="w-full shrink-0">
        <Progress value={((pageOffset + 1) / Math.max(1, totalOrders)) * 100} className="h-1 bg-slate-900 rounded-none" />
      </div>

      {/* Search active banner */}
      {searchQuery && (
        <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-6 py-2 flex items-center justify-between text-xs text-indigo-300 shrink-0">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
            <span>Podgląd wyszukanego zamówienia dla: <strong className="font-mono text-foreground font-bold">&quot;{searchQuery}&quot;</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalSearch("");
              setSearchQuery("");
            }}
            className="h-6 px-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-md text-[11px] cursor-pointer"
          >
            Wróć do kolejki głównej
          </Button>
        </div>
      )}

      {/* 3. MAIN DASHBOARD CONTENT */}
      {!currentOrder ? (
        searchQuery ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center max-w-lg mx-auto px-6 animate-fade-in">
            <div className="p-4 bg-slate-900 rounded-full border border-border/30 text-slate-400">
              <Search className="h-16 w-16 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Brak wyników wyszukiwania</h2>
            <p className="text-sm text-muted-foreground font-medium">
              Nie znaleźliśmy zamówień pasujących do zapytania: <span className="font-semibold text-indigo-400">&quot;{searchQuery}&quot;</span>.
            </p>
            <Button
              onClick={() => {
                setLocalSearch("");
                setSearchQuery("");
              }}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              Wyczyść wyszukiwanie
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center max-w-lg mx-auto px-6 animate-fade-in">
            <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/30 text-emerald-400 animate-bounce">
              <CheckCircle className="h-16 w-16" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Kolejka zrealizowana</h2>
            <p className="text-sm text-muted-foreground font-medium">
              {queueFilter === "ALL"
                ? "Wszystkie zamówienia do wysłania zostały pomyślnie zrealizowane i nabite. Kolejka magazynowa jest pusta!"
                : queueFilter === "ERR_FV"
                ? "Brak zamówień z błędami faktur w tej kolejce."
                : queueFilter === "ERR_LBL"
                ? "Brak zamówień z błędami listów przewozowych w tej kolejce."
                : queueFilter === "DROPSHIP"
                ? "Brak zamówień dropshippingowych w tej kolejce."
                : "Brak ominiętych zamówień w tej kolejce."}
            </p>
            <Button
              onClick={() => {
                if (queueFilter !== "ALL") {
                  setQueueFilter("ALL");
                } else {
                  router.push("/shipping");
                }
              }}
              className="mt-2 bg-gradient-to-r from-emerald-500 to-indigo-600 border-none hover:shadow-emerald-500/20 text-white font-medium shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              {queueFilter !== "ALL" ? "Powrót do kolejki głównej" : "Powrót do wysyłek"}
            </Button>
          </div>
        )
      ) : (
        <main className="flex-1 flex overflow-hidden p-6 gap-6 min-h-0 bg-slate-950/60 backdrop-blur-md">
        
        {/* LEFT COLUMN: ORDER DETAILS PODGLĄD (55% width) */}
        <section className="w-[58%] xl:w-[55%] flex flex-col overflow-y-auto pr-2 gap-4 scrollbar-thin">
          
          <Tabs defaultValue="details" className="w-full flex flex-col gap-4">
            <TabsList className="bg-slate-900/80 border border-border/20 p-1 rounded-xl w-full flex flex-wrap gap-0.5 shrink-0">
              <TabsTrigger value="details" className="flex-1 min-w-0 text-xs py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <Box className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Produkty i Paczki</span>
              </TabsTrigger>
              {/* Rozmowy — tab visible only if there are threads */}
              {threads.length > 0 && (
                <TabsTrigger value="chat" className="flex-1 min-w-0 text-xs py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Rozmowy</span>
                  {totalMessages > 0 && (
                    <span className="bg-orange-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold animate-pulse shrink-0">
                      {totalMessages}
                    </span>
                  )}
                </TabsTrigger>
              )}

              {/* Zwroty i Spory — tab visible only if there's data */}
              {((orderDetails?.returns?.length || 0) + (orderDetails?.disputes?.length || 0)) > 0 && (
                <TabsTrigger value="zwroty" className="flex-1 min-w-0 text-xs py-2 rounded-lg data-[state=active]:bg-rose-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <ArrowRightLeft className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Zwroty/Spory</span>
                  <span className={`rounded-full text-[9px] px-1.5 py-0.5 font-bold shrink-0 ${
                    (orderDetails?.disputes?.filter((d: any) => d.status === "ONGOING").length || 0) > 0
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-amber-500 text-white"
                  }`}>
                    {(orderDetails?.returns?.length || 0) + (orderDetails?.disputes?.length || 0)}
                  </span>
                </TabsTrigger>
              )}
              {/* Inne zamówienia — tab visible only if there's data */}
              {(orderDetails?.related_orders?.length || 0) > 0 && (
                <TabsTrigger value="inne" className="flex-1 min-w-0 text-xs py-2 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <ShoppingBag className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Inne zamówienia</span>
                  <span className="bg-emerald-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold shrink-0">
                    {orderDetails.related_orders.length}
                  </span>
                </TabsTrigger>
              )}
              <TabsTrigger value="tasks" className="flex-1 min-w-0 text-xs py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <ClipboardList className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Zadania & Notatki</span>
                {(orderTasks.length + orderNotes.length) > 0 && (
                  <span className="bg-indigo-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold shrink-0">
                    {orderTasks.length + orderNotes.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 flex flex-col gap-4 focus:outline-none">
              {/* Order card info details */}
              <Card className="p-6 border border-border/30 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-4">
            
            {/* Order Hero Header */}
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-3">
                {currentOrder.service_integration?.provider_type === "ALLEGRO" && <AllegroIcon className="h-6 w-auto shrink-0" />}
                {currentOrder.service_integration?.provider_type === "BASELINKER" && (
                  <BaseLinkerIcon className="h-6 w-auto rounded-sm shrink-0" />
                )}
                {currentOrder.service_integration?.provider_type === "EMPIK" && (
                  <EmpikIcon className="h-6 w-auto shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-base leading-none">
                      {currentOrder.buyer_login || "Brak loginu"}
                    </h3>
                    <Badge variant="outline" className="bg-slate-900 border-border/30 text-[9px] text-muted-foreground font-semibold px-2 py-0.5 shadow-sm">
                      {currentOrder.service_integration?.name || currentOrder.service_integration?.provider_type || "Zamówienie"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono mt-1 block">
                    ID: {currentOrder.external_order_id || currentOrder.id}
                  </span>
                  
                  {/* Wysyłka i Płatność pod numerem zamówienia */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap bg-slate-950/20 border border-white/5 px-2.5 py-1 rounded-lg w-fit shadow-inner">
                    <span className="text-[9px] text-slate-400 font-bold uppercase mr-1 select-none">Wysyłka i płatność:</span>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[9px] px-2 py-0.5 font-medium text-primary">
                      {deliveryMethodName}
                    </Badge>
                    {isCod ? (
                      <Badge className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 text-[9px] px-2 py-0.5 font-semibold">
                        <CreditCard className="h-3 w-3 mr-1" /> Pobranie: {currentOrder.total_to_pay?.toFixed(2)} PLN
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 font-semibold">
                        <PackageCheck className="h-3 w-3 mr-1" /> Opłacone
                      </Badge>
                    )}
                    {hasInvoiceRequired && (
                      <Badge className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-[9px] px-2 py-0.5 font-semibold">
                        <FileText className="h-3 w-3 mr-1" /> Wymagana FV
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400">
                  {currentOrder.purchased_at
                    ? new Date(currentOrder.purchased_at).toLocaleString("pl-PL", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "Brak daty"}
                </span>
                <Select
                  value={currentOrder.fulfillment_status || "NEW"}
                  onValueChange={handleUpdateFulfillmentStatus}
                >
                  <SelectTrigger className="h-6 text-[10px] font-semibold border-border/30 bg-slate-900/60 text-foreground hover:bg-accent/10 transition-colors w-[150px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/30 text-foreground">
                    <SelectItem value="NEW">Nowe (NEW)</SelectItem>
                    <SelectItem value="PROCESSING">W realizacji (PROCESSING)</SelectItem>
                    <SelectItem value="READY_FOR_SHIPMENT">Do wysyłki (READY)</SelectItem>
                    <SelectItem value="SENT">Wysłane (SENT)</SelectItem>
                    <SelectItem value="CANCELLED">Anulowane (CANCELLED)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("open-internal-task", {
                      detail: { orderId: currentOrder.id }
                    }));
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/30 rounded-lg flex items-center gap-1.5 mt-1.5 w-[150px] justify-center font-bold"
                >
                  <Plus className="h-3 w-3" />
                  Dodaj zadanie
                </Button>
              </div>
            </div>

            {/* Buyer Comments Alert */}
            {buyerMessage && (
              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-xs font-bold text-amber-950 dark:text-amber-300">Uwaga! Wiadomość od kupującego</AlertTitle>
                <AlertDescription className="mt-1 text-xs italic font-semibold text-amber-900 dark:text-amber-200">
                  &quot;{buyerMessage}&quot;
                </AlertDescription>
              </Alert>
            )}

            {/* Warning: Invoice already exists */}
            {organization?.warn_invoice_exists && (currentOrder.erp_sales_document_number || currentOrder.erpSalesDocumentNumber) && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Faktura już istnieje w ERP: <strong className="font-mono bg-amber-500/20 dark:bg-amber-500/30 border border-amber-500/30 px-1.5 py-0.5 rounded text-amber-950 dark:text-white ml-0.5">{currentOrder.erp_sales_document_number || currentOrder.erpSalesDocumentNumber}</strong>
                </span>
              </div>
            )}

            {/* Warning: Waybill already exists */}
            {organization?.warn_waybill_exists && currentOrder.tracking_numbers && currentOrder.tracking_numbers.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Wygenerowano już list przewozowy:</span>
                  {currentOrder.tracking_numbers.map((t, idx) => {
                    const allegroCarrier = getAllegroCarrierForWaybill(currentOrder.details_payload || currentOrder.detailsPayload, t);
                    const trackingUrl = getTrackingUrl(
                      t,
                      allegroCarrier || currentOrder.service_integration?.provider_type || currentOrder.serviceIntegration?.provider_type
                    );
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 font-mono bg-amber-500/20 dark:bg-amber-500/30 border border-amber-500/30 px-1.5 py-0.5 rounded text-amber-950 dark:text-white text-[10px] font-semibold">
                        {trackingUrl ? (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-0.5 text-amber-900 dark:text-amber-200 hover:text-amber-950 dark:hover:text-white font-bold"
                          >
                            {t} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          t
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warning: COD Mismatch */}
            {organization?.warn_cod_mismatch && (() => {
              const orderTotal = currentOrder.total_to_pay || currentOrder.totalToPay || 0;
              const packagesCodSum = packages.reduce((sum, pkg) => {
                const amt = pkg.codAmount ? parseFloat(pkg.codAmount.replace(",", ".")) : 0;
                return sum + (isNaN(amt) ? 0 : amt);
              }, 0);

              if (isCod) {
                if (Math.abs(packagesCodSum - orderTotal) > 0.01) {
                  return (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-[11px] text-rose-700 dark:text-rose-200 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span>
                        Niezgodność pobrania (COD): suma w paczkach (<strong className="text-rose-700 dark:text-rose-100">{packagesCodSum.toFixed(2)} PLN</strong>) różni się od wartości zamówienia (<strong className="text-rose-700 dark:text-rose-100">{orderTotal.toFixed(2)} PLN</strong>)
                      </span>
                    </div>
                  );
                }
              } else {
                if (packagesCodSum > 0.01) {
                  return (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-[11px] text-rose-700 dark:text-rose-200 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span>
                        Zamówienie opłacone, ale w paczkach zdefiniowano kwotę pobrania (<strong className="text-rose-700 dark:text-rose-100">{packagesCodSum.toFixed(2)} PLN</strong>)
                      </span>
                    </div>
                  );
                }
              }
              return null;
            })()}

            {/* Seller Note Alert */}
            {sellerNote && (
              <Alert className="border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200">
                <AlertCircle className="h-4 w-4 text-indigo-500" />
                <AlertTitle className="text-xs font-bold flex items-center gap-1.5">
                   Uwaga do zakupu (sprzedawca)
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs italic font-semibold">
                  &quot;{sellerNote}&quot;
                </AlertDescription>
              </Alert>
            )}

            {/* Diagnostic error alerts */}
            {currentOrder.flags?.includes("ERR_FV") && (
              <Alert className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200">
                <AlertCircle className="h-4 w-4 text-rose-500" />
                <AlertTitle className="text-xs font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  Błąd wystawiania Faktury (ERR_FV)
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs font-medium text-rose-700/80 dark:text-rose-200/80">
                  Podczas ostatniej próby realizacji wystąpił błąd komunikacji z Subiektem GT. 
                  Upewnij się, że symbole produktów są zmapowane prawidłowo w Subiekcie i spróbuj ponownie.
                </AlertDescription>
              </Alert>
            )}

            {currentOrder.flags?.includes("ERR_LBL") && (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-xs font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                  Błąd generowania Listu Przewozowego (ERR_LBL)
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs font-medium text-amber-700/80 dark:text-amber-200/80">
                  {currentOrder.erp_sales_document_number || currentOrder.erpSalesDocumentNumber ? (
                    <span>
                      Faktura <strong className="font-mono bg-emerald-500/15 dark:bg-emerald-500/20 px-1 py-0.5 rounded text-emerald-700 dark:text-emerald-400 ml-0.5 mr-0.5">{currentOrder.erp_sales_document_number || currentOrder.erpSalesDocumentNumber}</strong> została utworzona pomyślnie, lecz generowanie etykiety kurierskiej się nie powiodło (błąd 400). Sprawdź poprawność gabarytu paczki oraz adresu odbiorcy.
                    </span>
                  ) : (
                    <span>
                      Generowanie etykiety kurierskiej się nie powiodło (błąd 400). Sprawdź gabaryty i dane adresowe.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isInvoiceDataIncomplete && (
              <Alert className="border-rose-500/30 bg-rose-500/10 text-rose-200 animate-pulse">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <AlertTitle className="text-xs font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  Brakujące dane do Faktury VAT!
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs font-medium">
                  Zamówienie wymaga wystawienia faktury, lecz dane adresowe FV są niekompletne. Uzupełnij je klikając <strong>Edytuj FV ✏️</strong> przed nabiciem!
                </AlertDescription>
              </Alert>
            )}

            {/* Address & Delivery Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-1">
              {/* Column 1: Odbiorca i adres */}
              <div className="p-3.5 bg-slate-950/30 border border-white/5 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Odbiorca i adres:</span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsEditAddressOpen(true)}
                      className="h-auto p-0 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Edytuj ✏️
                    </Button>
                  </div>
                  <p className="font-semibold text-foreground mt-1.5">{receiverFullName}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {currentOrder.delivery_address?.street || ""}, {currentOrder.delivery_address?.zip_code || ""}{" "}
                    {currentOrder.delivery_address?.city || ""}
                  </p>
                  {currentOrder.delivery_address?.phone_number && (
                    <p className="text-[11px] font-mono text-indigo-400 dark:text-indigo-300 mt-1.5 flex items-center gap-1">📞 {currentOrder.delivery_address.phone_number}</p>
                  )}
                </div>
                {deliveryPointId && (
                  <div className="mt-3 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg text-xs text-blue-400 font-medium max-w-fit shadow-sm">
                    <MapPin className="h-3.5 w-3.5" /> Punkt: <strong className="font-mono text-foreground text-[10px]">{deliveryPointId}</strong>
                  </div>
                )}
              </div>

              {/* Column 2: Dane do Faktury FV */}
              <div className={cn(
                "p-3.5 border rounded-xl flex flex-col justify-between transition-all duration-300",
                hasInvoiceRequired
                  ? (isInvoiceDataIncomplete ? "border-rose-500/30 bg-rose-500/5 shadow-lg shadow-rose-950/10" : "border-amber-500/20 bg-amber-500/5")
                  : "border-border/30 bg-slate-950/10"
              )}>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1">
                      {hasInvoiceRequired && <FileText className="h-3.5 w-3.5 text-amber-500 animate-pulse" />} Dane do faktury (FV):
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsEditInvoiceOpen(true)}
                      className="h-auto p-0 text-[11px] text-amber-500 hover:text-amber-400 font-semibold"
                    >
                      Edytuj FV ✏️
                    </Button>
                  </div>
                  
                  {hasInvoiceRequired ? (
                    <div className="mt-1.5 space-y-0.5 text-xs">
                      {invoiceData?.companyName ? (
                        <p className="font-semibold text-foreground truncate">{invoiceData.companyName}</p>
                      ) : (
                        (invoiceData?.firstName || invoiceData?.lastName) ? (
                          <p className="font-semibold text-foreground">{`${invoiceData.firstName || ""} ${invoiceData.lastName || ""}`.trim()}</p>
                        ) : (
                          <p className="text-rose-500 italic font-semibold">Brak nazwy nabywcy!</p>
                        )
                      )}
                      
                      {invoiceData?.taxId && (
                        <p className="font-mono text-amber-500 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded w-fit mt-1 select-all">NIP: {invoiceData.taxId}</p>
                      )}
                      
                      {invoiceData?.street ? (
                        <p className="text-muted-foreground mt-1">{invoiceData.street}</p>
                      ) : (
                        <p className="text-rose-500 italic">Brak adresu ulicy!</p>
                      )}
                      
                      {(invoiceData?.zipCode || invoiceData?.city) ? (
                        <p className="text-muted-foreground">{`${invoiceData.zipCode || ""} ${invoiceData.city || ""}`.trim()}</p>
                      ) : (
                        <p className="text-rose-500 italic font-medium">Brak kodu pocztowego / miasta!</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic mt-3.5">Faktura nie jest wymagana dla tego zamówienia.</p>
                  )}
                </div>
                
                {hasInvoiceRequired && isInvoiceDataIncomplete && (
                  <div className="mt-3 text-[10px] text-rose-500 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 animate-bounce" /> Niekompletne dane do FV!
                  </div>
                )}
              </div>
            </div>
          </Card>



          {/* Configured Package Card (Editable, Stateful, and Multi-Package) */}
          <Card className="p-6 border border-border/30 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-4">
            
            {/* Header Konfiguracji Przesyłki ze skonsolidowanym logotypem wybranego kuriera */}
            {(() => {
              const activeCourierId = selectedCourierId !== null ? selectedCourierId : mappedCourier?.id;
              const activeCourier = config?.couriers?.find((c) => c.id === activeCourierId);
              const isOverridden = selectedCourierId !== null && (
                selectedCourierId !== mappedCourier?.id ||
                (activeCourier?.provider_type === "APACZKA" && selectedServiceCode !== mappedServiceCode)
              );

              return (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Przesyłka
                        </h4>
                        {isOverridden ? (
                          <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-400 text-[9px] font-semibold">
                            Ręczny wybór
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400 text-[9px] font-semibold">
                            Auto-mapowanie
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Gabaryty paczek, usługi i odbiorca etykiety
                      </p>
                    </div>
                  </div>

                  {/* Logo wybranego kuriera + Przycisk resetowania */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {isCod && (
                      <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl backdrop-blur-sm">
                        <Checkbox
                          id="cod-toggle-fulfillment"
                          checked={codEnabled}
                          onCheckedChange={(checked) => handleToggleCod(!!checked)}
                          className="h-3.5 w-3.5 border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                        />
                        <label htmlFor="cod-toggle-fulfillment" className="text-xs font-semibold text-amber-300 cursor-pointer select-none">
                          Pobranie (COD)
                        </label>
                      </div>
                    )}
                    {activeCourier && (
                      <div className="flex items-center gap-2 bg-slate-950/60 border border-border/30 px-3 py-1.5 rounded-xl shadow-inner backdrop-blur-sm">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider select-none shrink-0">
                          Kurier:
                        </span>
                        <div className="max-h-5 max-w-[130px] flex items-center justify-center shrink-0 overflow-hidden">
                          {getCourierIcon(activeCourier.provider_type, activeCourier.name, "max-h-5 max-w-[120px] w-auto")}
                        </div>
                      </div>
                    )}

                    {(selectedCourierId !== mappedCourier?.id ||
                      (activeCourier?.provider_type === "APACZKA" && selectedServiceCode !== mappedServiceCode) ||
                      packages.length > 1 ||
                      packages[0]?.selectedPackageId !== mappedPackageId ||
                      packages[0]?.mode !== "predefined") && (
                      <button
                        onClick={() => {
                          setSelectedCourierId(mappedCourier?.id || null);
                          setSelectedServiceCode(mappedServiceCode || "");
                          if (currentOrder) {
                            const initialCodAmount = effectiveIsCod ? totalCodAmount.toFixed(2) : "";
                            setPackages([
                              {
                                id: crypto.randomUUID(),
                                mode: "predefined",
                                selectedPackageId: mappedPackageId || undefined,
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
                          }
                          toast.success("Przywrócono domyślne ustawienia przesyłki.");
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold transition-colors animate-pulse"
                      >
                        Przywróć domyślne
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Courier Selection Row z dedykowanym boksem na logo obok selecta */}
            {(() => {
              const currentCourierId = selectedCourierId !== null ? selectedCourierId : mappedCourier?.id;
              const selectedCourier = config?.couriers?.find((c) => c.id === currentCourierId);
              const isApaczka = selectedCourier?.provider_type === "APACZKA";
              return (
                <div className={cn("grid gap-3 text-sm bg-slate-950/30 p-3.5 border border-border/30 rounded-xl shadow-inner", isApaczka ? "grid-cols-2" : "grid-cols-1")}>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1.5">
                      Kurier (Odbiorca Etykiety):
                    </label>
                    
                    <div className="flex items-center gap-2.5">
                      {/* Dedykowany boks z logo kuriera - brak nachodzenia na tekst! */}
                      <div className="h-10 px-3 min-w-[110px] max-w-[150px] bg-slate-900 border border-border/30 rounded-lg flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                        {selectedCourier ? (
                          getCourierIcon(selectedCourier.provider_type, selectedCourier.name, "max-h-6 max-w-[120px] w-auto")
                        ) : (
                          <Truck className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Dropdown wyboru kuriera z własnym paddingiem */}
                      <select
                        value={currentCourierId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedCourierId(val ? Number(val) : null);
                        }}
                        className="flex-1 h-10 bg-slate-900 border border-border/30 rounded-lg text-foreground text-xs px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold hover:border-border/50 transition-colors min-w-0"
                      >
                        <option value="" className="bg-slate-950 text-foreground">-- Wybierz kuriera --</option>
                        {config?.couriers?.map((courier) => (
                          <option key={courier.id} value={courier.id} className="bg-slate-950 text-foreground">
                            {courier.name} ({courier.provider_type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dropdown usługi tylko dla Apaczka */}
                  {isApaczka && (
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Usługa Apaczka:</label>
                      <select
                        value={selectedServiceCode || ""}
                        onChange={(e) => setSelectedServiceCode(e.target.value)}
                        disabled={apaczkaServices.length === 0}
                        className={cn(
                          "bg-slate-900 border border-border/30 rounded-lg text-foreground text-xs p-2 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer",
                          apaczkaServices.length === 0 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {apaczkaServices.length === 0 ? (
                          <option value="" className="bg-slate-950 text-foreground">Ładowanie usług...</option>
                        ) : (
                          apaczkaServices.map((service) => (
                            <option key={service.id} value={service.id} className="bg-slate-950 text-foreground">
                              {service.name || service.id}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>
              );
            })()}

            {availableServicesForCourier.length > 0 && (
              <div className="bg-slate-950/20 p-3.5 border border-border/30 rounded-xl text-sm space-y-1.5 shadow-inner">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Usługi dodatkowe</Label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {availableServicesForCourier.map((serviceMap) => (
                    <div
                      key={serviceMap.id}
                      className="flex items-center space-x-1.5 bg-slate-900/40 border border-border/30 rounded-lg px-2 py-1.5 hover:bg-slate-900/60 transition-colors"
                    >
                      <Checkbox
                        id={`service-${serviceMap.id}`}
                        checked={selectedServices.has(
                          serviceMap.courier_service_code
                        )}
                        onCheckedChange={() =>
                          handleServiceToggle(serviceMap.courier_service_code)
                        }
                        className="h-3.5 w-3.5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <label
                        htmlFor={`service-${serviceMap.id}`}
                        className="text-[11px] text-muted-foreground font-medium cursor-pointer truncate select-none leading-none"
                        title={`${serviceMap.marketplace_service_name} (${serviceMap.courier_service_code})`}
                      >
                        {serviceMap.marketplace_service_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Number Input */}
            <div className="bg-slate-950/20 p-3.5 border border-border/30 rounded-xl text-sm space-y-1.5 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                  <Tag className="h-3 w-3 text-indigo-500" />
                  Numer referencyjny na etykiecie:
                </span>
                <span className={cn(
                  "text-[10px] font-mono font-semibold px-1 rounded",
                  referenceNumber.length >= maxRefLength
                    ? "text-red-550 bg-red-500/10 animate-pulse font-bold"
                    : referenceNumber.length > maxRefLength - 5
                    ? "text-amber-550 bg-amber-500/10 font-bold"
                    : "text-muted-foreground"
                )}>
                  {referenceNumber.length}/{maxRefLength}
                </span>
              </div>
              <div className="relative flex items-center bg-slate-900/60 border border-border/30 rounded-lg px-3 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value.substring(0, maxRefLength))}
                  placeholder="Zostaw puste dla domyślnego (nazwy produktów)"
                  className="w-full bg-transparent border-none shadow-none outline-none p-0 h-9 text-xs text-foreground focus:outline-none focus:ring-0 min-w-0"
                />
                {referenceNumber && (
                  <button
                    onClick={() => setReferenceNumber("")}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-accent/5 transition-all cursor-pointer"
                    title="Wyczyść numer referencyjny"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {currentOrder?.service_integration?.provider_type === "ALLEGRO" && (
                <p className="text-[9px] text-amber-600 dark:text-amber-500/70 leading-none">
                  ⚠️ Allegro WZA wymaga referencji o długości maksymalnie 35 znaków.
                </p>
              )}
            </div>

            {/* Packages list constructor */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin">
              {packages.map((pkg, index) => (
                <div
                  key={pkg.id}
                  className="p-3.5 border border-border/30 rounded-xl space-y-3 relative bg-slate-950/20 shadow-inner"
                >
                  <div className="flex justify-between items-center h-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Paczka #{index + 1}</span>
                    {packages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md hover:bg-rose-500/10 hover:text-rose-500"
                        onClick={() => removePackage(pkg.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-border/30 w-fit">
                        <button
                          type="button"
                          onClick={() => handlePackageChange(index, "mode", "predefined")}
                          className={`text-[9px] font-semibold py-1.5 px-3 rounded-md transition-all ${
                            pkg.mode === "predefined"
                              ? "bg-indigo-600 text-white shadow font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Predefiniowane
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePackageChange(index, "mode", "custom")}
                          className={`text-[9px] font-semibold py-1.5 px-3 rounded-md transition-all ${
                            pkg.mode === "custom"
                              ? "bg-indigo-600 text-white shadow font-semibold"
                              : "text-muted-foreground hover:text-foreground"
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
                          className={`h-[26px] px-2.5 rounded-lg border text-[9px] font-bold transition-all flex items-center justify-center ${
                            pkg.is_nstd
                              ? "bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-md"
                              : "bg-slate-900/40 text-muted-foreground border-border/30 hover:text-foreground"
                          }`}
                        >
                          Niestandardowa (NSTD)
                        </button>
                      )}
                    </div>

                    {pkg.mode === "predefined" ? (
                      <div className="flex gap-2 items-center mt-0.5">
                        <div className="flex-1">
                          <Select
                            value={pkg.selectedPackageId}
                            onValueChange={(value) =>
                              handlePackageChange(index, "selectedPackageId", value)
                            }
                            disabled={isConfigLoading}
                          >
                            <SelectTrigger className="h-8 text-xs bg-slate-900/50 border-border/30 rounded-lg">
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
                        <button
                          type="button"
                          onClick={() =>
                            setPackages((pkgs) =>
                              pkgs.map((p, i) =>
                                i === index ? { ...p, is_nstd: !p.is_nstd } : p
                              )
                            )
                          }
                          className={`h-8 px-2.5 rounded-lg border text-[9px] font-bold transition-all flex items-center justify-center shrink-0 ${
                            pkg.is_nstd
                              ? "bg-amber-500/20 text-amber-500 border-amber-500/30 shadow-md"
                              : "bg-slate-900/40 text-muted-foreground border-border/30 hover:text-foreground"
                          }`}
                        >
                          Niestandardowa (NSTD)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-0.5">
                        <div className="grid grid-cols-4 gap-1.5">
                          <div className="relative flex items-center bg-slate-900/60 border border-border/30 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase mr-0.5 shrink-0 select-none">Dł</span>
                            <input
                              id={`length_cm-${pkg.id}`}
                              name="length_cm"
                              value={pkg.customPackage.length_cm}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-foreground min-w-0"
                            />
                            <span className="text-[9px] text-muted-foreground ml-0.5 shrink-0 select-none">cm</span>
                          </div>

                          <div className="relative flex items-center bg-slate-900/60 border border-border/30 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase mr-0.5 shrink-0 select-none">Sz</span>
                            <input
                              id={`width_cm-${pkg.id}`}
                              name="width_cm"
                              value={pkg.customPackage.width_cm}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-foreground min-w-0"
                            />
                            <span className="text-[9px] text-muted-foreground ml-0.5 shrink-0 select-none">cm</span>
                          </div>

                          <div className="relative flex items-center bg-slate-900/60 border border-border/30 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase mr-0.5 shrink-0 select-none">Wy</span>
                            <input
                              id={`height_cm-${pkg.id}`}
                              name="height_cm"
                              value={pkg.customPackage.height_cm}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-foreground min-w-0"
                            />
                            <span className="text-[9px] text-muted-foreground ml-0.5 shrink-0 select-none">cm</span>
                          </div>

                          <div className="relative flex items-center bg-slate-900/60 border border-border/30 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase mr-0.5 shrink-0 select-none">Wg</span>
                            <input
                              id={`weight_kg-${pkg.id}`}
                              name="weight_kg"
                              value={pkg.customPackage.weight_kg}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-foreground min-w-0"
                            />
                            <span className="text-[9px] text-muted-foreground ml-0.5 shrink-0 select-none">kg</span>
                          </div>
                        </div>
                        {courierProvider === "SUUS" && (
                          <div className="space-y-1 mt-1 text-left">
                            <label className="text-[10px] text-muted-foreground block mb-0.5">Typ opakowania SUUS</label>
                            <Select
                              onValueChange={(value) =>
                                handlePackageChange(index, "courier_code", value)
                              }
                              value={pkg.courier_code || ""}
                            >
                              <SelectTrigger className="h-8 text-xs bg-slate-900/50 border-border/30 rounded-lg">
                                <SelectValue placeholder="Wybierz typ opakowania..." />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border border-border/30">
                                {Object.entries(SUUS_PACKAGE_CODES).map(([code, name]) => (
                                  <SelectItem key={code} value={code} className="text-xs">
                                    {code} - {name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {courierProvider === "RABEN" && (
                          <div className="space-y-1 mt-1 text-left">
                            <label className="text-[10px] text-muted-foreground block mb-0.5">Typ opakowania Raben</label>
                            <Select
                              onValueChange={(value) =>
                                handlePackageChange(index, "courier_code", value)
                              }
                              value={pkg.courier_code || ""}
                            >
                              <SelectTrigger className="h-8 text-xs bg-slate-900/50 border-border/30 rounded-lg">
                                <SelectValue placeholder="Wybierz typ opakowania..." />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border border-border/30">
                                {Object.entries(RABEN_PACKAGE_CODES).map(([code, name]) => (
                                  <SelectItem key={code} value={code} className="text-xs">
                                    {code} - {name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Palet Presets inside custom packages */}
                    {pkg.mode === "custom" && (
                      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-border/20">
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider select-none">Palety:</span>
                        <div className="flex gap-1">
                          {[
                            { label: "euro", length: "120", width: "80", height: "150", weight: "20" },
                            { label: "pół", length: "80", width: "60", height: "100", weight: "10" }
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              className="px-1.5 py-0.5 rounded bg-accent/10 hover:bg-accent/20 text-muted-foreground hover:text-foreground text-[8px] font-medium border border-border/30 transition-all flex items-center gap-0.5"
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
                              <Box className="h-2 w-2 text-indigo-500" />
                              {preset.label} ({preset.length}×{preset.width})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {effectiveIsCod && (
                      <div className="pt-2 border-t border-border/20 flex items-center justify-between gap-3 h-8 mt-0.5">
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider select-none flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> Kwota Pobrania (COD)
                        </span>
                        <div className="relative flex items-center bg-slate-900/60 border border-border/30 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all max-w-[140px]">
                          <input
                            id={`cod-amount-${pkg.id}`}
                            value={pkg.codAmount}
                            onChange={(e) =>
                              handleCodAmountChange(index, e.target.value)
                            }
                            placeholder="0.00"
                            className="w-full bg-transparent border-none shadow-none outline-none p-0 h-6 text-xs font-mono text-right focus:outline-none focus:ring-0 text-foreground"
                            type="number"
                            step="0.01"
                          />
                          <span className="text-[9px] text-muted-foreground ml-1.5 shrink-0 select-none font-medium">PLN</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons to add package and split COD */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-[11px] bg-slate-950/20 hover:bg-slate-950/40 border-border/30 rounded-lg transition-all flex items-center justify-center gap-1.5"
                onClick={addPackage}
              >
                <PlusCircle className="h-4 w-4 text-indigo-500" /> Dodaj paczkę
              </Button>
              {effectiveIsCod && packages.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-[11px] bg-slate-950/20 hover:bg-slate-950/40 border-border/30 rounded-lg transition-all flex items-center justify-center gap-1.5"
                  onClick={handleSplitCodClick}
                >
                  <CreditCard className="h-4 w-4 text-emerald-500 animate-pulse" /> Podziel pobranie
                </Button>
              )}
            </div>
          </Card>
          
          </TabsContent>

          <TabsContent value="chat" className="mt-0 focus:outline-none flex flex-col h-full min-h-[500px]">
            <Card className="p-6 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col min-h-[500px] flex-1">
              <h4 className="text-xs text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                Rozmowy z Kupującym ({currentOrder.buyer_login}):
              </h4>
              {currentOrder?.buyer_login && currentOrder?.service_integration ? (
                <div className="flex-1 flex flex-col min-h-[450px]">
                  <ChatPanel
                    buyerLogin={currentOrder.buyer_login}
                    integrationId={currentOrder.service_integration.id}
                    currentOrderId={currentOrder.id}
                    myLogin={currentOrder.service_integration.external_user_id}
                  />
                </div>
              ) : (
                <div className="p-8 text-sm text-muted-foreground text-center flex flex-col items-center justify-center h-full flex-1">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-2" />
                  Brak danych do załadowania rozmowy.
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ── TAB: Zwroty i Spory ── */}
          <TabsContent value="zwroty" className="mt-0 focus:outline-none flex flex-col gap-4">
            {/* Returns */}
            {(orderDetails?.returns?.length || 0) > 0 && (
              <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/20 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-rose-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Zwroty</h4>
                  <span className="ml-auto bg-rose-500/15 text-rose-400 border border-rose-500/20 rounded-full text-[9px] px-2 py-0.5 font-bold">
                    {orderDetails.returns.length}
                  </span>
                </div>
                <div className="divide-y divide-border/10 px-5">
                  {orderDetails.returns.map((ret: any) => (
                    <div key={ret.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground font-mono">
                            {ret.external_return_id || ret.reference_number || ret.id}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            ret.status === "ONGOING" || ret.status === "WAITING"
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-emerald-500/15 text-emerald-400"
                          }`}>
                            {ret.status}
                          </span>
                        </div>
                        {ret.created_at_external && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {new Date(ret.created_at_external).toLocaleString("pl-PL")}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] border-border/30 hover:border-rose-500/30 text-foreground/70 hover:text-rose-400 rounded-lg shrink-0"
                        onClick={() => window.open(`/returns/${ret.id}`, "_blank")}
                      >
                        Szczegóły
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Disputes */}
            {(orderDetails?.disputes?.length || 0) > 0 && (
              <Card className="border border-rose-500/20 bg-rose-950/10 backdrop-blur-md rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-rose-500/15 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400/80">Spory i Reklamacje</h4>
                  <span className={`ml-auto rounded-full text-[9px] px-2 py-0.5 font-bold border ${
                    (orderDetails.disputes.filter((d: any) => d.status === "ONGOING").length) > 0
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {orderDetails.disputes.length}
                  </span>
                </div>
                <div className="divide-y divide-rose-500/10 px-5">
                  {orderDetails.disputes.map((dispute: any) => (
                    <div key={dispute.id} className="py-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-foreground leading-tight">
                          {dispute.subject || "Spór"}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          dispute.status === "ONGOING"
                            ? "bg-rose-500/15 text-rose-400 animate-pulse"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}>
                          {dispute.status === "ONGOING" ? "W toku" : "Zamknięta"}
                        </span>
                      </div>
                      {dispute.buyer_login && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Kupujący: <span className="text-foreground/80">{dispute.buyer_login}</span>
                        </p>
                      )}
                      {dispute.opened_date && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Otwarty: {new Date(dispute.opened_date).toLocaleDateString("pl-PL")}
                        </p>
                      )}
                      {dispute.decision_due_date && (
                        <p className="text-[10px] text-amber-400/80 font-mono font-semibold">
                          ⚠ Termin decyzji: {new Date(dispute.decision_due_date).toLocaleDateString("pl-PL")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Loading state */}
            {isLoadingOrderDetails && (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Ładowanie szczegółów...</span>
              </div>
            )}
          </TabsContent>

          {/* ── TAB: Inne zamówienia klienta ── */}
          <TabsContent value="inne" className="mt-0 focus:outline-none">
            <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/20 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inne zamówienia klienta</h4>
                <span className="ml-auto text-[10px] text-muted-foreground italic">
                  wg e-mail / loginu
                </span>
              </div>
              {isLoadingOrderDetails ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Ładowanie...</span>
                </div>
              ) : !orderDetails?.related_orders || orderDetails.related_orders.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Brak innych zamówień tego klienta.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {orderDetails.related_orders.map((relOrder: any) => {
                    const isCompleted = ["SENT", "PICKED_LISTED"].includes(relOrder.fulfillment_status || relOrder.status);
                    return (
                      <div key={relOrder.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold font-mono text-xs text-foreground/90 truncate">
                              {relOrder.external_order_id
                                ? relOrder.external_order_id.split("-").pop()
                                : relOrder.id.slice(0, 8)}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isCompleted
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-indigo-500/15 text-indigo-400"
                            }`}>
                              {relOrder.fulfillment_status || relOrder.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{relOrder.service_integration?.name || "Ręczne"}</span>
                            {relOrder.purchased_at && (
                              <span className="font-mono">
                                {new Date(relOrder.purchased_at).toLocaleDateString("pl-PL")}
                              </span>
                            )}
                            {relOrder.total_to_pay != null && (
                              <span className="font-semibold text-foreground/70">
                                {Number(relOrder.total_to_pay).toFixed(2)} PLN
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg border border-transparent hover:border-emerald-500/20 shrink-0"
                          onClick={() => window.open(`/orders/${relOrder.id}`, "_blank")}
                        >
                          Szczegóły
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-0 focus:outline-none flex flex-col gap-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
              {/* Lewa kolumna: Notatki do zamówienia */}
              <Card className="p-4 border border-border/30 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <StickyNote className="h-4 w-4 text-primary" /> Notatki wewnętrzne
                  </h3>
                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">{orderNotes.length}</Badge>
                </div>
                
                {/* Formularz dodawania notatki */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <Textarea
                    placeholder="Wpisz nową notatkę wewnętrzną..."
                    value={newNoteContent}
                    onChange={(e: any) => setNewNoteContent(e.target.value)}
                    required
                    rows={3}
                    className="rounded-xl border-white/10 focus-visible:ring-indigo-500 bg-slate-950/40 text-xs text-slate-200"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmittingNote || !newNoteContent.trim()}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-8"
                    >
                      {isSubmittingNote ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Dodaj notatkę
                    </Button>
                  </div>
                </form>

                <Separator className="bg-white/5 my-2" />

                {/* Lista notatek */}
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {isNotesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : orderNotes.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 italic text-xs">
                      Brak notatek do tego zamówienia.
                    </div>
                  ) : (
                    orderNotes.map((note) => (
                      <div key={note.id} className="p-2.5 bg-slate-950/30 border border-white/5 rounded-xl relative group hover:bg-slate-900/30 transition-all duration-200">
                        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 mb-1.5">
                          <span className="flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {note.author.name || note.author.email}
                          </span>
                          <span>{new Date(note.created_at).toLocaleString("pl-PL")}</span>
                        </div>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed pr-6">{note.content}</p>
                        <Button
                          onClick={() => handleDeleteNote(note.id)}
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 absolute right-2 bottom-2 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Prawa kolumna: Zadania i decyzje */}
              <Card className="p-4 border border-border/30 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-indigo-400 flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-indigo-400" /> Zadania i decyzje
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-internal-task", {
                          detail: { orderId: currentOrder?.id }
                        }));
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/30 rounded-lg flex items-center gap-1 shrink-0 font-bold"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Dodaj zadanie
                    </Button>
                    <Badge variant="outline" className="text-xs bg-indigo-500/5 text-indigo-400 border-indigo-500/20">{orderTasks.length}</Badge>
                  </div>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {isOrderTasksLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    </div>
                  ) : orderTasks.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 italic text-xs">
                      Brak przypisanych zadań. Możesz utworzyć nowe zadanie z dymka na dole strony.
                    </div>
                  ) : (
                    orderTasks.map((task) => {
                      const priorityColor = 
                        task.priority === "LOW" ? "border-slate-500/20 text-slate-400" :
                        task.priority === "MEDIUM" ? "border-blue-500/20 text-blue-400" :
                        task.priority === "HIGH" ? "border-orange-500/20 text-orange-400" :
                        "border-rose-500/20 text-rose-400 bg-rose-500/5 animate-pulse";

                      const statusColor = 
                        task.status === "NEW" ? "bg-blue-500/10 text-blue-400" :
                        task.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-400" :
                        task.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-slate-500/10 text-slate-400";

                      const titleMatch = task.title.match(/^\[(.*?)\]\s*(.*)$/);
                      const displayTitle = titleMatch ? titleMatch[2] : task.title;
                      const category = titleMatch ? titleMatch[1] : null;

                      return (
                        <div key={task.id} className="p-2.5 bg-slate-950/30 border border-white/5 rounded-xl hover:bg-slate-900/30 transition-all duration-200 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[9px]">
                            <span className="font-semibold text-slate-500">
                              Zleca: {task.created_by.name || task.created_by.email}
                            </span>
                            <div className="flex items-center gap-1">
                              {task.type === "DECISION_REQUEST" && (
                                <Badge className="bg-purple-500/10 text-purple-400 border-none text-[8px] h-4 font-bold">Decyzja</Badge>
                              )}
                              <Badge variant="outline" className={`text-[8px] h-4 ${priorityColor}`}>{task.priority}</Badge>
                              <Badge className={`border-none text-[8px] h-4 ${statusColor}`}>{task.status}</Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-1.5 flex-wrap">
                            {category && (
                              <Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[8px] h-4.5 font-bold px-1.5 py-0 select-none shrink-0">
                                {category}
                              </Badge>
                            )}
                            <h4 className="text-xs font-bold text-slate-200 leading-normal flex-1">{displayTitle}</h4>
                          </div>
                          {task.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-2">{task.description}</p>
                          )}

                          <Separator className="bg-white/5 my-0.5" />

                          <div className="flex items-center justify-between text-[9px] text-slate-500">
                            <span>Przypisane: <strong className="text-slate-300">{task.assigned_to ? (task.assigned_to.name || task.assigned_to.email) : "Każdy"}</strong></span>
                            <Button
                              onClick={() => {
                                window.dispatchEvent(new CustomEvent("open-internal-task", { detail: { taskId: task.id } }));
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[9px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5 font-bold rounded-lg p-0 px-2"
                            >
                              Czat
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          </Tabs>
        </section>

        {/* RIGHT COLUMN: ACTION PANEL & CONTROLLER QUEUE (45% width) */}
        <section className="w-[42%] xl:w-[45%] flex flex-col gap-6">
          
          {/* Main big processing card */}
          <Card className="p-4 xl:p-5 border border-border/30 bg-slate-900/40 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center gap-3 xl:gap-4 shadow-2xl relative overflow-hidden group">
            
            {/* Decorative background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-orange-500/10 pointer-events-none opacity-40 group-hover:opacity-65 transition-all duration-700" />

            <div className="relative z-10 flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-3 w-full justify-start pl-1">
                <div className="p-2.5 bg-gradient-to-tr from-orange-500/20 to-indigo-500/20 rounded-xl border border-border/30 text-orange-400 animate-pulse shrink-0">
                  <Flame className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground tracking-wide leading-tight">Panel Sterowania Realizacją</h3>
                  <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                    Automatycznie wygeneruje i wydrukuje FV oraz list przewozowy.
                  </p>
                </div>
              </div>

              {/* Glowing Pulse NABIJ button */}
              <Button
                onClick={handleProcessOrder}
                disabled={isProcessing}
                className={cn(
                  "relative w-full max-w-md h-12 text-sm font-bold uppercase tracking-wider rounded-xl shadow-xl transition-all duration-300 flex items-center justify-center gap-2",
                  isProcessing
                    ? "bg-slate-900 border border-border/30 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 to-indigo-600 border-none hover:scale-[1.01] hover:shadow-indigo-500/20 active:scale-95 text-white animate-glow cursor-pointer"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1 text-slate-400" /> Przetwarzanie...
                  </>
                ) : (
                  <>
                    NABIJ ZAMÓWIENIE ⚡
                  </>
                )}
              </Button>

              {/* Embedded Purchased Products (Compact List) */}
              <div className="w-full border-t border-border/30 pt-3 flex flex-col gap-2 text-left">
                <div className="flex justify-between items-center w-full px-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Zakupione Produkty:
                  </span>
                  {subiektStock && !subiektStock.is_connected && (
                    <span className="text-[10px] text-rose-500 font-bold">Brak połączenia z ERP</span>
                  )}
                </div>

                {subiektStock && !subiektStock.is_connected && (
                  <Alert variant="destructive" className="bg-red-950/20 border-red-500/20 text-red-400 py-1.5 px-2.5 rounded-xl">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <AlertDescription className="text-[10px] leading-snug">
                      {subiektStock.reason || "Brak połączenia z Subiektem."}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="divide-y divide-border/10 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin w-full">
                  {lineItems.map((item: any, idx: number) => {
                    const offerId = item.offer?.id || item.product_id || item.auction_id || item.offer_id;
                    const mapping = productMappings?.[offerId];
                    const hasSymbol = !!mapping?.erp_product_symbol;
                    const stockInfo = subiektStock?.items?.find((s: any) => s.offer_id === offerId);

                    const getItemPrice = (i: any) => {
                      if (!i) return null;
                      const p = i.price;
                      if (!p) return null;
                      if (typeof p === "string") return p;
                      if (typeof p === "number") return `${p.toFixed(2)} PLN`;
                      if (p.amount) {
                        const curr = p.currency || "PLN";
                        return `${parseFloat(p.amount).toFixed(2)} ${curr}`;
                      }
                      return null;
                    };
                    const priceFormatted = getItemPrice(item);

                    return (
                      <div key={idx} className="py-3 flex justify-between items-start gap-3 w-full border-b border-border/10 last:border-b-0">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-16 h-16 rounded-xl object-contain border border-border/40 shrink-0 bg-white p-1 shadow-sm mt-0.5"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-950/15 border border-border/30 flex items-center justify-center text-muted-foreground shrink-0 shadow-inner mt-0.5">
                              <Box className="h-7 w-7" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs font-semibold text-foreground leading-snug break-words whitespace-normal" title={item.name}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.2 rounded">
                                x{item.quantity}
                              </span>
                              {offerId && (
                                <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded border border-primary/20 font-medium">
                                  ID aukcji: {offerId}
                                </span>
                              )}
                              {priceFormatted && (
                                <span className="text-[10px] font-semibold text-foreground bg-muted/60 px-1.5 py-0.2 rounded border border-border/40">
                                  Cena: {priceFormatted}
                                </span>
                              )}
                              {subiektStock?.is_connected && stockInfo && stockInfo.has_mapping && (
                                <span className={cn(
                                  "text-[9px] font-medium",
                                  stockInfo.is_service
                                    ? "text-blue-500"
                                    : stockInfo.has_sufficient_stock
                                    ? "text-emerald-500"
                                    : "text-rose-500 font-bold"
                                )}>
                                  {stockInfo.is_service ? "Usługa" : `ERP: ${stockInfo.quantity_available ?? 0}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isMappingsLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : hasSymbol ? (
                            <div className="text-right">
                              <span className="text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded block">
                                {mapping.erp_product_symbol}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/10 border border-red-500/30 text-red-500 text-[8px] py-0 px-1 font-bold animate-pulse">
                              Brak ERP
                            </Badge>
                          )}
                          <ProductMappingDialog
                            offerId={offerId}
                            offerName={item.name}
                            currentMapping={mapping}
                            sourceIntegrationId={currentOrder.service_integration?.id}
                            erpIntegrationId={erpIntegration?.id}
                            onMappingUpdated={() => {
                              queryClient.invalidateQueries({ queryKey: ["productMappings"] });
                              refetchSubiektStock();
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Flags management card */}
          <Card className="p-4 xl:p-6 border border-border/30 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-3 xl:gap-4">
            <div className="flex justify-between items-center w-full">
              <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-indigo-500" /> Flagi zamówienia (Odłóż na później):
              </h4>
              {lastAction && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  className="text-2xs text-indigo-500 hover:text-indigo-650 hover:bg-indigo-500/10 h-7 px-2.5 rounded-lg flex items-center gap-1 transition-all duration-200"
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Cofnij (Ctrl+Z)
                </Button>
              )}
            </div>

            {/* Display active flags */}
            <div className="flex flex-wrap gap-2 min-h-[2.2rem] p-3 rounded-xl bg-slate-950/30 border border-border/30 items-center">
              {currentOrder.flags && currentOrder.flags.length > 0 ? (
                currentOrder.flags.map((flag) => (
                  <Badge
                    key={flag}
                    className={cn(
                      "text-xs px-2.5 py-1 flex items-center gap-1 border font-semibold",
                      flag === "SKIP"
                        ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20"
                        : flag === "DROPSHIP"
                        ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20"
                        : "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20"
                    )}
                  >
                    {flag === "SKIP"
                      ? "Omiń (SKIP)"
                      : flag === "DROPSHIP"
                      ? "Dropshipping (DROPSHIP)"
                      : flag === "TO_CHECK"
                      ? "Do wyjaśnienia (TO_CHECK)"
                      : flag}
                    <button
                      onClick={() => handleRemoveFlag(flag)}
                      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Usuń flagę"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Brak przypisanych flag. Użyj skrótów lub przycisków.</span>
              )}
            </div>

            {/* Set flags buttons */}
            <div className="grid grid-cols-3 gap-1.5 xl:gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleAddFlag("TO_CHECK")}
                disabled={isProcessing || isFlagging || currentOrder?.flags?.includes("TO_CHECK")}
                className="border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-semibold text-[10px] xl:text-xs h-9 xl:h-10 hover:border-rose-500/40 active:scale-95"
              >
                Do wyjaśnienia ⚠️ (T)
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleAddFlag("SKIP")}
                disabled={isProcessing || isFlagging || currentOrder?.flags?.includes("SKIP")}
                className="border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 font-semibold text-[10px] xl:text-xs h-9 xl:h-10 hover:border-amber-500/40 active:scale-95 flex items-center justify-center gap-1"
              >
                Omiń ➡️ (S)
              </Button>

              <Button
                variant="outline"
                onClick={() => handleAddFlag("DROPSHIP")}
                disabled={isProcessing || isFlagging || currentOrder?.flags?.includes("DROPSHIP")}
                className="border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-semibold text-[10px] xl:text-xs h-9 xl:h-10 hover:border-indigo-500/40 active:scale-95 flex items-center justify-center gap-1"
              >
                Dropship 📦 (D)
              </Button>
            </div>
          </Card>

          {/* Keyboard Shortcuts legends card */}
          <Card className="p-4 xl:p-6 border border-border/30 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-2.5 xl:gap-3">
            <h4 className="text-xs text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5">
              <Keyboard className="h-4 w-4 text-indigo-500" /> Skróty Klawiszowe (Klawiatura Magazyniera):
            </h4>
            
            <div className="grid grid-cols-2 gap-x-3 xl:gap-x-6 gap-y-1.5 text-[11px] xl:text-xs">
              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-medium">Realizacja (Nabij):</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  Enter / Spacja
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-medium">Do wyjaśnienia:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  T
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-medium">Omiń zamówienie:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  S / Strzałka w prawo
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-medium">Dropshipping:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  D
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-medium">Poprzednie w kolejce:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  [
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-medium">Następne w kolejce:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  ]
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground font-medium">Wyczyść flagi:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  R
                </kbd>
              </div>

              <div className="flex justify-between py-1 col-span-2 mt-1">
                <span className="text-muted-foreground font-medium">Wyjście ze stacji:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-foreground border border-border shadow shadow-black/10">
                  Esc
                </kbd>
              </div>
            </div>
          </Card>
        </section>
      </main>
      )}

      {/* Dialogs */}
      {currentOrder && (
        <>
          <EditAddressDialog
            order={currentOrder}
            isOpen={isEditAddressOpen}
            onClose={() => setIsEditAddressOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
            }}
          />
          <EditInvoiceDialog
            order={currentOrder}
            isOpen={isEditInvoiceOpen}
            onClose={() => setIsEditInvoiceOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
            }}
          />
        </>
      )}
    </div>
  );
}
