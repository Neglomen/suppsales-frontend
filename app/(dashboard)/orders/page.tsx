"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { DataTable } from "@/components/shared/data-table";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Loader2,
  DollarSign,
  Truck,
  PlusCircle,
  MoreHorizontal,
  Mail,
  Package,
  MessageSquare,
  ArrowRightLeft,
  LayoutGrid,
  ListCollapse,
  StickyNote,
  Receipt,
  Sparkles,
  AlertTriangle,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ManualOrderDialog } from "./_components/manual-order-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTableToolbar,
  type OrderFilters,
} from "./_components/data-table-toolbar";
import { format } from "date-fns";
import { SendEmailDialog } from "@/components/shared/send-email-dialog";
import type { ServiceIntegration } from "@/types/service-integration";
import { useAuthGuard } from "@/hooks/use-auth-guard"; // Importujemy nasz hook
import type { OrderDetailsApiResponse, MappedOrderDetails } from "@/types/order";
import { Checkbox } from "@/components/ui/checkbox";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";
import { Printer, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

// Typy dla danych w tabeli
interface LineItem {
  id: string;
  offer: { name: string };
  quantity: number;
  imageUrl?: string | null;
}

interface Order {
  id: string;
  external_order_id: string;
  status: string;
  fulfillment_status?: string | null;
  buyer_login: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  purchased_at: string;
  service_integration: ServiceIntegration | null;
  total_to_pay: number;
  payment_type: "CASH_ON_DELIVERY" | "ONLINE" | null;
  payment_status: string | null;
  tracking_numbers: string[] | null;
  line_items: LineItem[];
  flags: string[] | null;
  details_payload: any;
  has_returns: boolean;
  has_threads: boolean;
  has_disputes?: boolean;
}
interface PaginatedOrdersResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: Order[];
}

const getIntegrationStyle = (providerType: string | undefined) => {
  switch (providerType?.toUpperCase()) {
    case "ALLEGRO":
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/20",
        badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
        letter: "A",
      };
    case "BASELINKER":
      return {
        bg: "bg-indigo-500/10",
        text: "text-indigo-400",
        border: "border-indigo-500/20",
        badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
        letter: "B",
      };
    case "EMPIK":
      return {
        bg: "bg-pink-500/10",
        text: "text-pink-400",
        border: "border-pink-500/20",
        badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",
        letter: "E",
      };
    case "INPOST_BUY":
      return {
        bg: "bg-yellow-500/10",
        text: "text-yellow-400",
        border: "border-yellow-500/20",
        badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        letter: "I",
      };
    case "WOOCOMMERCE":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
        badge: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        letter: "W",
      };
    default:
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
        badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        letter: "R",
      };
  }
};

const getBuyerComment = (order: Order) => {
  const payload = order.details_payload;
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

const getSellerNote = (order: Order) => {
  const payload = order.details_payload;
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
};

const formatName = (first?: string | null, last?: string | null, company?: string | null) => {
  if (company?.trim()) return company.trim();
  const full = `${first || ""} ${last || ""}`.trim();
  return full || null;
};

const mapOrderPayloadToDetails = (
  order: any
): MappedOrderDetails => {
  const payload = order.details_payload;

  if (order.integration?.provider_type === "INPOST_BUY" || order.service_integration?.provider_type === "INPOST_BUY") {
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
      buyerComments: payload?.delivery_comments || payload?.customer_message || payload?.note?.text || undefined,
    };
  }

  if (order.integration?.provider_type === "WOOCOMMERCE" || order.service_integration?.provider_type === "WOOCOMMERCE") {
    const currency = payload?.currency || "PLN";
    const rawShipping = payload?.shipping;
    const hasShipping = !!(rawShipping?.address_1 && rawShipping?.city);
    const shipping = hasShipping ? rawShipping : payload?.billing;
    const billing = payload?.billing;

    return {
      delivery: {
        methodName: payload?.shipping_lines?.[0]?.method_title || "Brak informacji",
        isPickupPoint: false,
        address: shipping ? {
          firstName: shipping.first_name || undefined,
          lastName: shipping.last_name || undefined,
          street: ((shipping.address_1 || "") + (shipping.address_2 ? " " + shipping.address_2 : "")).trim() || undefined,
          zipCode: shipping.postcode || undefined,
          city: shipping.city || undefined,
          countryCode: shipping.country || undefined,
          phoneNumber: billing?.phone || undefined,
        } : undefined,
      },
      payment: {
        type: ["cod", "pobranie"].some(x => payload?.payment_method?.toLowerCase().includes(x)) ? "CASH_ON_DELIVERY" : "ONLINE",
        provider: payload?.payment_method_title || payload?.payment_method || "Brak informacji",
        status: order.payment_status || "COMPLETED",
        total: `${payload?.total || "0.00"} ${currency}`,
      },
      invoice: {
        required: !!billing?.company,
        address: billing ? {
          companyName: billing.company || undefined,
          taxId: (payload?.meta_data || []).find((m: any) => ["billing_nip", "_billing_nip", "vat_number", "nip", "billing_vat"].includes(m.key))?.value || undefined,
          street: ((billing.address_1 || "") + (billing.address_2 ? " " + billing.address_2 : "")).trim() || undefined,
          zipCode: billing.postcode || undefined,
          city: billing.city || undefined,
          countryCode: billing.country || undefined,
        } : undefined,
      },
      line_items: (payload?.line_items || []).map((line: any) => {
        return {
          id: line.variation_id && line.variation_id > 0 ? `${line.product_id}-${line.variation_id}` : `${line.product_id}`,
          name: line.name || "Brak nazwy",
          quantity: line.quantity || 1,
          price: `${(parseFloat(line.total || "0") / (line.quantity || 1)).toFixed(2)} ${currency}`,
          sku: line.sku || undefined,
          imageUrl: line.image?.src || null,
          offerId: line.variation_id && line.variation_id > 0 ? `${line.product_id}-${line.variation_id}` : `${line.product_id}`,
        };
      }),
      buyerComments: payload?.customer_note || undefined,
    };
  }

  if (order.integration?.provider_type === "EMPIK" || order.service_integration?.provider_type === "EMPIK") {
    const currency = payload?.currency_iso_code || "PLN";
    const billing = payload?.customer?.billing_address;
    const shipping = payload?.customer?.shipping_address;

    return {
      delivery: {
        methodName: payload?.shipping_type_label || "Brak informacji",
        isPickupPoint: !!order.pickup_point || !!payload?.shipping_pudo_id || (payload?.shipping_type_code === "PACKSTATION"),
        pickupPointName: order.pickup_point?.name || payload?.shipping_pudo_id || undefined,
        address: shipping ? {
          firstName: shipping.firstname || payload.customer?.firstname || undefined,
          lastName: shipping.lastname || payload.customer?.lastname || undefined,
          street: ((shipping.street_1 || "") + (shipping.street_2 ? " " + shipping.street_2 : "")).trim() || undefined,
          zipCode: shipping.zip_code || undefined,
          city: shipping.city || undefined,
          countryCode: shipping.country_iso_code || undefined,
          phoneNumber: shipping.phone || payload.customer?.phone || undefined,
        } : undefined,
      },
      payment: {
        type: payload?.payment_type?.toLowerCase().includes("pobran") ? "CASH_ON_DELIVERY" : "ONLINE",
        provider: payload?.payment_type || "Brak informacji",
        status: order.payment_status || "COMPLETED",
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
        } : undefined,
      },
      line_items: (payload?.order_lines || []).map((line: any) => ({
        id: line.order_line_id,
        name: line.product_title,
        quantity: line.quantity,
        price: `${line.price_unit || line.price || "0.00"} ${currency}`,
        sku: line.offer_sku || line.product_sku || line.offer_id?.toString(),
        imageUrl: line.product_medias?.[0]?.media_url || null,
      })),
      buyerComments: payload?.delivery_comments || payload?.customer_message || undefined,
    };
  }

  if (order.integration?.provider_type === "BASELINKER" || order.service_integration?.provider_type === "BASELINKER") {
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
    buyerComments: payload.messageToSeller || undefined,
  };
};

export default function OrdersPage() {
  useAuthGuard();

  const [data, setData] = useState<PaginatedOrdersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [isManualOrderOpen, setManualOrderOpen] = useState(false);
  const [integrations, setIntegrations] = useState<ServiceIntegration[]>([]);
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");
  const [showMissingStock, setShowMissingStock] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("orders_show_missing_stock");
    return saved !== null ? saved === "true" : true;
  });

  // Stany dla modala wysyłki e-mail
  const [isSendEmailOpen, setSendEmailOpen] = useState(false);
  const [activeOrder, setActiveOrder] =
    useState<OrderDetailsApiResponse | null>(null);

  // Stany dla DataTable zsynchronizowane z URL (zapobiega resetowaniu filtrów przy powrocie)
  const [pagination, setPagination] = useState<PaginationState>(() => {
    if (typeof window === "undefined") return { pageIndex: 0, pageSize: 100 };
    const params = new URLSearchParams(window.location.search);
    const page = params.get("page");
    const pageSize = params.get("pageSize");
    
    let savedPageSize = 100;
    try {
      const local = localStorage.getItem("orders_default_page_size");
      if (local) savedPageSize = parseInt(local) || 100;
    } catch (e) {}

    return {
      pageIndex: page ? Math.max(0, parseInt(page) - 1) : 0,
      pageSize: pageSize ? parseInt(pageSize) : savedPageSize,
    };
  });

  // Zapisz preferowany pageSize w localStorage przy zmianie
  useEffect(() => {
    try {
      localStorage.setItem("orders_default_page_size", String(pagination.pageSize));
    } catch (e) {}
  }, [pagination.pageSize]);

  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window === "undefined") return [];
    const params = new URLSearchParams(window.location.search);
    const sortBy = params.get("sortBy");
    const sortOrder = params.get("sortOrder");
    return sortBy ? [{ id: sortBy, desc: sortOrder === "desc" }] : [];
  });

  const [filters, setFilters] = useState<OrderFilters>(() => {
    if (typeof window === "undefined") {
      return { search: "", integrationId: "all", status: "to-realize" };
    }
    const params = new URLSearchParams(window.location.search);
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    return {
      search: params.get("search") || "",
      integrationId: params.get("integration") || "all",
      status: params.get("status") || "to-realize",
      dateRange: dateFrom || dateTo ? {
        from: dateFrom ? new Date(dateFrom) : undefined,
        to: dateTo ? new Date(dateTo) : undefined,
      } : undefined,
    };
  });

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // PrintHub integration
  const { isEnabled: printHubEnabled, status: printHubStatus, defaultInvoicePrinter } = usePrintHub();
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [isBulkSavingPdf, setIsBulkSavingPdf] = useState(false);
  const [isPrintingSinceLast, setIsPrintingSinceLast] = useState(false);
  const [bulkPrintOrders, setBulkPrintOrders] = useState<OrderDetailsApiResponse[]>([]);
  const [unprintedCount, setUnprintedCount] = useState<number | null>(null);
  const [isLoadingUnprintedCount, setIsLoadingUnprintedCount] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 500);

  // Pobierz liczbę niewydrukowanych zamówień gdy aktywny filtr to-realize
  useEffect(() => {
    if (filters.status !== "to-realize") {
      setUnprintedCount(null);
      return;
    }
    let cancelled = false;
    const fetchCount = async () => {
      setIsLoadingUnprintedCount(true);
      try {
        const res = await api.get<{ id: string }[]>("/orders/unprinted-to-realize");
        if (!cancelled) setUnprintedCount(res.data.length);
      } catch {
        if (!cancelled) setUnprintedCount(null);
      } finally {
        if (!cancelled) setIsLoadingUnprintedCount(false);
      }
    };
    fetchCount();
    return () => { cancelled = true; };
  }, [filters.status]);

  // Synchronizacja stanu -> URL (wyszukiwanie/filtry zachowane przy przejściu na szczegóły i powrocie)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    
    if (pagination.pageIndex > 0) {
      params.set("page", String(pagination.pageIndex + 1));
    }
    
    let defaultSize = 100;
    try {
      const local = localStorage.getItem("orders_default_page_size");
      if (local) defaultSize = parseInt(local) || 100;
    } catch (e) {}

    if (pagination.pageSize !== defaultSize) {
      params.set("pageSize", String(pagination.pageSize));
    }
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.integrationId !== "all") {
      params.set("integration", filters.integrationId);
    }
    if (filters.status && filters.status !== "all") {
      params.set("status", filters.status);
    }
    if (sorting.length > 0) {
      params.set("sortBy", sorting[0].id);
      params.set("sortOrder", sorting[0].desc ? "desc" : "asc");
    }
    if (filters.dateRange?.from) {
      params.set("dateFrom", format(filters.dateRange.from, "yyyy-MM-dd"));
    }
    if (filters.dateRange?.to) {
      params.set("dateTo", format(filters.dateRange.to, "yyyy-MM-dd"));
    }

    const queryString = params.toString();
    const newUrl = `/orders${queryString ? `?${queryString}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [pagination, sorting, filters]);

  // Reset row selection on table state changes
  useEffect(() => {
    setRowSelection({});
  }, [pagination, sorting, filters, debouncedSearch]);

  const customMessageTemplate = {
    id: "custom",
    title: "",
    content: "",
    scope: "organization" as const,
    tags: [],
    parent_template: null,
    variants: [],
  };

  const openSendEmailDialog = async (orderId: string) => {
    try {
      // Pobieramy pełne szczegóły zamówienia, ponieważ modal ich potrzebuje (do `details_payload`)
      const response = await api.get<OrderDetailsApiResponse>(
        `/orders/${orderId}`
      );
      setActiveOrder(response.data);
      setSendEmailOpen(true);
    } catch {
      toast.error("Nie udało się pobrać pełnych danych zamówienia.");
    }
  };

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Zaznacz wszystkie"
              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Zaznacz wiersz"
              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: "product_image",
        header: "Produkt",
        cell: ({ row }) => {
          const firstItem = row.original.line_items?.[0];
          const isCompact = viewMode === "compact";
          const totalItems = row.original.line_items?.length || 0;
          return (
            <div className={cn(
              "relative rounded-xl border border-border/10 overflow-hidden bg-white group-hover/row:scale-105 transition-all duration-200 p-0.5",
              isCompact ? "h-8 w-8" : "h-12 w-12"
            )}>
              {firstItem?.imageUrl ? (
                <img 
                  src={firstItem.imageUrl} 
                  alt={firstItem.offer?.name || "Produkt"} 
                  className="absolute inset-0 w-full h-full object-contain p-0.5"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                  <Package className={isCompact ? "h-4 w-4" : "h-6 w-6"} />
                </div>
              )}
              {totalItems > 1 && (
                <span className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[9px] font-extrabold px-1 rounded-tl-lg border-t border-l border-border/10 shadow-sm shrink-0 leading-none">
                  +{totalItems - 1}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "line_items",
        header: "Szczegóły Zamówienia",
        cell: ({ row }) => {
          const order = row.original;
          const firstItem = order.line_items?.[0];
          const hasMissingStock = showMissingStock && order.flags?.includes("BRAK_STANU");
          const buyerComment = getBuyerComment(order);
          const sellerNote = getSellerNote(order);
          const isCompact = viewMode === "compact";
          const buyerFullName = `${order.buyer_first_name || ""} ${order.buyer_last_name || ""}`.trim();

          const mapped = mapOrderPayloadToDetails(order);
          
          // Dane do FV
          const hasInvoice = mapped.invoice.required && (mapped.invoice.address?.taxId || mapped.invoice.address?.companyName || mapped.invoice.address?.lastName);
          const invoiceTaxId = mapped.invoice.address?.taxId;
          const invoiceCompany = mapped.invoice.address?.companyName || 
            `${mapped.invoice.address?.firstName || ""} ${mapped.invoice.address?.lastName || ""}`.trim();

          // Usługi dodatkowe
          const additionalServices = order.details_payload?.lineItems?.flatMap(
            (item: any) => item.selectedAdditionalServices || []
          ) || [];
          const hasAdditionalServices = additionalServices.length > 0;
          
          const displayItems = order.line_items || [];
          const maxVisible = 2;
          const hasMore = displayItems.length > maxVisible;
          const visibleItems = hasMore ? displayItems.slice(0, maxVisible) : displayItems;
          const hiddenItems = hasMore ? displayItems.slice(maxVisible) : [];

          return (
            <div className="space-y-1.5 max-w-[480px]">
              <div className="space-y-1">
                {visibleItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/10 shrink-0 leading-none mt-0.5 font-mono">
                      x{item.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          idx === 0 ? "font-semibold text-foreground" : "text-muted-foreground font-medium text-[11px]",
                          "break-words whitespace-normal leading-snug",
                          isCompact ? "text-xs animate-none" : (idx === 0 ? "text-sm" : "text-xs")
                        )}
                        title={item.offer?.name}
                      >
                        {item.offer?.name || "Towar bez nazwy"}
                      </p>
                    </div>
                    {idx === 0 && hasMissingStock && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1.5 whitespace-nowrap bg-red-500/10 text-red-600 border-red-500/20 font-bold shrink-0 mt-0.5">
                        BRAK TOWARU
                      </Badge>
                    )}
                  </div>
                ))}
                
                {hasMore && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 rounded px-1.5 py-0.5 w-fit cursor-help transition-all">
                          + {hiddenItems.length} kolejnych przedmiotów
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[320px] p-2 space-y-1 bg-popover border border-border rounded-xl shadow-xl">
                        <p className="font-extrabold text-[11px] text-foreground border-b border-border/40 pb-1 mb-1 uppercase tracking-wide">Pozostałe przedmioty:</p>
                        {hiddenItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/10 font-mono mt-0.5">
                              x{item.quantity}
                            </span>
                            <p className="text-xs text-foreground font-medium break-words whitespace-normal max-w-[240px]" title={item.offer?.name}>
                              {item.offer?.name || "Towar bez nazwy"}
                            </p>
                          </div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/20 px-2 py-0.5 rounded-lg border border-border/5">
                  <User className="h-3.5 w-3.5 opacity-60" />
                  <span>
                    {order.buyer_login || "Brak loginu"}
                    {buyerFullName && ` (${buyerFullName})`}
                  </span>
                </div>
                
                {/* Ikonki dla Wiadomości, Zwrotów, Dyskusji */}
                <TooltipProvider>
                  <div className="flex items-center gap-1">
                    {buyerComment && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center h-4.5 w-4.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-help transition-all hover:bg-amber-500/20">
                            <Mail className="h-2.5 w-2.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] break-words">
                          <p className="font-bold mb-1">Uwagi kupującego:</p>
                          <p className="text-xs">{buyerComment}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {sellerNote && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center h-4.5 w-4.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20 cursor-help transition-all hover:bg-purple-500/20">
                            <StickyNote className="h-2.5 w-2.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] break-words">
                          <p className="font-bold mb-1">Uwagi do zakupu (sprzedawca):</p>
                          <p className="text-xs">{sellerNote}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {order.has_returns && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center h-4.5 w-4.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 cursor-help transition-all hover:bg-rose-500/20">
                            <ArrowRightLeft className="h-2.5 w-2.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-semibold">Zamówienie posiada zwrot</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {order.has_threads && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center h-4.5 w-4.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 cursor-help transition-all hover:bg-blue-500/20">
                            <MessageSquare className="h-2.5 w-2.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-semibold">Czat / Wiadomości z klientem</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {order.has_disputes && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center h-4.5 w-4.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 cursor-help transition-all hover:bg-red-500/20 animate-pulse">
                            <AlertTriangle className="h-2.5 w-2.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs font-semibold text-red-500">Aktywny spór / dyskusja Allegro!</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>

              {/* Dodatkowe oznaczenia */}
              <div className="flex flex-wrap gap-1 mt-1">
                {/* Usługi dodatkowe */}
                {hasAdditionalServices && (
                  <div className="flex items-center gap-1 text-indigo-400 bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-2 py-0.5 w-fit">
                    <Sparkles className="h-2.5 w-2.5 shrink-0" />
                    <span className="text-[10px] font-bold">
                      Usługi: {additionalServices.map((s: any) => s.name || s.definitionId).join(", ")}
                    </span>
                  </div>
                )}

                {/* Dane do FV */}
                {hasInvoice && (
                  <div className="flex items-center gap-1 text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-2 py-0.5 w-fit">
                    <Receipt className="h-2.5 w-2.5 shrink-0" />
                    <span className="text-[10px] font-bold font-mono">
                      FV: {invoiceTaxId ? `NIP ${invoiceTaxId}` : "Brak NIP"}
                    </span>
                    {invoiceCompany && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]" title={invoiceCompany}>
                        ({invoiceCompany})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "purchased_at",
        header: "Data",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {format(new Date(row.original.purchased_at), "dd.MM.yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(row.original.purchased_at), "HH:mm")}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "service_integration.name",
        header: "Źródło",
        cell: ({ row }) => {
          const integration = row.original.service_integration;
          const styles = getIntegrationStyle(integration?.provider_type);
          return (
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center border transition-all duration-200", styles.bg, styles.border)}>
                <span className={cn("text-xs font-bold font-mono", styles.text)}>{styles.letter}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">{integration?.name || "Zamówienie ręczne"}</p>
                <p className="text-[10px] text-muted-foreground truncate italic">
                  {integration?.external_user_id || "Brak konta"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "total_to_pay",
        header: "Cena",
        cell: ({ row }) => {
          const value = row.original.total_to_pay;
          return (
            <span className="font-bold text-sm text-foreground whitespace-nowrap">
              {value !== null && value !== undefined ? `${value.toFixed(2)} PLN` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const order = row.original;
          const status = order.fulfillment_status || order.status || "UNKNOWN";
          const displayStatus = translateStatus(status);

          const getStatusStyle = (s: string) => {
            const u = s.toUpperCase();
            if (["SENT", "SHIPPED", "CLOSED", "DELIVERED", "COMPLETED"].includes(u)) {
              return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            }
            if (["CANCELLED", "CANCELED", "REFUSED", "FAILED"].includes(u)) {
              return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            }
            if (["READY_FOR_SHIPMENT", "PICKUP_READY", "READY"].includes(u)) {
              return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
            }
            if (["PROCESSING", "SHIPPING", "ACCEPTED"].includes(u)) {
              return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
            }
            return "bg-amber-500/10 text-amber-400 border-amber-500/20";
          };

          return (
            <Badge 
              variant="outline"
              className={cn(
                "rounded-lg font-bold text-[10px] uppercase tracking-tighter h-6 px-2.5 border",
                getStatusStyle(status)
              )}
            >
              {displayStatus}
            </Badge>
          );
        },
      },
      {
        id: "indicators",
        header: () => <div className="text-right">Wpłata / Wysyłka</div>,
        cell: ({ row }) => {
          const order = row.original;
          const isCashOnDelivery = order.payment_type === "CASH_ON_DELIVERY";
          const isPaid = order.payment_status === "COMPLETED" && !isCashOnDelivery;
          const validTrackingNumbers = order.tracking_numbers?.filter((t) => t && t.trim() !== "") || [];
          const hasTracking = validTrackingNumbers.length > 0;
          return (
            <TooltipProvider>
              <div className="flex justify-end items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-all border",
                      isPaid 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : isCashOnDelivery 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                          : "bg-muted text-muted-foreground border-border/10"
                    )}>
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="font-bold">{order.total_to_pay} PLN</div>
                    <p className="text-xs opacity-80">
                      {isCashOnDelivery ? "Pobranie (COD)" : isPaid ? "Opłacone online" : "Nieopłacone"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-all border",
                      hasTracking ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-muted text-muted-foreground border-border/10"
                    )}>
                      <Truck className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasTracking
                      ? validTrackingNumbers.join(", ")
                      : "Brak numeru nadania"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Otwórz menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Akcje</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => router.push(`/orders/${order.id}`)}
                >
                  Zobacz szczegóły
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSendEmailDialog(order.id)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Wyślij e-mail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router, viewMode]
  );

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await api.get<ServiceIntegration[]>(
          "/service-integrations"
        );
        setIntegrations(response.data);
      } catch {
        toast.error("Nie udało się pobrać listy integracji do filtra.");
      }
    };
    fetchIntegrations();
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!isLoading) setIsLoading(true);
    const sortParam = sorting[0]?.id;
    const orderParam =
      sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

    try {
      const response = await api.get<PaginatedOrdersResponse>("/orders", {
        params: {
          page: pagination.pageIndex + 1,
          size: pagination.pageSize,
          sortBy: sortParam,
          sortOrder: orderParam,
          search: debouncedSearch || undefined,
          integrationId:
            filters.integrationId === "all"
              ? undefined
              : filters.integrationId === "manual"
              ? 0
              : filters.integrationId,
          status: filters.status === "all" ? undefined : filters.status,
          dateFrom: filters.dateRange?.from
            ? format(filters.dateRange.from, "yyyy-MM-dd")
            : undefined,
          dateTo: filters.dateRange?.to
            ? format(filters.dateRange.to, "yyyy-MM-dd")
            : undefined,
        },
      });
      setData(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać listy zamówień.");
    } finally {
      setIsLoading(false);
    }
  }, [pagination, sorting, debouncedSearch, filters, isLoading]);

  useEffect(() => {
    fetchOrders();
  }, [pagination, sorting, debouncedSearch, filters]);

  const generateBulkSingleOrderPdf = async () => {
    const element = document.getElementById("print-order-card");
    if (!element) return null;

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
      return { base64: pdfBase64 };
    } catch (err) {
      console.error(err);
      element.className = originalClassName;
      return null;
    }
  };

  const resolveOrdersBundleComponents = async (ordersDetails: any[]) => {
    try {
      const integrationsRes = await api.get("/service-integrations");
      const integrations = integrationsRes.data;
      const erpIntegration = integrations?.find((i: any) => i.provider_type === "SUBIEKT_GT");
      if (!erpIntegration?.id) return;

      for (const orderDetail of ordersDetails) {
        try {
          const offerIds = [];
          if (orderDetail.integration?.provider_type === "EMPIK" || orderDetail.service_integration?.provider_type === "EMPIK") {
            const items = orderDetail.details_payload?.order_lines || [];
            offerIds.push(...items.map((item: any) => item.offer_id?.toString() || item.offer_sku).filter(Boolean));
          } else {
            const items = orderDetail.line_items || orderDetail.details_payload?.lineItems || orderDetail.details_payload?.products || [];
            offerIds.push(...items.map((item: any) => item.offer?.id || item.product_id).filter(Boolean));
          }

          if (offerIds.length > 0 && (orderDetail.integration?.id || orderDetail.service_integration?.id)) {
            const sourceIntId = orderDetail.integration?.id || orderDetail.service_integration?.id;
            const params = new URLSearchParams();
            params.append("source_integration_id", sourceIntId.toString());
            params.append("erp_integration_id", erpIntegration.id.toString());
            offerIds.forEach((id: string) => params.append("offer_ids", id));

            const mappingsResponse = await api.get("/product-erp-mappings/by-offers-and-integrations", { params });
            const productMappings = mappingsResponse.data;

            const erpSymbols = Object.values(productMappings).map((m: any) => m.erp_product_symbol).filter(Boolean);
            if (erpSymbols.length > 0) {
              const componentsResponse = await api.post(`/erp-proxy/integrations/${erpIntegration.id}/products/components/bulk`, { symbols: erpSymbols });
              const bundleComponents = componentsResponse.data;

              const mapped = mapOrderPayloadToDetails(orderDetail);
              const exploded = [];
              for (const item of mapped.line_items) {
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
              orderDetail.exploded_line_items = exploded;
            }
          }
        } catch (err: any) {
          // ERP proxy niedostępne (np. Subiekt GT offline) — to nie przerywa wydruku
          console.warn(
            `[ERP proxy] Pominięto rozwinięcie zestawów dla zamówienia ${orderDetail.external_order_id ?? orderDetail.id} (${err?.response?.status ?? err?.message ?? "sieć"})`
          );
        }
      }
    } catch (err) {
      console.error("Error resolving bundle components:", err);
    }
  };

  const handleBulkPrint = async () => {
    const selectedIds = Object.keys(rowSelection)
      .filter((key) => rowSelection[key]);

    if (selectedIds.length === 0) return;

    setIsBulkPrinting(true);
    const toastId = toast.loading(`Pobieranie danych dla ${selectedIds.length} zamówień...`);
    try {
      const promises = selectedIds.map((id) => api.get<OrderDetailsApiResponse>(`/orders/${id}`));
      const responses = await Promise.all(promises);
      const ordersDetails = responses.map((r) => r.data);
      await resolveOrdersBundleComponents(ordersDetails);

      if (printHubEnabled && printHubStatus === "connected") {
        toast.loading("Generowanie PDF i wysyłanie do Print Huba...", { id: toastId });
        
        for (let i = 0; i < ordersDetails.length; i++) {
          const orderDetail = ordersDetails[i];
          setBulkPrintOrders([orderDetail]);
          
          await new Promise((resolve) => setTimeout(resolve, 350));
          
          const result = await generateBulkSingleOrderPdf();
          if (result) {
            printHubService.printPdf(result.base64, `Karta_Zamowienia_${orderDetail.external_order_id}`, {
              printerName: defaultInvoicePrinter || undefined
            });
          }
        }
        
        setBulkPrintOrders([]);
        toast.success(`Wysłano ${ordersDetails.length} kart do Print Huba!`, { id: toastId });
      } else {
        toast.loading("Przygotowywanie wydruku...", { id: toastId });
        setBulkPrintOrders(ordersDetails);
        
        await new Promise((resolve) => setTimeout(resolve, 600));
        toast.dismiss(toastId);
        
        window.print();
        
        setTimeout(() => {
          setBulkPrintOrders([]);
        }, 1500);
      }

      // Oznacz jako wydrukowane na backendzie
      await api.post("/orders/bulk-print-status", {
        order_ids: selectedIds,
        is_printed: true
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Wystąpił błąd podczas przygotowywania wydruku.", { id: toastId });
      setBulkPrintOrders([]);
    } finally {
      setIsBulkPrinting(false);
    }
  };

  const handlePrintSinceLastPrint = async () => {
    setIsPrintingSinceLast(true);
    const toastId = toast.loading("Pobieranie nieprzygotowanych zamówień do druku...");
    try {
      const response = await api.get<OrderDetailsApiResponse[]>("/orders/unprinted-to-realize");
      const unprintedOrders = response.data;

      if (unprintedOrders.length === 0) {
        toast.success("Brak nowych zamówień do wydrukowania.", { id: toastId });
        return;
      }

      toast.loading(`Generowanie PDF i drukowanie dla ${unprintedOrders.length} zamówień...`, { id: toastId });
      await resolveOrdersBundleComponents(unprintedOrders);

      if (printHubEnabled && printHubStatus === "connected") {
        for (let i = 0; i < unprintedOrders.length; i++) {
          const orderDetail = unprintedOrders[i];
          setBulkPrintOrders([orderDetail]);
          
          await new Promise((resolve) => setTimeout(resolve, 350));
          
          const result = await generateBulkSingleOrderPdf();
          if (result) {
            printHubService.printPdf(result.base64, `Karta_Zamowienia_${orderDetail.external_order_id}`, {
              printerName: defaultInvoicePrinter || undefined
            });
          }
        }
        
        setBulkPrintOrders([]);
        toast.success(`Wysłano ${unprintedOrders.length} kart do Print Huba!`, { id: toastId });
      } else {
        setBulkPrintOrders(unprintedOrders);
        await new Promise((resolve) => setTimeout(resolve, 600));
        toast.dismiss(toastId);
        window.print();
        setTimeout(() => {
          setBulkPrintOrders([]);
        }, 1500);
      }

      // Oznacz jako wydrukowane na backendzie
      const orderIds = unprintedOrders.map((o) => o.id);
      await api.post("/orders/bulk-print-status", {
        order_ids: orderIds,
        is_printed: true
      });
      setUnprintedCount(0); // badge → 0 po udanym wydruku
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Wystąpił błąd podczas drukowania od ostatniego wydruku.", { id: toastId });
    } finally {
      setIsPrintingSinceLast(false);
    }
  };

  const handleBulkDownloadPdf = async () => {
    const selectedIds = Object.keys(rowSelection)
      .filter((key) => rowSelection[key]);

    if (selectedIds.length === 0) return;

    setIsBulkSavingPdf(true);
    const toastId = toast.loading(`Pobieranie danych dla ${selectedIds.length} zamówień...`);
    try {
      const promises = selectedIds.map((id) => api.get<OrderDetailsApiResponse>(`/orders/${id}`));
      const responses = await Promise.all(promises);
      const ordersDetails = responses.map((r) => r.data);
      await resolveOrdersBundleComponents(ordersDetails);

      toast.loading("Generowanie połączonego pliku PDF...", { id: toastId });

      const { default: html2canvas } = await import("html2canvas-pro");
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < ordersDetails.length; i++) {
        const orderDetail = ordersDetails[i];
        setBulkPrintOrders([orderDetail]);
        
        await new Promise((resolve) => setTimeout(resolve, 350));

        const element = document.getElementById("print-order-card");
        if (element) {
          const originalClassName = element.className;
          element.className = "bg-white text-black p-6 w-[210mm] mx-auto block text-xs font-sans absolute left-0 top-0 z-50";

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });

          element.className = originalClassName;

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const imgWidth = 210;
          const pageHeight = 297;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const renderHeight = Math.min(imgHeight, pageHeight - 16);

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, "JPEG", 0, 8, imgWidth, renderHeight);
        }
      }

      setBulkPrintOrders([]);
      pdf.save(`Karty_Zamowien_${Date.now()}.pdf`);
      toast.success("Zapisano połączony plik PDF!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się wygenerować połączonego pliku PDF.", { id: toastId });
      setBulkPrintOrders([]);
    } finally {
      setIsBulkSavingPdf(false);
    }
  };

  const toolbar = useMemo(
    () => (
      <DataTableToolbar
        filters={filters}
        setFilters={setFilters}
        integrations={
          integrations.filter(
            (integration) =>
              integration &&
              ["ALLEGRO", "BASELINKER", "EMPIK", "INPOST_BUY", "WOOCOMMERCE"].includes(
                integration.provider_type
              )
          ) as { id: number; name: string }[]
        }
        onManualOrderClick={() => setManualOrderOpen(true)}
      />
    ),
    [filters, integrations]
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-border/30 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:bg-slate-900/40 dark:bg-none backdrop-blur-xl p-6 md:p-8 shadow-xl shadow-slate-200/40 dark:shadow-black/10">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none animate-pulse" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              Pulpit Sprzedawcy
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-none">
              Zamówienia
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Inteligentne zarządzanie sprzedażą wielokanałową w czasie rzeczywistym.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-auto">
            {filters.status === "to-realize" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative inline-flex">
                      <Button
                        onClick={handlePrintSinceLastPrint}
                        disabled={isPrintingSinceLast || isLoading}
                        className="h-8.5 rounded-xl px-4 bg-primary text-black hover:bg-primary/90 text-xs font-bold shadow-md shadow-primary/10 hover:shadow-primary/25 border-none transition-all duration-300 gap-1.5"
                      >
                        {isPrintingSinceLast ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Printer className="h-3.5 w-3.5" />
                        )}
                        Drukuj od ostatniego druku
                      </Button>
                      {/* Badge z liczbą niewydrukowanych */}
                      {!isPrintingSinceLast && unprintedCount !== null && (
                        <span
                          className={`absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shadow-md border border-black/10 transition-all duration-300 ${
                            unprintedCount === 0
                              ? "bg-muted text-muted-foreground"
                              : "bg-amber-400 text-black animate-pulse"
                          }`}
                        >
                          {isLoadingUnprintedCount ? "…" : unprintedCount}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="flex flex-col gap-0.5 text-xs max-w-[220px]">
                    {isLoadingUnprintedCount ? (
                      <span>Sprawdzanie…</span>
                    ) : unprintedCount === null ? (
                      <span>Drukuj wszystkie niewydrukowane zamówienia</span>
                    ) : unprintedCount === 0 ? (
                      <span className="text-muted-foreground">✓ Wszystkie zamówienia zostały już wydrukowane</span>
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">{unprintedCount} {unprintedCount === 1 ? "zamówienie" : unprintedCount < 5 ? "zamówienia" : "zamówień"} oczekuje na wydruk</span>
                        <span className="text-muted-foreground">Kliknij, aby wydrukować wszystkie niewydrukowane</span>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-950/60 border border-slate-300/60 dark:border-border/30 p-1 rounded-2xl backdrop-blur-md shadow-inner">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("compact")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all duration-300",
                viewMode === "compact"
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListCollapse className="h-3.5 w-3.5" />
              Tryb Kompaktowy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("expanded")}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 transition-all duration-300",
                viewMode === "expanded"
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tryb Rozszerzony
            </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newVal = !showMissingStock;
                setShowMissingStock(newVal);
                localStorage.setItem("orders_show_missing_stock", String(newVal));
                window.dispatchEvent(new Event("orders_show_missing_stock_changed"));
              }}
              className={cn(
                "h-9 px-3.5 rounded-2xl text-xs font-bold gap-1.5 transition-all duration-300 border backdrop-blur-md shadow-sm",
                showMissingStock
                  ? "bg-red-500/10 hover:bg-red-500/15 text-red-400 border-red-500/25"
                  : "bg-slate-100 dark:bg-slate-950/40 hover:bg-slate-200 dark:hover:bg-slate-950/60 text-muted-foreground hover:text-foreground border-slate-200 dark:border-border/30"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{showMissingStock ? "Braki: Pokazuj" : "Braki: Ukryj"}</span>
            </Button>
        </div>
      </div>
    </div>

      {activeOrder && (
        <SendEmailDialog
          isOpen={isSendEmailOpen}
          setIsOpen={setSendEmailOpen}
          order={activeOrder}
          // === ZMIANA: Nie przekazujemy `templateToEdit`, więc modal wie, że ma pokazać listę ===
        />
      )}

      <ManualOrderDialog
        isOpen={isManualOrderOpen}
        setIsOpen={setManualOrderOpen}
        onSuccess={fetchOrders}
      />

      {/* ── DataTable with Selection ── */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.items || []}
          pageCount={data?.pages || 0}
          pagination={pagination}
          setPagination={setPagination}
          sorting={sorting}
          setSorting={setSorting}
          toolbar={toolbar}
          viewMode={viewMode}
          onRowClick={(row) => router.push(`/orders/${row.original.id}`)}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          getRowId={(row) => row.id}
          isLoading={isLoading}
        />
      )}

      {/* ── FLOATING BULK ACTIONS BANNER ── */}
      {Object.keys(rowSelection).filter(k => rowSelection[k]).length > 0 && (() => {
        const selectedCount = Object.keys(rowSelection).filter(k => rowSelection[k]).length;
        if (selectedCount === 0) return null;

        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/95 dark:bg-slate-900/90 border border-primary/30 px-6 py-3 rounded-2xl shadow-xl shadow-slate-300/50 dark:shadow-black/50 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
            <span className="text-xs font-bold text-foreground font-mono">
              Wybrano: <span className="text-primary text-sm font-extrabold">{selectedCount}</span>
            </span>
            <Separator orientation="vertical" className="h-6 bg-border/40" />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkPrint}
                disabled={isBulkPrinting || isBulkSavingPdf}
                className="border-primary/20 text-primary hover:bg-primary/10 bg-primary/5 dark:bg-white/5 font-semibold text-xs rounded-xl shadow-md h-8.5"
              >
                {isBulkPrinting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Printer className="h-3.5 w-3.5 mr-1.5" />
                )}
                {printHubEnabled && printHubStatus === "connected" ? "Drukuj przez PrintHub" : "Drukuj wybrane"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDownloadPdf}
                disabled={isBulkPrinting || isBulkSavingPdf}
                className="border-border/30 text-foreground/80 hover:text-foreground hover:bg-accent/10 bg-accent/5 font-semibold text-xs rounded-xl shadow-md h-8.5"
              >
                {isBulkSavingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                Pobierz PDF
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRowSelection({})}
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 rounded-xl h-8.5"
              >
                Anuluj
              </Button>
            </div>
          </div>
        );
      })()}

      {/* ── PRINT-ONLY CONTAINER FOR BULK PRINT ── */}
      {bulkPrintOrders.length > 0 && (
        <div id="print-order-card" className="hidden print:block font-sans text-xs bg-white text-black p-0 max-w-[210mm] mx-auto">
          {/* Style block for print-specific styles (e.g. page margin, hiding non-print elements) */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              html, body {
                height: auto !important;
                overflow: visible !important;
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
                margin: 0;
                padding: 0;
                box-shadow: none;
                border: none;
              }
              .print-page-break {
                page-break-after: always;
                break-after: page;
              }
              .print-page-break:last-child {
                page-break-after: avoid;
                break-after: avoid;
              }
              @page {
                size: A4;
                margin: 0.8cm 1.0cm 0.8cm 1.0cm;
              }
            }
          `}} />

          {bulkPrintOrders.map((ordData) => {
            const mapped = mapOrderPayloadToDetails(ordData);
            const providerType = ordData.integration?.provider_type || ordData.service_integration?.provider_type;
            const isCod = ordData.payment_type === "CASH_ON_DELIVERY" || mapped.payment.type === "CASH_ON_DELIVERY";

            // Safe calculations
            const shippingCost = ordData.details_payload?.shipping_price !== undefined && ordData.details_payload?.shipping_price !== null ? parseFloat(ordData.details_payload.shipping_price) :
                                 ordData.details_payload?.delivery_price !== undefined && ordData.details_payload?.delivery_price !== null ? parseFloat(ordData.details_payload.delivery_price) :
                                 ordData.details_payload?.delivery?.cost?.amount !== undefined && ordData.details_payload?.delivery?.cost?.amount !== null ? parseFloat(ordData.details_payload.delivery.cost.amount) : 0;
            const formattedShippingCost = shippingCost.toFixed(2);

            const da = ordData.delivery_address;
            const inv = ordData.invoice_address;

            const deliveryName = da
              ? formatName(da.first_name, da.last_name, da.company_name)
              : formatName(
                  mapped.delivery.address?.firstName,
                  mapped.delivery.address?.lastName,
                  mapped.delivery.address?.companyName
                );
            const deliveryStreet = da?.street || mapped.delivery.address?.street;
            const deliveryZip = da?.zip_code || mapped.delivery.address?.zipCode;
            const deliveryCity = da?.city || mapped.delivery.address?.city;
            const deliveryCountry = da?.country_code || mapped.delivery.address?.countryCode;
            const deliveryPhone = da?.phone_number || mapped.delivery.address?.phoneNumber || (ordData as any).buyer_phone_number;

            const invoiceName = inv
              ? formatName(inv.first_name, inv.last_name, inv.company_name)
              : formatName(
                  mapped.invoice.address?.firstName,
                  mapped.invoice.address?.lastName,
                  mapped.invoice.address?.companyName
                );
            const invoiceTaxId = inv?.tax_id || mapped.invoice.address?.taxId;
            const invoiceStreet = inv?.street || mapped.invoice.address?.street;
            const invoiceZip = inv?.zip_code || mapped.invoice.address?.zipCode;
            const invoiceCity = inv?.city || mapped.invoice.address?.city;
            
            return (
              <div key={ordData.id} className="print-page-break p-4 bg-white text-black min-h-[270mm] flex flex-col justify-between">
                {/* Header: Logo, Title, Info */}
                <div>
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
                      <p className="text-sm font-bold text-indigo-600 font-mono mt-0.5">#{ordData.external_order_id}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {ordData.id}</p>
                    </div>
                  </div>

                  {/* Sub-header Metadata Row */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 mb-3 text-[10px]">
                    <div>
                      <span className="text-gray-500 block uppercase font-bold tracking-wider">Kupujący (Login):</span>
                      <span className="font-bold text-gray-900 text-xs">{ordData.buyer_login || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block uppercase font-bold tracking-wider">Data zakupu:</span>
                      <span className="font-bold text-gray-900 text-xs">
                        {new Date(ordData.purchased_at).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block uppercase font-bold tracking-wider">Integracja / Źródło:</span>
                      <span className="font-bold text-gray-900 text-xs uppercase">
                        {ordData.integration?.name || ordData.service_integration?.name || "ZAMÓWIENIE RĘCZNE"}
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
                      {mapped.delivery.isPickupPoint ? (
                        <div className="space-y-1">
                          <div className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                            PUNKT ODBIORU: {mapped.delivery.pickupPointName}
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
                          <span className="font-bold text-gray-900 uppercase">{mapped.delivery.methodName}</span>
                        </div>
                        {(ordData.buyer_email || deliveryPhone) && (
                          <div className="flex flex-col gap-0.5 text-[10px] text-gray-600 pt-1 border-t border-dashed border-gray-100 mt-1">
                            {ordData.buyer_email && <div>E-mail: <span className="font-mono text-gray-950 font-medium">{ordData.buyer_email}</span></div>}
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
                        {(mapped.invoice.required || inv) && (invoiceStreet || invoiceName || invoiceTaxId) ? (
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
                            {mapped.payment.provider} ({mapped.payment.status})
                          </span>
                        </div>

                        {isCod ? (
                          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-1.5 mt-1.5 text-center shadow-sm">
                            <span className="block text-[10px] font-black text-red-600 uppercase tracking-widest">
                              ⚠️ PRZESYŁKA POBRANIOWA (COD) ⚠️
                            </span>
                            <span className="block text-xs font-black text-red-700 font-mono mt-0.5">
                              POBIERZ: {mapped.payment.total}
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
                  {mapped.buyerComments && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-2 mb-3 rounded-r-lg">
                      <span className="block text-[10px] font-black uppercase text-yellow-800 tracking-wider mb-0.5">
                        Uwagi od kupującego:
                      </span>
                      <p className="text-xs font-semibold text-yellow-950 whitespace-pre-wrap leading-tight italic">
                        &quot;{mapped.buyerComments}&quot;
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
                        {((ordData as any).exploded_line_items || mapped.line_items).map((item: any, index: number) => {
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
                            const totalFloat = parseFloat(mapped.payment.total.replace(/[^\d.,]/g, "").replace(",", "."));
                            const shippingFloat = parseFloat(formattedShippingCost || "0");
                            if (isNaN(totalFloat)) return "0.00 PLN";
                            if (isNaN(shippingFloat)) return totalFloat.toFixed(2) + " PLN";
                            return (totalFloat - shippingFloat).toFixed(2) + " PLN";
                          })()}
                        </span>
                      </div>
                      {shippingCost > 0 && (
                        <div className="flex justify-between px-2">
                          <span className="text-gray-500">Koszt wysyłki:</span>
                          <span className="font-mono text-gray-800">{formattedShippingCost} PLN</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 mt-1">
                        <span className="font-bold text-gray-900 text-xs uppercase font-mono">Do zapłaty (Razem):</span>
                        <span className="font-mono font-black text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                          {mapped.payment.total}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer branding */}
                <div className="border-t border-gray-200 mt-5 pt-2 text-center text-[9px] text-gray-400 flex justify-between">
                  <span>Wygenerowano automatycznie z systemu SuppSales</span>
                  <span>Wydrukowano: {new Date().toLocaleString("pl-PL")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
