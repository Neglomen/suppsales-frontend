"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { PurchaseOrder, PurchaseOrderLineItem } from "@/types/purchase-order";
import { ServiceIntegration } from "@/types/service-integration";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Loader2,
  Package,
  Plus,
  Send,
  User,
  CreditCard,
  Link as LinkIcon,
  FilePlus2,
  Truck,
  MapPin,
  Home,
  Receipt,
  MessageSquare,
  ShoppingBag,
  Building2,
  ExternalLink,
  FileText,
  Eye,
  Download,
  Phone,
  Mail,
  Box,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from "../../orders/[id]/_components/chat-panel";
import { EditAddressDialog } from "../../shipping/_components/EditAddressDialog";
import { EditInvoiceDialog } from "../../shipping/_components/EditInvoiceDialog";

interface PurchaseOrderDetailsColumnProps {
  selectedOrderId: string | null;
}

interface EnrichedLineItem extends PurchaseOrderLineItem {
  marketplace_offer_id?: string;
}

const ProductLineItem = ({
  item,
  onIndexChange,
  onMap,
  disabled,
  isMapping,
}: {
  item: EnrichedLineItem;
  onIndexChange: (value: string) => void;
  onMap: () => void;
  disabled: boolean;
  isMapping: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    item.supplierProductIndex || ""
  );
  useEffect(() => {
    setCurrentIndex(item.supplierProductIndex || "");
  }, [item.supplierProductIndex]);

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentIndex(value);
    onIndexChange(value);
  };
  return (
    <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
      <div className="flex justify-between items-start gap-2">
        <Label htmlFor={`item-${item.marketplaceLineItemId}`} className="font-semibold text-xs text-foreground dark:text-slate-200">
          {item.name} <span className="text-primary font-bold">(x{item.quantity})</span>
        </Label>
        <span className="text-[10px] text-muted-foreground font-mono">
          ID Oferty: <span className="text-primary font-bold">{item.marketplace_offer_id || "Brak"}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          id={`item-${item.marketplaceLineItemId}`}
          placeholder="Wprowadź indeks produktu hurtowni..."
          value={currentIndex}
          onChange={handleIndexChange}
          disabled={disabled}
          className="bg-background/60 border-border/20 text-xs focus-visible:ring-primary/30 h-9"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onMap}
          disabled={disabled || !currentIndex.trim() || isMapping}
          className="h-9"
        >
          {isMapping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LinkIcon className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5 text-xs hidden sm:inline">Zmapuj</span>
        </Button>
      </div>
    </div>
  );
};

export function PurchaseOrderDetailsColumn({
  selectedOrderId,
}: PurchaseOrderDetailsColumnProps) {
  const queryClient = useQueryClient();
  const [lineItems, setLineItems] = useState<EnrichedLineItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [isEditAddressOpen, setEditAddressOpen] = useState(false);
  const [isEditInvoiceOpen, setEditInvoiceOpen] = useState(false);

  const { data: order, isLoading: isMarketplaceOrderLoading } =
    useQuery<MarketplaceOrder>({
      queryKey: ["orderDetails", selectedOrderId],
      queryFn: async () => (await api.get(`/orders/${selectedOrderId}`)).data,
      enabled: !!selectedOrderId,
    });

  const { data: suppliers, isLoading: areSuppliersLoading } = useQuery<
    ServiceIntegration[]
  >({
    queryKey: ["serviceIntegrations", { category: "WHOLESALE" }],
    queryFn: async () =>
      (await api.get("/service-integrations?category=WHOLESALE")).data,
  });

  const { data: purchaseOrders, isLoading: isPoLoading } = useQuery<
    PurchaseOrder[]
  >({
    queryKey: ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
    queryFn: async () =>
      (
        await api.get(
          `/purchase-orders?marketplace_order_id=${selectedOrderId}`
        )
      ).data,
    enabled: !!selectedOrderId,
  });

  const activePurchaseOrder = useMemo(
    () =>
      purchaseOrders?.find(
        (po) => po.status === "DRAFT" || po.status === "SENT_TO_SUPPLIER"
      ),
    [purchaseOrders]
  );
  const cancelledPurchaseOrders = useMemo(
    () => purchaseOrders?.filter((po) => po.status === "CANCELLED") || [],
    [purchaseOrders]
  );

  useEffect(() => {
    if (suppliers && suppliers.length === 1 && !selectedSupplierId) {
      setSelectedSupplierId(String(suppliers[0].id));
    }
  }, [suppliers, selectedSupplierId]);

  useEffect(() => {
    const updateLineItems = async () => {
      if (activePurchaseOrder) {
        setLineItems(activePurchaseOrder.lineItems || activePurchaseOrder.line_items || []);
        return;
      }
      if (!order) {
        setLineItems([]);
        return;
      }
      const baseItems = (order.lineItems || order.line_items || []).map((item) => ({
        marketplaceLineItemId: item.id,
        name: item.offer?.name || (item as any).name || "Produkt bez nazwy",
        quantity: item.quantity,
        supplierProductIndex: null,
        marketplace_offer_id: item.offer?.id || (item as any).offer_id || (item as any).product_id || undefined,
      }));
      if (selectedSupplierId) {
        const offerIds = baseItems
          .map((item) => item.marketplace_offer_id)
          .filter(Boolean) as string[];
        if (offerIds.length === 0) {
          setLineItems(baseItems);
          return;
        }
        try {
          const { data: mappings } = await api.get<Record<string, string>>(
            "/product-supplier-mappings/by-offers",
            {
              params: {
                supplier_integration_id: selectedSupplierId,
                offer_ids: offerIds,
              },
              paramsSerializer: { indexes: null },
            }
          );
          const mappedItems = baseItems.map((item) => ({
            ...item,
            supplierProductIndex: item.marketplace_offer_id
              ? mappings[item.marketplace_offer_id] || null
              : null,
          }));
          setLineItems(mappedItems);
        } catch (e) {
          console.error("Failed to fetch product mappings", e);
          toast.error("Nie udało się pobrać mapowań produktów.");
          setLineItems(baseItems);
        }
      } else {
        setLineItems(baseItems);
      }
    };
    updateLineItems();
  }, [order, activePurchaseOrder, selectedSupplierId]);

  const getPayloadForCreation = () => {
    if (!order || !selectedSupplierId) return null;
    return {
      marketplace_order_id: order.id,
      supplier_integration_id: parseInt(selectedSupplierId, 10),
      line_items: lineItems.map((item) => ({
        marketplace_line_item_id: item.marketplaceLineItemId,
        name: item.name,
        quantity: item.quantity,
        supplier_product_index: item.supplierProductIndex,
      })),
    };
  };

  const { mutate: createPurchaseOrder, isPending: isCreating } = useMutation({
    mutationFn: (data: NonNullable<ReturnType<typeof getPayloadForCreation>>) =>
      api.post<PurchaseOrder>("/purchase-orders", data),
    onSuccess: (response) => {
      toast.success("Utworzono robocze zamówienie do dostawcy.");
      queryClient.setQueryData(
        ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
        [response.data]
      );
      queryClient.invalidateQueries({
        queryKey: ["marketplaceOrdersForDropshipping"],
      });
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders", { status: "DRAFT" }],
      });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.detail?.[0]?.msg ||
        err.response?.data?.detail ||
        "Nie udało się utworzyć zamówienia.";
      toast.error(message);
    },
  });

  const { mutate: sendPurchaseOrder, isPending: isSending } = useMutation({
    mutationFn: (poId: string) => api.post(`/purchase-orders/${poId}/send`),
    onSuccess: () => {
      toast.success("Zamówienie zostało wysłane do dostawcy.");
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
      });
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Nie udało się wysłać zamówienia."
      ),
  });

  const {
    mutateAsync: createAndSendMutation,
    isPending: isCreatingAndSending,
  } = useMutation({
    mutationFn: async (
      data: NonNullable<ReturnType<typeof getPayloadForCreation>>
    ) => {
      const createResponse = await api.post<PurchaseOrder>(
        "/purchase-orders",
        data
      );
      const newPO = createResponse.data;
      await api.post(`/purchase-orders/${newPO.id}/send`);
      return newPO;
    },
    onSuccess: () => {
      toast.success("Zamówienie zostało utworzone i wysłane do dostawcy.");
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrders", { marketplaceOrderId: selectedOrderId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["marketplaceOrdersForDropshipping"],
      });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Wystąpił błąd."),
  });

  const { mutate: mapProduct, isPending: isMapping } = useMutation({
    mutationFn: (data: {
      marketplace_offer_id: string;
      supplier_product_index: string;
      supplier_integration_id: number;
    }) => api.post("/product-supplier-mappings", data),
    onSuccess: () => toast.success("Produkt został pomyślnie zmapowany."),
    onError: (err: any) =>
      toast.error(
        err.response?.data?.detail || "Nie udało się zapisać mapowania."
      ),
  });

  const handleCreateAndSend = () => {
    const payload = getPayloadForCreation();
    if (payload) {
      createAndSendMutation(payload);
    }
  };

  const handleCreateDraft = () => {
    const payload = getPayloadForCreation();
    if (payload) {
      createPurchaseOrder(payload);
    }
  };

  const handleLineItemIndexChange = (index: number, value: string) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, supplierProductIndex: value } : item
      )
    );
  };

  const handleMapClick = (item: EnrichedLineItem) => {
    if (
      item.marketplace_offer_id &&
      item.supplierProductIndex &&
      selectedSupplierId
    ) {
      mapProduct({
        marketplace_offer_id: item.marketplace_offer_id,
        supplier_product_index: item.supplierProductIndex,
        supplier_integration_id: parseInt(selectedSupplierId, 10),
      });
    }
  };

  const handleAddressUpdateSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: ["orderDetails", selectedOrderId],
    });
    setEditAddressOpen(false);
    setEditInvoiceOpen(false);
  };

  const handlePreviewInvoice = async (orderId: string) => {
    try {
      const response = await api.get(`/orders/${orderId}/sales-invoice/pdf`, {
        responseType: "blob"
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, "_blank");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast.error("Brak przypisanej faktury sprzedaży w ERP (Subiekt GT) dla tego zamówienia.");
      } else {
        toast.error("Błąd pobierania faktury z ERP");
      }
    }
  };

  const translateOrderStatus = (status: string) => {
    if (!status) return "Nieznany";
    const s = status.toUpperCase();
    switch (s) {
      case "NEW":
      case "NOWE":
        return "Nowe";
      case "PROCESSING":
      case "IN_PROGRESS":
      case "W_REALIZACJI":
        return "W realizacji";
      case "SENT":
      case "READY_FOR_SHIPMENT":
      case "FULFILLED":
      case "SHIPPED":
      case "WYSŁANE":
        return "Wysłane";
      case "PICKUP":
      case "READY_FOR_PICKUP":
        return "Do odbioru";
      case "DELIVERED":
      case "ZAKOŃCZONE":
      case "COMPLETED":
        return "Dostarczone";
      case "CANCELLED":
      case "CANCELED":
      case "ANULOWANE":
        return "Anulowane";
      case "RETURNED":
      case "ZWRÓCONE":
        return "Zwrócone";
      default:
        return status;
    }
  };

  const getItemsSummary = (ro: any) => {
    const lineItems = ro.line_items || ro.lineItems || ro.details_payload?.lineItems || ro.detailsPayload?.lineItems || [];
    if (lineItems.length > 0) {
      const first = lineItems[0];
      const name = first.name || first.offer?.name || "Produkt";
      const qty = first.quantity || 1;
      return lineItems.length === 1 ? `${name} (x${qty})` : `${name} (x${qty}) +${lineItems.length - 1} inne`;
    }
    return `Zamówienie #${ro.external_order_id || ro.externalOrderId || ro.id.substring(0, 8)}`;
  };

  if (!selectedOrderId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <FilePlus2 className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">Wybierz zamówienie</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Wybierz zamówienie z listy po prawej, aby wyświetlić pełne szczegóły i utworzyć zlecenie do dostawcy.
          </p>
        </div>
      </div>
    );
  }

  const isLoadingAnything =
    isPoLoading || areSuppliersLoading || isMarketplaceOrderLoading;

  if (isLoadingAnything) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">Nie znaleziono zamówienia</h3>
          <p className="mt-2 text-sm text-muted-foreground">Nie udało się załadować szczegółów wybranego zamówienia.</p>
        </div>
      </div>
    );
  }

  const payload = order.detailsPayload || (order as any).details_payload || {};
  const address = order.deliveryAddress || (order as any).delivery_address || payload.delivery?.address;
  const email = order.buyerEmail || (order as any).buyer_email || address?.email || "";
  const phone = order.buyerPhoneNumber || (order as any).buyer_phone_number || address?.phoneNumber || address?.phone_number || "";
  const recipientName = address ? `${address.firstName || address.first_name || ""} ${address.lastName || address.last_name || ""}`.trim() : "";
  const companyName = address?.companyName || address?.company_name || "";
  const street = address?.street || "";
  const zipCode = address?.zipCode || address?.zip_code || "";
  const city = address?.city || "";
  const countryCode = address?.countryCode || address?.country_code || "PL";

  const deliveryMethodName = (order as any).deliveryMethod || (order as any).delivery_method || payload.delivery?.method?.name || payload.delivery_method || "Dostawa standardowa";
  const trackingNumbers: string[] = (order as any).trackingNumbers || (order as any).tracking_numbers || payload.tracking_numbers || (payload.delivery?.tracking_numbers ? [payload.delivery.tracking_numbers] : []);
  const pickupPoint = (order as any).pickupPoint || (order as any).pickup_point || payload.pickupPoint || payload.delivery?.pickupPoint || payload.pickup_point;
  const pickupPointName = typeof pickupPoint === 'string' ? pickupPoint : (pickupPoint?.name || pickupPoint?.id || (pickupPoint?.point_id ? `Punkt ${pickupPoint.point_id}` : null));
  const pickupPointAddress = pickupPoint?.address ? `${pickupPoint.address.street || ""}, ${pickupPoint.address.city || ""}` : null;

  const invoiceAddress = order.invoiceAddress || (order as any).invoice_address || payload.invoice?.address;
  const invoiceFullname = payload.invoice_fullname || (invoiceAddress ? (invoiceAddress.companyName || invoiceAddress.company_name || `${invoiceAddress.firstName || invoiceAddress.first_name || ""} ${invoiceAddress.lastName || invoiceAddress.last_name || ""}`) : null);
  const invoiceNip = payload.invoice_nip || invoiceAddress?.taxId || invoiceAddress?.tax_id;
  const invoiceStreet = payload.invoice_address || invoiceAddress?.street;
  const invoiceZip = payload.invoice_postcode || invoiceAddress?.zipCode || invoiceAddress?.zip_code;
  const invoiceCity = payload.invoice_city || invoiceAddress?.city;
  const erpInvoiceNumber = (order as any).erpSalesDocumentNumber || (order as any).erp_sales_document_number || payload.invoice?.number;

  const messageToSeller = payload.message_to_seller || payload.user_comments || payload.buyer_message || (order as any).message_to_seller;
  const relatedOrders = (order as any).relatedOrders || (order as any).related_orders || [];

  const isDraft = activePurchaseOrder?.status === "DRAFT";
  const isSentOrCompleted =
    activePurchaseOrder &&
    (activePurchaseOrder.status === "SENT_TO_SUPPLIER" ||
      activePurchaseOrder.status === "COMPLETED");

  const paymentInfo = (() => {
    if (payload.payment?.type === "CASH_ON_DELIVERY" || String(payload.payment_method_cod) === "1") {
      const amount = payload.cashOnDelivery?.amount || payload.payment_done || order.totalToPay || (order as any).total_to_pay;
      return { type: "cod", label: "Pobranie", amount, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    }
    const amount = payload.summary?.totalToPay?.amount || payload.payment_done || order.totalToPay || (order as any).total_to_pay;
    return { type: "paid", label: "Opłacone", amount, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  })();

  const providerType = (order.serviceIntegration || (order as any).service_integration)?.provider_type;
  const integrationId = (order.serviceIntegration || (order as any).service_integration)?.id || (order as any).integration_id;
  const buyerLogin = order.buyerLogin || (order as any).buyer_login || "";

  // Render podkomponentu Dostawy & Paczek (używany na 1. stronie Zlecenia)
  const renderDeliveryAndPackageCards = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
      {/* Adres Dostawy */}
      <Card className="glass-dark shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-white/10 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground dark:text-slate-200 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Adres Dostawy Odbiorcy
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 hover:bg-primary/10 text-primary transition-colors"
            onClick={() => setEditAddressOpen(true)}
            title="Edytuj adres dostawy"
          >
            <Edit className="h-3.5 w-3.5 mr-1" /> Edytuj
          </Button>
        </CardHeader>
        <CardContent className="text-xs space-y-2 pt-4">
          {address ? (
            <div className="space-y-2">
              {recipientName && (
                <p className="font-bold text-sm text-foreground dark:text-slate-100 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                  <span>{recipientName}</span>
                </p>
              )}
              {companyName && (
                <p className="font-semibold text-foreground/80 dark:text-slate-300 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                  <span>{companyName}</span>
                </p>
              )}
              {street && (
                <p className="text-foreground/80 dark:text-slate-300 font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                  <span>{street}</span>
                </p>
              )}
              {(zipCode || city) && (
                <p className="text-foreground/80 dark:text-slate-300 font-medium flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                  <span>{zipCode} {city}</span>
                  {countryCode && (
                    <span className="uppercase text-[10px] text-muted-foreground dark:text-slate-500 font-bold ml-1 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-white/5">
                      {countryCode}
                    </span>
                  )}
                </p>
              )}
              {phone && (
                <p className="text-muted-foreground dark:text-slate-400 flex items-center gap-2 pt-1.5 border-t border-slate-200/50 dark:border-white/5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground/60 dark:text-slate-500 shrink-0" />
                  <span>Telefon: <span className="font-mono text-foreground dark:text-slate-200">{phone}</span></span>
                </p>
              )}
              {email && (
                <p className="text-muted-foreground dark:text-slate-400 flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground/60 dark:text-slate-500 shrink-0" />
                  <span className="truncate">Email: <span className="text-foreground dark:text-slate-200">{email}</span></span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground/60 italic">Brak pełnego adresu dostawy w zamówieniu.</p>
          )}
        </CardContent>
      </Card>

      {/* Sposób Dostawy & Paczka */}
      <Card className="glass-dark shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-white/10 pb-3">
          <CardTitle className="text-sm font-bold text-foreground dark:text-slate-200 flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Sposób Dostawy & Paczka
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3 pt-4">
          <div className="space-y-1 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground dark:text-slate-500 tracking-wider">Metoda wysyłki:</span>
            <p className="font-bold text-foreground dark:text-slate-100 flex items-center gap-1.5 truncate">
              <Truck className="h-3.5 w-3.5 text-primary shrink-0" /> {deliveryMethodName}
            </p>
          </div>

          {/* Punkt Odbioru / Paczkomat */}
          {pickupPointName && (
            <div className="space-y-1 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground dark:text-slate-500 tracking-wider">Punkt odbioru / Paczkomat:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-primary font-mono text-xs truncate">{pickupPointName}</span>
                <Badge variant="outline" className="text-[9px] uppercase border-primary/30 text-primary shrink-0">Punkt</Badge>
              </div>
              {pickupPointAddress && (
                <p className="text-[10px] text-muted-foreground dark:text-slate-400 truncate">{pickupPointAddress}</p>
              )}
            </div>
          )}

          {/* Numery Śledzenia Przesyłki */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground dark:text-slate-500 tracking-wider block">Numery listów przewozowych:</span>
            {trackingNumbers && trackingNumbers.length > 0 ? (
              trackingNumbers.map((track, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-2 rounded-xl border border-slate-200/50 dark:border-white/5 font-mono text-xs text-foreground dark:text-slate-200">
                  <span className="truncate">{track}</span>
                  <a
                    href={`https://allegro.pl/sledz-przesylke?numer=${track}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary-focus font-sans text-[11px] font-bold shrink-0"
                  >
                    Śledź paczkę <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground/60 italic text-[11px]">Brak wygenerowanego numeru śledzenia paczki.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <div className="p-3 sm:p-4 space-y-3.5 h-full overflow-y-auto w-full flex flex-col scrollbar-thin">
        {/* ── HERO HEADER (Design Zgodny z Nabijarką) ── */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200/50 dark:border-border/30 bg-slate-100/80 dark:bg-slate-900/60 backdrop-blur-md shadow-xl shrink-0 p-3.5 sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-white/10 flex items-center justify-center shadow-inner shrink-0">
                {!providerType && <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
                {providerType === "ALLEGRO" && <span className="text-orange-500 font-extrabold text-xs sm:text-sm tracking-wider">ALL</span>}
                {providerType === "BASELINKER" && <span className="text-blue-400 font-extrabold text-xs sm:text-sm tracking-wider">BL</span>}
                {providerType === "EMPIK" && <span className="text-pink-500 font-extrabold text-xs sm:text-sm tracking-wider">EMP</span>}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate">
                    {(order.serviceIntegration || (order as any).service_integration)?.name || "Zamówienie"}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-1.5 border-slate-200/50 dark:border-white/10 bg-slate-100 dark:bg-white/5 shrink-0">
                    {order.status}
                  </Badge>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold text-foreground leading-tight flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="truncate">#{order.externalOrderId || (order as any).external_order_id}</span>
                  <a
                    href={`/orders/${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all hover:scale-105 shrink-0"
                    title="Otwórz pełne szczegóły zamówienia w nowej karcie"
                  >
                    <ExternalLink className="h-3 w-3" /> Szczegóły
                  </a>
                </h1>
                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5 truncate">
                  <User className="h-3 w-3 text-primary shrink-0" /> {buyerLogin}
                  {recipientName && <span className="text-foreground/80 dark:text-slate-300 font-sans truncate">({recipientName})</span>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl px-2.5 py-1.5 border border-slate-200/50 dark:border-white/10">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Kwota</p>
                  <p className="text-xs font-bold text-foreground">{paymentInfo.amount} {payload.currency || "PLN"}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 border ${paymentInfo.color}`}>
                {paymentInfo.type === "paid" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Płatność</p>
                  <p className="text-xs font-bold text-foreground">{paymentInfo.label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Szybki pasek podsumowujący pod nagłówkiem */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate text-foreground/80 dark:text-slate-300">
              <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold truncate">{deliveryMethodName}</span>
              {pickupPointName && (
                <Badge variant="secondary" className="text-[10px] font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/20 shrink-0">
                  <Box className="h-3 w-3 mr-1" /> {pickupPointName}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {messageToSeller && (
                <Badge variant="destructive" className="text-[10px] font-bold uppercase py-0.5 px-2 animate-pulse">
                  💬 Wiadomość kupującego
                </Badge>
              )}
              {relatedOrders.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2 border-primary/30 text-primary bg-primary/5">
                  <ShoppingBag className="h-3 w-3 mr-1" /> Inne zamówienia ({relatedOrders.length})
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ── PASEK ZAKŁADEK (Tabs Layout Zgodny z Nabijarką) ── */}
        <Tabs defaultValue="supplier" className="flex-1 flex flex-col w-full min-h-0">
          <TabsList className="bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/10 p-1 rounded-2xl flex flex-nowrap overflow-x-auto scrollbar-none h-auto gap-1 shrink-0 w-full">
            <TabsTrigger
              value="supplier"
              className="rounded-xl gap-1.5 px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all shrink-0"
            >
              <Building2 className="h-3.5 w-3.5" />
              Zlecenie ({lineItems.length})
            </TabsTrigger>

            <TabsTrigger
              value="invoice"
              className="rounded-xl gap-1.5 px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all shrink-0"
            >
              <Receipt className="h-3.5 w-3.5" />
              Faktura VAT
            </TabsTrigger>

            <TabsTrigger
              value="messages"
              className="rounded-xl gap-1.5 px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all relative shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Wiadomości
              {messageToSeller && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-1 right-1" />
              )}
            </TabsTrigger>

            <TabsTrigger
              value="related"
              className="rounded-xl gap-1.5 px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all shrink-0"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Inne zakupy ({relatedOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* ── KARTA 1: Główna Strona Zlecenia (Zlecenie + Dostawa & Paczki) ── */}
          <TabsContent value="supplier" className="space-y-4 mt-3 flex-1 overflow-y-auto">
            {/* Dane Dostawy & Paczki widoczne bezpośrednio na pierwszej stronie */}
            {renderDeliveryAndPackageCards()}

            {cancelledPurchaseOrders.length > 0 && (
              <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase">Historia anulowanych zleceń</AlertTitle>
                <AlertDescription className="text-xs">
                  {cancelledPurchaseOrders.map((po) => (
                    <span key={po.id} className="block font-mono">
                      • Zlecenie #{po.id.substring(0, 8)} anulowane {new Date(po.updated_at).toLocaleDateString("pl-PL")}
                    </span>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <Card className="glass-dark shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-white/10 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
                      <Building2 className="h-4.5 w-4.5" /> Zlecenie Hurtownicze
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Sprawdź zmapowane indeksy i wyślij zamówienie do wybranego dostawcy.
                    </CardDescription>
                  </div>
                  {activePurchaseOrder && (
                    <Badge variant={isDraft ? "secondary" : "default"} className="font-extrabold uppercase text-[10px]">
                      {activePurchaseOrder.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {!activePurchaseOrder && (
                  <div className="space-y-1.5">
                    <Label htmlFor="supplier" className="text-xs font-semibold text-foreground dark:text-slate-200">
                      Wybierz hurtownię dropshippingową
                    </Label>
                    <Select
                      value={selectedSupplierId}
                      onValueChange={setSelectedSupplierId}
                      disabled={areSuppliersLoading}
                    >
                      <SelectTrigger id="supplier" className="bg-slate-50 dark:bg-slate-950/50 border-slate-200/50 dark:border-white/10 text-xs">
                        <SelectValue placeholder="Wybierz hurtownię z listy..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers?.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator className="bg-slate-200/50 dark:bg-white/10" />

                <div className="space-y-3">
                  <span className="text-xs font-bold text-foreground/80 dark:text-slate-300 block">Zakupione Towary ({lineItems.length}):</span>
                  {lineItems.map((item, index) => {
                    const rawItem = (order.lineItems || (order as any).line_items)?.[index];
                    const offerId =
                      rawItem?.offer?.id ||
                      rawItem?.offer_id ||
                      rawItem?.product_id ||
                      item.marketplace_offer_id ||
                      undefined;

                    return (
                      <ProductLineItem
                        key={item.marketplaceLineItemId || index}
                        item={{ ...item, marketplace_offer_id: offerId }}
                        onIndexChange={(value) => handleLineItemIndexChange(index, value)}
                        onMap={() =>
                          handleMapClick({ ...item, marketplace_offer_id: offerId })
                        }
                        disabled={(!!activePurchaseOrder && !isDraft) || isMapping}
                        isMapping={isMapping}
                      />
                    );
                  })}
                </div>

                {isSentOrCompleted && (
                  <Alert className="border-primary/20 bg-primary/5 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-semibold text-xs">Zlecenie w trakcie realizacji</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      To zlecenie zostało już wysłane do hurtowni i jest w trakcie realizacji.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {isDraft ? (
                    <Button
                      onClick={() => sendPurchaseOrder(activePurchaseOrder!.id)}
                      disabled={isSending}
                      className="w-full bg-primary hover:scale-105 transition-transform"
                    >
                      {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Send className="mr-2 h-4 w-4" /> Wyślij zrobione zlecenie
                    </Button>
                  ) : isSentOrCompleted ? (
                    <p className="col-span-2 text-xs text-center text-muted-foreground italic py-2">
                      Zlecenie w hurtowni zostało przetworzone.
                    </p>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleCreateDraft}
                        disabled={isCreating || !selectedSupplierId}
                        className="w-full border-slate-200/50 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        {isCreating && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Zapisz wersję roboczą
                      </Button>
                      <Button
                        onClick={handleCreateAndSend}
                        disabled={isCreatingAndSending || !selectedSupplierId}
                        className="w-full bg-primary hover:scale-105 transition-transform"
                      >
                        {isCreatingAndSending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Send className="mr-2 h-4 w-4" /> Utwórz i Wyślij
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* ── KARTA 3: Dane do Faktury VAT (FV) ── */}
          <TabsContent value="invoice" className="space-y-4 mt-3 flex-1 overflow-y-auto">
            <Card className="glass-dark shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-white/10 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground dark:text-slate-200 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" /> Dane Rozliczeniowe & Faktura VAT
                </CardTitle>
                {invoiceAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 hover:bg-primary/10 text-primary transition-colors"
                    onClick={() => setEditInvoiceOpen(true)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edytuj FV
                  </Button>
                )}
              </CardHeader>
              <CardContent className="text-xs space-y-3 pt-4">
                {invoiceFullname || invoiceNip || invoiceStreet ? (
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-950/30 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                    {invoiceFullname && (
                      <p className="font-bold text-sm text-foreground dark:text-slate-100 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                        <span>{invoiceFullname}</span>
                      </p>
                    )}
                    {invoiceNip && (
                      <p className="font-mono text-primary font-bold text-xs flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                        <span>NIP: {invoiceNip}</span>
                      </p>
                    )}
                    {invoiceStreet && (
                      <p className="text-foreground/80 dark:text-slate-300 font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                        <span>{invoiceStreet}</span>
                      </p>
                    )}
                    {(invoiceZip || invoiceCity) && (
                      <p className="text-foreground/80 dark:text-slate-300 font-medium flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground/60 dark:text-slate-400 shrink-0" />
                        <span>{invoiceZip} {invoiceCity}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground/60 italic">Brak danych do faktury VAT (zamówienie konsumenckie / paragon).</p>
                )}

                {/* Status dokumentu sprzedaży w Subiekcie GT / ERP */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground dark:text-slate-500 tracking-wider">Faktura w ERP (Subiekt GT):</span>
                    <p className="font-mono font-bold text-xs text-foreground dark:text-slate-200">
                      {erpInvoiceNumber ? `Faktura #${erpInvoiceNumber}` : "Brak przypisanego dokumentu FS"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreviewInvoice(order.id)}
                      className="h-8 text-xs border-primary/20 text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Podgląd FV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── KARTA 4: Wiadomości z Kupującym (Czat & Notatki) ── */}
          <TabsContent value="messages" className="space-y-4 mt-3 flex-1 overflow-y-auto">
            {messageToSeller && (
              <Alert className="border-amber-500/30 bg-amber-500/10 rounded-2xl shadow-sm">
                <MessageSquare className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-xs font-bold uppercase text-amber-400">Uwagi / Wiadomość od kupującego</AlertTitle>
                <AlertDescription className="mt-1 text-xs italic text-foreground dark:text-slate-200 font-medium">
                  "{messageToSeller}"
                </AlertDescription>
              </Alert>
            )}

            <Card className="glass-dark shadow-sm rounded-2xl overflow-hidden min-h-[350px]">
              <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-white/10 pb-3">
                <CardTitle className="text-sm font-bold text-foreground dark:text-slate-200 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" /> Historia Konwersacji z Kupującym
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {buyerLogin && integrationId ? (
                  <ChatPanel
                    buyerLogin={buyerLogin}
                    integrationId={integrationId}
                    currentOrderId={order.id}
                    myLogin={null}
                  />
                ) : (
                  <p className="text-slate-500 text-xs italic text-center py-8">
                    Brak danych do załadowania panelu konwersacji (brak loginu kupującego lub ID integracji).
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── KARTA 5: Inne Zamówienia Klienta (Historia Zakupów) ── */}
          <TabsContent value="related" className="space-y-4 mt-3 flex-1 overflow-y-auto">
            <Card className="glass-dark shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/50 dark:border-white/10 pb-3">
                <CardTitle className="text-sm font-bold text-foreground dark:text-slate-200 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" /> Pozostałe Transakcje Kupującego ({relatedOrders.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Lista wcześniejszych oraz równoległych zakupów zrobionych przez tego samego klienta.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {relatedOrders && relatedOrders.length > 0 ? (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {relatedOrders.map((ro: any) => {
                      const roItemsSummary = getItemsSummary(ro);
                      const roPurchasedAt = ro.purchased_at || ro.purchasedAt;
                      const formattedDate = roPurchasedAt
                        ? new Date(roPurchasedAt).toLocaleString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      return (
                        <a
                          key={ro.id}
                          href={`/orders/${ro.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={roItemsSummary}
                          className="relative block bg-white dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group space-y-2 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              title={roItemsSummary}
                              className="text-xs font-bold text-foreground dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-2 leading-tight"
                            >
                              {roItemsSummary}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-extrabold uppercase shrink-0 px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                            >
                              {translateOrderStatus(ro.status)}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground dark:text-slate-400 font-mono pt-1.5 border-t border-slate-100 dark:border-white/5">
                            <span className="flex items-center gap-1 text-foreground/80 dark:text-slate-300 font-sans font-medium">
                              📅 <span className="font-semibold text-foreground dark:text-slate-200">{formattedDate}</span>
                            </span>
                            {(ro.total_to_pay || ro.totalToPay) && (
                              <span className="font-bold text-foreground dark:text-slate-200 font-mono text-xs">
                                {ro.total_to_pay || ro.totalToPay} PLN
                              </span>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-2 text-slate-500">
                    <ShoppingBag className="h-10 w-10 mx-auto opacity-20" />
                    <p className="text-xs font-medium">Brak innych zarejestrowanych zamówień tego kupującego.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EditAddressDialog
        isOpen={isEditAddressOpen}
        onClose={() => setEditAddressOpen(false)}
        onSuccess={handleAddressUpdateSuccess}
        order={order}
      />

      <EditInvoiceDialog
        isOpen={isEditInvoiceOpen}
        onClose={() => setEditInvoiceOpen(false)}
        onSuccess={handleAddressUpdateSuccess}
        order={order}
      />
    </>
  );
}
