"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { usePrintHub } from "@/hooks/use-print-hub";
import { printHubService } from "@/lib/print-hub-service";
import { useShippingConfig } from "../_hooks/use-shipping-config";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { ServiceIntegration } from "@/types/service-integration";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AllegroIcon, BaseLinkerIcon, EmpikIcon } from "@/components/shared/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function FulfillmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // PrintHub hook to auto-print documents
  const {
    isEnabled: printHubEnabled,
    status: printHubStatus,
    defaultLabelPrinter,
    printErpSymbolOnLabel,
    labelItemsPerPage,
  } = usePrintHub();

  // 1. Fetch Shipping Config (couriers, predefined packages, delivery mappings)
  const { data: config, isLoading: isConfigLoading } = useShippingConfig();

  // Fetch Organization for custom reference template
  const { data: organization } = useQuery<any>({
    queryKey: ["organization"],
    queryFn: async () => (await api.get("/organization")).data,
    staleTime: 5 * 60 * 1000,
  });

  const [pageOffset, setPageOffset] = useState(0);
  const [queueFilter, setQueueFilter] = useState<"ALL" | "ERR_FV" | "ERR_LBL" | "SKIP" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
          ["SKIP"].forEach((flag) => {
            params.append("excludeFlags", flag);
          });
        } else if (queueFilter === "ERR_FV") {
          params.append("flags", "ERR_FV");
        } else if (queueFilter === "ERR_LBL") {
          params.append("flags", "ERR_LBL");
        } else if (queueFilter === "SKIP") {
          params.append("flags", "SKIP");
        }
      }

      const res = await api.get(`/orders?${params.toString()}`);
      return res.data;
    },
    refetchOnWindowFocus: false,
  });

  const currentOrder = queueData?.items?.[0] as MarketplaceOrder | undefined;
  const totalOrders = queueData?.total || 0;

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
  const { mappedCourier, mappedPackageId } = useMemo(() => {
    if (!currentOrder || !config) {
      return { mappedCourier: null, mappedPackageId: null };
    }
    const mapping = config.mappings.find((m) => {
      const isSameIntegration = m.source_integration?.id === currentOrder.service_integration?.id;
      if (!isSameIntegration) return false;

      if (currentOrder.service_integration?.provider_type === "ALLEGRO") {
        // Mapowania są zapisane po nazwie metody (method.name), nie po ID (method.id)
        // Backend też używa nazwy: details.get("delivery", {}).get("method", {}).get("name")
        const methodName = currentOrder.details_payload?.delivery?.method?.name;
        return m.marketplace_delivery_method === methodName;
      } else {
        const method = currentOrder.details_payload?.delivery_method;
        return m.marketplace_delivery_method === method;
      }
    });
    const defaultPackage = config.packages.find((p) => p.is_default);
    if (!mapping) {
      return {
        mappedCourier: null,
        mappedPackageId: defaultPackage?.id || null,
      };
    }
    const courier = config.couriers.find((c) => c.id === mapping.service_integration_id);
    return {
      mappedCourier: courier,
      mappedPackageId: mapping.default_package_definition_id || defaultPackage?.id || null,
    };
  }, [currentOrder, config]);

  const selectedPackage = useMemo(() => {
    if (!config || !mappedPackageId) return null;
    return config.packages.find((p) => p.id === mappedPackageId) || null;
  }, [config, mappedPackageId]);

  // Order flags and address parsing
  const isCod = useMemo(() => {
    if (!currentOrder) return false;
    if (currentOrder.service_integration?.provider_type === "ALLEGRO") {
      return currentOrder.details_payload?.payment?.type === "CASH_ON_DELIVERY";
    }
    return String(currentOrder.details_payload?.payment_method_cod) === "1";
  }, [currentOrder]);

  const hasInvoiceRequired = useMemo(() => {
    if (!currentOrder) return false;
    if (currentOrder.invoice_address) return true;
    if (currentOrder.details_payload?.invoice?.required) return true;
    return currentOrder.details_payload?.want_invoice === "1";
  }, [currentOrder]);

  const buyerMessage = useMemo(() => {
    if (!currentOrder) return null;
    return (
      currentOrder.details_payload?.messageToSeller?.text ||
      currentOrder.details_payload?.user_comments ||
      currentOrder.details_payload?.message_to_seller
    );
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
  const [apaczkaServices, setApaczkaServices] = useState<any[]>([]);

  // Dialog open states for address and billing editing
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);

  // Reference number & Conversations states
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  const totalCodAmount = currentOrder?.total_to_pay || 0;

  useEffect(() => {
    if (mappedCourier) {
      setSelectedCourierId(mappedCourier.id);
    } else {
      setSelectedCourierId(null);
    }
  }, [mappedCourier]);

  // Synchronize packages on order and default mapping change
  useEffect(() => {
    if (currentOrder) {
      const initialCodAmount = isCod ? totalCodAmount.toFixed(2) : "";
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
    } else {
      setPackages([]);
    }
  }, [currentOrder, mappedPackageId, isCod, totalCodAmount]);

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

  const splitCodForPackages = (currentPackages: PackageState[]) => {
    const numPackages = currentPackages.length;
    if (!isCod || numPackages === 0) return;

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
    const newCodAmount = isCod ? "0.00" : "";
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
    if (isCod) {
      splitCodForPackages(newPackages);
    }
  };

  const removePackage = (id: string) => {
    const newPackages = packages.filter((p) => p.id !== id);
    setPackages(newPackages);
    if (isCod && newPackages.length > 0) {
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
          setSelectedServiceCode(res.data[0].id);
        }
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchServices();
  }, [selectedCourierId, config?.couriers]);

  // Sync index to stay within queue limits if items are processed/flagged
  useEffect(() => {
    if (totalOrders > 0 && pageOffset >= totalOrders) {
      setPageOffset(Math.max(0, totalOrders - 1));
    }
  }, [totalOrders, pageOffset]);

  // Endpoint handlers for order flags
  const handleAddFlag = useCallback(async (flagType: "SKIP" | "TO_CHECK") => {
    if (!currentOrder) return;
    try {
      await api.post(`/orders/${currentOrder.id}/flags`, { flag: flagType });
      toast.success(`Przypisano flagę: ${flagType === "SKIP" ? "Omiń" : "Do sprawdzenia"}`);
      queryClient.invalidateQueries({ queryKey: ["fulfillmentQueue"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Nie udało się przypisać flagi.");
    }
  }, [currentOrder, queryClient]);

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
        if (printHubEnabled && printHubStatus === "connected" && invoiceResult.document_number) {
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
          cod_amount: isCod ? parseFloat(pkg.codAmount.replace(",", ".")) : undefined,
          is_nstd: pkg.is_nstd,
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
      };

      const isManual = selectedCourierId !== mappedCourier?.id;
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
          <span className="text-xs text-slate-300">
            Faktura: <strong className="font-mono bg-emerald-500/20 px-1 py-0.5 rounded text-white ml-1">{invoiceResult.document_number}</strong>
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

      if (!currentOrder || isProcessing) {
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
        case "c":
          e.preventDefault();
          handleAddFlag("TO_CHECK");
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
  }, [currentOrder, isProcessing, handleProcessOrder, handleAddFlag, handleRemoveFlag, router, setPageOffset]);

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
      : currentOrder.details_payload?.delivery_method || "Nie określono")
    : "Nie określono";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-slate-100">
      
      {/* 1. TOP HEADER SECTION */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/shipping")}
            className="text-slate-300 hover:text-white rounded-lg px-2 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Powrót (Esc)
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-lg font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            <Sparkles className="h-4.5 w-4.5 text-indigo-400" /> Stacja Nabijania
          </h1>
          
          <div className="relative w-64 ml-4 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Szukaj (ID, login, email)..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl py-1.5 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Queue filter selection pills */}
        <div className="flex bg-slate-950 p-1 border border-white/10 rounded-xl gap-1 text-[11px] shrink-0">
          <button
            onClick={() => setQueueFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1",
              queueFilter === "ALL"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-400" /> Kolejka główna
          </button>
          <button
            onClick={() => setQueueFilter("ERR_FV")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1",
              queueFilter === "ERR_FV"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> Błąd FV
          </button>
          <button
            onClick={() => setQueueFilter("ERR_LBL")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1",
              queueFilter === "ERR_LBL"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <Box className="h-3.5 w-3.5 text-amber-400" /> Błąd Listu
          </button>
          <button
            onClick={() => setQueueFilter("SKIP")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1",
              queueFilter === "SKIP"
                ? "bg-slate-800 text-slate-300 border border-white/10"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            )}
          >
            <SkipForward className="h-3.5 w-3.5 text-slate-400" /> Ominięte
          </button>
        </div>

        {/* Queue navigation & History buttons */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-white/10 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <History className="h-3.5 w-3.5" />
                <span>Zrealizowane</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-950 border-l border-white/10 text-slate-100 w-[450px] sm:max-w-[450px] flex flex-col p-0">
              <SheetHeader className="p-6 border-b border-white/5">
                <SheetTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-400" />
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
                              {order.service_integration?.provider_type === "ALLEGRO" && <AllegroIcon className="h-4 w-4 shrink-0" />}
                              {order.service_integration?.provider_type === "BASELINKER" && <BaseLinkerIcon className="h-4 w-4 rounded-sm shrink-0" />}
                              {order.service_integration?.provider_type === "EMPIK" && <EmpikIcon className="h-4 w-4 rounded-sm shrink-0" />}
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
                            <div className="text-[10px] text-slate-400 font-mono flex gap-1 items-center">
                              <Truck className="h-3 w-3 text-slate-500" />
                              <span>{order.tracking_numbers.join(", ")}</span>
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
            <span>Podgląd wyszukanego zamówienia dla: <strong className="font-mono text-white">"{searchQuery}"</strong></span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalSearch("");
              setSearchQuery("");
            }}
            className="h-6 px-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-md text-[11px] cursor-pointer"
          >
            Wróć do kolejki głównej
          </Button>
        </div>
      )}

      {/* 3. MAIN DASHBOARD CONTENT */}
      {!currentOrder ? (
        searchQuery ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center max-w-lg mx-auto px-6 animate-fade-in">
            <div className="p-4 bg-slate-900 rounded-full border border-white/10 text-slate-400">
              <Search className="h-16 w-16 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Brak wyników wyszukiwania</h2>
            <p className="text-sm text-slate-300 font-medium">
              Nie znaleźliśmy zamówień pasujących do zapytania: <span className="font-semibold text-indigo-400">"{searchQuery}"</span>.
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
            <h2 className="text-2xl font-bold text-white">Kolejka zrealizowana</h2>
            <p className="text-sm text-slate-300 font-medium">
              {queueFilter === "ALL"
                ? "Wszystkie zamówienia do wysłania zostały pomyślnie zrealizowane i nabite. Kolejka magazynowa jest pusta!"
                : queueFilter === "ERR_FV"
                ? "Brak zamówień z błędami faktur w tej kolejce."
                : queueFilter === "ERR_LBL"
                ? "Brak zamówień z błędami listów przewozowych w tej kolejce."
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
        <section className="w-[55%] flex flex-col overflow-y-auto pr-2 gap-4 scrollbar-thin">
          
          <Tabs defaultValue="details" className="w-full flex flex-col gap-4">
            <TabsList className="bg-slate-900/80 border border-white/5 p-1 rounded-xl w-full grid grid-cols-2 shrink-0">
              <TabsTrigger value="details" className="text-xs py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-indigo-300 group-data-[state=active]:text-white" /> Produkty i Paczki
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-xs py-2 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-300 group-data-[state=active]:text-white" /> Rozmowy z Kupującym
                {totalMessages > 0 && (
                  <span className="bg-orange-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold animate-pulse">
                    {totalMessages}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 flex flex-col gap-4 focus:outline-none">
              {/* Order card info details */}
              <Card className="p-6 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-4">
            
            {/* Order Hero Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                {currentOrder.service_integration?.provider_type === "ALLEGRO" && <AllegroIcon className="h-6 w-6 shrink-0" />}
                {currentOrder.service_integration?.provider_type === "BASELINKER" && (
                  <BaseLinkerIcon className="h-6 w-6 rounded-sm shrink-0" />
                )}
                {currentOrder.service_integration?.provider_type === "EMPIK" && (
                  <EmpikIcon className="h-6 w-6 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base leading-none">
                      {currentOrder.buyer_login || "Brak loginu"}
                    </h3>
                    <Badge variant="outline" className="bg-slate-900 border-white/10 text-[9px] text-slate-300 font-semibold px-2 py-0.5 shadow-sm">
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
                <Badge
                  className={cn(
                    "text-[10px] font-semibold h-5",
                    currentOrder.fulfillment_status === "READY_FOR_SHIPMENT"
                      ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}
                  variant="outline"
                >
                  {currentOrder.fulfillment_status || "NOWY"}
                </Badge>
              </div>
            </div>

            {/* Buyer Comments Alert */}
            {buyerMessage && (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-xs font-bold">Uwaga! Wiadomość od kupującego</AlertTitle>
                <AlertDescription className="mt-1 text-xs italic font-semibold">
                  "{buyerMessage}"
                </AlertDescription>
              </Alert>
            )}

            {/* Diagnostic error alerts */}
            {currentOrder.flags?.includes("ERR_FV") && (
              <Alert className="border-rose-500/30 bg-rose-500/10 text-rose-200">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <AlertTitle className="text-xs font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                  Błąd wystawiania Faktury (ERR_FV)
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs font-medium">
                  Podczas ostatniej próby realizacji wystąpił błąd komunikacji z Subiektem GT. 
                  Upewnij się, że symbole produktów są zmapowane prawidłowo w Subiekcie i spróbuj ponownie.
                </AlertDescription>
              </Alert>
            )}

            {currentOrder.flags?.includes("ERR_LBL") && (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <AlertTitle className="text-xs font-bold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                  Błąd generowania Listu Przewozowego (ERR_LBL)
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs font-medium">
                  {currentOrder.erp_sales_document_number || currentOrder.erpSalesDocumentNumber ? (
                    <span>
                      Faktura <strong className="font-mono bg-emerald-500/20 px-1 py-0.5 rounded text-white ml-0.5 mr-0.5">{currentOrder.erp_sales_document_number || currentOrder.erpSalesDocumentNumber}</strong> została utworzona pomyślnie, lecz generowanie etykiety kurierskiej się nie powiodło (błąd 400). Sprawdź poprawność gabarytu paczki oraz adresu odbiorcy.
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
                  <p className="font-semibold text-white mt-1.5">{receiverFullName}</p>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {currentOrder.delivery_address?.street || ""}, {currentOrder.delivery_address?.zip_code || ""}{" "}
                    {currentOrder.delivery_address?.city || ""}
                  </p>
                  {currentOrder.delivery_address?.phone_number && (
                    <p className="text-[11px] font-mono text-indigo-300 mt-1.5 flex items-center gap-1">📞 {currentOrder.delivery_address.phone_number}</p>
                  )}
                </div>
                {deliveryPointId && (
                  <div className="mt-3 flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg text-xs text-blue-400 font-medium max-w-fit shadow-sm">
                    <MapPin className="h-3.5 w-3.5" /> Punkt: <strong className="font-mono text-white text-[10px]">{deliveryPointId}</strong>
                  </div>
                )}
              </div>

              {/* Column 2: Dane do Faktury FV */}
              <div className={cn(
                "p-3.5 border rounded-xl flex flex-col justify-between transition-all duration-300",
                hasInvoiceRequired
                  ? (isInvoiceDataIncomplete ? "border-rose-500/30 bg-rose-500/5 shadow-lg shadow-rose-950/10" : "border-amber-500/20 bg-amber-500/5")
                  : "border-white/5 bg-slate-950/30"
              )}>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1">
                      {hasInvoiceRequired && <FileText className="h-3.5 w-3.5 text-amber-500 animate-pulse" />} Dane do faktury (FV):
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsEditInvoiceOpen(true)}
                      className="h-auto p-0 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      Edytuj FV ✏️
                    </Button>
                  </div>
                  
                  {hasInvoiceRequired ? (
                    <div className="mt-1.5 space-y-0.5 text-xs">
                      {invoiceData?.companyName ? (
                        <p className="font-semibold text-white truncate">{invoiceData.companyName}</p>
                      ) : (
                        (invoiceData?.firstName || invoiceData?.lastName) ? (
                          <p className="font-semibold text-white">{`${invoiceData.firstName || ""} ${invoiceData.lastName || ""}`.trim()}</p>
                        ) : (
                          <p className="text-rose-400 italic font-semibold">Brak nazwy nabywcy!</p>
                        )
                      )}
                      
                      {invoiceData?.taxId && (
                        <p className="font-mono text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded w-fit mt-1 select-all">NIP: {invoiceData.taxId}</p>
                      )}
                      
                      {invoiceData?.street ? (
                        <p className="text-slate-300 mt-1">{invoiceData.street}</p>
                      ) : (
                        <p className="text-rose-400 italic">Brak adresu ulicy!</p>
                      )}
                      
                      {(invoiceData?.zipCode || invoiceData?.city) ? (
                        <p className="text-slate-300">{`${invoiceData.zipCode || ""} ${invoiceData.city || ""}`.trim()}</p>
                      ) : (
                        <p className="text-rose-400 italic font-medium">Brak kodu pocztowego / miasta!</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic mt-3.5">Faktura nie jest wymagana dla tego zamówienia.</p>
                  )}
                </div>
                
                {hasInvoiceRequired && isInvoiceDataIncomplete && (
                  <div className="mt-3 text-[10px] text-rose-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 animate-bounce" /> Niekompletne dane do FV!
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Purchased Line Items Card */}
          <Card className="p-6 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-3">
            <h4 className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Zakupione Produkty:</h4>
            {subiektStock && !subiektStock.is_connected && (
              <Alert variant="destructive" className="mb-3 bg-red-950/20 border-red-500/20 text-red-400 py-2 px-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Brak połączenia z ERP</AlertTitle>
                <AlertDescription className="text-[11px] leading-snug">
                  {subiektStock.reason || "Nie można sprawdzić stanów magazynowych w Subiekcie."}
                </AlertDescription>
              </Alert>
            )}
            <div className="divide-y divide-white/5">
              {lineItems.map((item: any, idx: number) => {
                const offerId = item.offer?.id || item.product_id;
                const mapping = productMappings?.[offerId];
                const hasSymbol = !!mapping?.erp_product_symbol;
                const stockInfo = subiektStock?.items?.find((s: any) => s.offer_id === offerId);

                return (
                  <div key={idx} className="py-3 flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Product thumbnail image with premium loading/error fallback */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-contain border border-white/10 shrink-0 bg-white p-0.5 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-slate-600 shrink-0 shadow-inner">
                          <Box className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight break-words">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            Ilość: x{item.quantity}
                          </span>
                          {subiektStock?.is_connected && stockInfo && stockInfo.has_mapping && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] h-5 px-1.5 py-0 font-normal",
                                stockInfo.is_service
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : stockInfo.has_sufficient_stock
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium"
                              )}
                            >
                              {stockInfo.is_service 
                                ? "Usługa" 
                                : `W ERP: ${stockInfo.quantity_available ?? 0} szt.`}
                            </Badge>
                          )}
                          {offerId && (
                            <span className="text-[11px] text-slate-400 font-mono">Oferta ID: {offerId}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 animate-fade-in">
                      {isMappingsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <div className="flex items-center gap-2">
                          {hasSymbol ? (
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded block">
                                {mapping.erp_product_symbol}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5 block">{mapping.erp_product_name || "Zmapowano"}</span>
                            </div>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] py-0.5 font-bold animate-pulse">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Brak symbolu ERP
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
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </Card>

          {/* Configured Package Card (Editable, Stateful, and Multi-Package) */}
          <Card className="p-6 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-4">
            <h4 className="text-xs text-slate-400 uppercase font-semibold tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Box className="h-4 w-4 text-indigo-400" /> Konfiguracja Przesyłki:
              </span>
              {(selectedCourierId !== mappedCourier?.id || packages.length > 1 || packages[0]?.selectedPackageId !== mappedPackageId || packages[0]?.mode !== "predefined") && (
                <button
                  onClick={() => {
                    setSelectedCourierId(mappedCourier?.id || null);
                    if (currentOrder) {
                      const initialCodAmount = isCod ? totalCodAmount.toFixed(2) : "";
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
            </h4>

            {/* Courier Selection Row */}
            {(() => {
              const selectedCourier = config?.couriers?.find((c) => c.id === selectedCourierId);
              const isApaczka = selectedCourier?.provider_type === "APACZKA";
              return (
                <div className={cn("grid gap-3 text-sm bg-slate-950/20 p-3.5 border border-white/5 rounded-xl", isApaczka ? "grid-cols-2" : "grid-cols-1")}>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Kurier (Odbiorca Etykiety):</label>
                    <select
                      value={selectedCourierId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCourierId(val ? Number(val) : null);
                      }}
                      className="bg-slate-900 border border-white/10 rounded-lg text-white text-xs p-2 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="" className="bg-slate-950">-- Wybierz kuriera --</option>
                      {config?.couriers?.map((courier) => (
                        <option key={courier.id} value={courier.id} className="bg-slate-950">
                          {courier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown usługi tylko dla Apaczka */}
                  {isApaczka && (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Usługa Apaczka:</label>
                      <select
                        value={selectedServiceCode || ""}
                        onChange={(e) => setSelectedServiceCode(e.target.value)}
                        disabled={apaczkaServices.length === 0}
                        className={cn(
                          "bg-slate-900 border border-white/10 rounded-lg text-white text-xs p-2 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer",
                          apaczkaServices.length === 0 && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {apaczkaServices.length === 0 ? (
                          <option value="" className="bg-slate-950">Ładowanie usług...</option>
                        ) : (
                          apaczkaServices.map((service) => (
                            <option key={service.id} value={service.id} className="bg-slate-950">
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

            {/* Reference Number Input */}
            <div className="bg-slate-950/20 p-3.5 border border-white/5 rounded-xl text-sm space-y-1.5 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Tag className="h-3 w-3 text-indigo-400" />
                  Numer referencyjny na etykiecie:
                </span>
                <span className={cn(
                  "text-[10px] font-mono font-semibold px-1 rounded",
                  referenceNumber.length >= maxRefLength
                    ? "text-red-400 bg-red-500/10 animate-pulse font-bold"
                    : referenceNumber.length > maxRefLength - 5
                    ? "text-amber-400 bg-amber-500/10 font-bold"
                    : "text-slate-500"
                )}>
                  {referenceNumber.length}/{maxRefLength}
                </span>
              </div>
              <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-3 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value.substring(0, maxRefLength))}
                  placeholder="Zostaw puste dla domyślnego (nazwy produktów)"
                  className="w-full bg-transparent border-none shadow-none outline-none p-0 h-9 text-xs text-slate-200 focus:outline-none focus:ring-0 min-w-0"
                />
                {referenceNumber && (
                  <button
                    onClick={() => setReferenceNumber("")}
                    className="text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-white/5 transition-all cursor-pointer"
                    title="Wyczyść numer referencyjny"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {currentOrder?.service_integration?.provider_type === "ALLEGRO" && (
                <p className="text-[9px] text-amber-500/70 leading-none">
                  ⚠️ Allegro WZA wymaga referencji o długości maksymalnie 35 znaków.
                </p>
              )}
            </div>

            {/* Packages list constructor */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin">
              {packages.map((pkg, index) => (
                <div
                  key={pkg.id}
                  className="p-3.5 border border-white/5 rounded-xl space-y-3 relative bg-slate-950/40 shadow-inner"
                >
                  <div className="flex justify-between items-center h-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Paczka #{index + 1}</span>
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
                      <div className="flex bg-slate-900/80 rounded-lg p-0.5 border border-white/5 w-fit">
                        <button
                          type="button"
                          onClick={() => handlePackageChange(index, "mode", "predefined")}
                          className={`text-[9px] font-semibold py-1.5 px-3 rounded-md transition-all ${
                            pkg.mode === "predefined"
                              ? "bg-indigo-600 text-white shadow font-semibold"
                              : "text-slate-400 hover:text-slate-200"
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
                          className={`h-[26px] px-2.5 rounded-lg border text-[9px] font-bold transition-all flex items-center justify-center ${
                            pkg.is_nstd
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-md"
                              : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-slate-300"
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
                            <SelectTrigger className="h-8 text-xs bg-slate-900/50 border-white/10 rounded-lg">
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
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-md"
                              : "bg-slate-900/40 text-slate-400 border-white/5 hover:text-slate-300"
                          }`}
                        >
                          Niestandardowa (NSTD)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-0.5">
                        <div className="grid grid-cols-4 gap-1.5">
                          <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Dł</span>
                            <input
                              id={`length_cm-${pkg.id}`}
                              name="length_cm"
                              value={pkg.customPackage.length_cm}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                            />
                            <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">cm</span>
                          </div>

                          <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Sz</span>
                            <input
                              id={`width_cm-${pkg.id}`}
                              name="width_cm"
                              value={pkg.customPackage.width_cm}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                            />
                            <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">cm</span>
                          </div>

                          <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Wy</span>
                            <input
                              id={`height_cm-${pkg.id}`}
                              name="height_cm"
                              value={pkg.customPackage.height_cm}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                            />
                            <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">cm</span>
                          </div>

                          <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all">
                            <span className="text-[9px] font-bold text-slate-400 uppercase mr-0.5 shrink-0 select-none">Wg</span>
                            <input
                              id={`weight_kg-${pkg.id}`}
                              name="weight_kg"
                              value={pkg.customPackage.weight_kg}
                              onChange={(e) => handleCustomDimensionChange(index, e)}
                              className="w-full bg-transparent border-none shadow-none outline-none p-0 h-8 text-xs font-mono text-right focus:outline-none focus:ring-0 text-slate-200 min-w-0"
                            />
                            <span className="text-[9px] text-slate-500 ml-0.5 shrink-0 select-none">kg</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Palet Presets inside custom packages */}
                    {pkg.mode === "custom" && (
                      <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-white/5">
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider select-none">Palety:</span>
                        <div className="flex gap-1">
                          {[
                            { label: "euro", length: "120", width: "80", height: "150", weight: "20" },
                            { label: "pół", length: "80", width: "60", height: "100", weight: "10" }
                          ].map((preset) => (
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
                              <Box className="h-2 w-2 text-indigo-500" />
                              {preset.label} ({preset.length}×{preset.width})
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isCod && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 h-8 mt-0.5">
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider select-none flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> Kwota Pobrania (COD)
                        </span>
                        <div className="relative flex items-center bg-slate-900/60 border border-white/10 rounded-lg px-2 focus-within:border-indigo-500/50 transition-all max-w-[140px]">
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
            </div>

            {/* Action buttons to add package and split COD */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-[11px] bg-slate-950/20 hover:bg-slate-950/40 border-white/5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                onClick={addPackage}
              >
                <PlusCircle className="h-4 w-4 text-indigo-400" /> Dodaj paczkę
              </Button>
              {isCod && packages.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-[11px] bg-slate-950/20 hover:bg-slate-950/40 border-white/5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                  onClick={handleSplitCodClick}
                >
                  <CreditCard className="h-4 w-4 text-emerald-400 animate-pulse" /> Podziel pobranie
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
          
          </Tabs>
        </section>

        {/* RIGHT COLUMN: ACTION PANEL & CONTROLLER QUEUE (45% width) */}
        <section className="w-[45%] flex flex-col gap-6">
          
          {/* Main big processing card */}
          <Card className="flex-1 p-8 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-center gap-6 shadow-2xl relative overflow-hidden group">
            
            {/* Decorative background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-orange-500/10 pointer-events-none opacity-40 group-hover:opacity-65 transition-all duration-700" />

            <div className="relative z-10 flex flex-col items-center gap-5 w-full">
              <div className="p-5 bg-gradient-to-tr from-orange-500/20 to-indigo-500/20 rounded-full border border-white/10 shadow-lg text-orange-400 animate-pulse">
                <Flame className="h-14 w-14" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-wide">Panel Sterowania Realizacją</h3>
                <p className="text-xs text-slate-300 max-w-sm">
                  Jedno kliknięcie automatycznie wygeneruje i wydrukuje fakturę, list przewozowy oraz zrealizuje zamówienie.
                </p>
              </div>

              {/* Glowing Pulse NABIJ button */}
              <Button
                onClick={handleProcessOrder}
                disabled={isProcessing}
                className={cn(
                  "relative w-full max-w-md h-16 text-lg font-bold uppercase tracking-wider rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center gap-2",
                  isProcessing
                    ? "bg-slate-900 border border-white/10 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 to-indigo-600 border-none hover:scale-[1.02] hover:shadow-indigo-500/25 active:scale-95 text-white animate-glow cursor-pointer"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-1 text-slate-400" /> Przetwarzanie...
                  </>
                ) : (
                  <>
                    NABIJ ZAMÓWIENIE ⚡
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Flags management card */}
          <Card className="p-6 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-4">
            <h4 className="text-xs text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-indigo-400" /> Flagi zamówienia (Odłóż na później):
            </h4>

            {/* Display active flags */}
            <div className="flex flex-wrap gap-2 min-h-[2.2rem] p-3 rounded-xl bg-slate-950/30 border border-white/5 items-center">
              {currentOrder.flags && currentOrder.flags.length > 0 ? (
                currentOrder.flags.map((flag) => (
                  <Badge
                    key={flag}
                    className={cn(
                      "text-xs px-2.5 py-1 flex items-center gap-1 border font-semibold",
                      flag === "SKIP"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}
                  >
                    {flag === "SKIP" ? "Omiń (SKIP)" : "Do wyjaśnienia (TO_CHECK)"}
                    <button
                      onClick={() => handleRemoveFlag(flag)}
                      className="ml-1 text-muted-foreground hover:text-white transition-colors"
                      title="Usuń flagę"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">Brak przypisanych flag. Użyj skrótów lub przycisków.</span>
              )}
            </div>

            {/* Set flags buttons */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleAddFlag("TO_CHECK")}
                disabled={isProcessing}
                className="border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-semibold text-xs h-10 hover:border-rose-500/40 active:scale-95"
              >
                Do wyjaśnienia ⚠️ (C)
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleAddFlag("SKIP")}
                disabled={isProcessing}
                className="border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 font-semibold text-xs h-10 hover:border-amber-500/40 active:scale-95 flex items-center justify-center gap-1"
              >
                Omiń zamówienie <ArrowRight className="h-3.5 w-3.5" /> (S)
              </Button>
            </div>
          </Card>

          {/* Keyboard Shortcuts legends card */}
          <Card className="p-6 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-2xl flex flex-col gap-3">
            <h4 className="text-xs text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1.5">
              <Keyboard className="h-4 w-4 text-indigo-400" /> Skróty Klawiszowe (Klawiatura Magazyniera):
            </h4>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400 font-medium">Realizacja (Nabij):</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white border border-white/10 shadow shadow-black">
                  Enter / Spacja
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400 font-medium">Do wyjaśnienia:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white border border-white/10 shadow shadow-black">
                  C
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400 font-medium">Omiń zamówienie:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white border border-white/10 shadow shadow-black">
                  S / Strzałka w prawo
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400 font-medium">Poprzednie w kolejce:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white border border-white/10 shadow shadow-black">
                  [
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400 font-medium">Następne w kolejce:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white border border-white/10 shadow shadow-black">
                  ]
                </kbd>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400 font-medium">Wyczyść flagi:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white border border-white/10 shadow shadow-black">
                  R
                </kbd>
              </div>

              <div className="flex justify-between py-1 col-span-2 mt-1">
                <span className="text-slate-400 font-medium">Wyjście ze stacji:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-white border border-white/10 shadow shadow-black">
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
