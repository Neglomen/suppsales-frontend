"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { useShippingConfig } from "../_hooks/use-shipping-config";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  PackageOpen,
  FileText,
  Loader2,
  AlertCircle,
  Info,
  MessageSquare,
  Package,
  PencilRuler,
  PlusCircle,
  X,
  DivideCircle,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { ChatPanel } from "../../orders/[id]/_components/chat-panel";
import { Thread } from "@/types/thread";
import { AdditionalServiceMapping } from "@/types/additional-service-mapping";
import { useOrderShipments } from "../_hooks/use-order-shipments";
import { ShipmentHistory } from "./ShipmentHistory";
import { SUUS_PACKAGE_CODES } from "@/lib/courier-data";
import * as z from "zod";
import {
  getAddressValidator,
  AddressSchema,
} from "@/lib/validators/address-validator";
import { EditAddressDialog } from "./EditAddressDialog";
import { OrderInfoCard } from "./OrderInfoCard";

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
}

interface OrderDetailsColumnProps {
  selectedOrderId: string | null;
  onShipmentCreated: (orderId: string) => void;
  onOrderUpdated: (updatedOrder: MarketplaceOrder) => void;
}

export function OrderDetailsColumn({
  selectedOrderId,
  onShipmentCreated,
  onOrderUpdated,
}: OrderDetailsColumnProps) {
  // ### NOWA LOGIKA: Komponent sam pobiera swoje dane ###
  const {
    data: order,
    isLoading: isOrderLoading,
    error: orderError,
  } = useQuery<MarketplaceOrder>({
    queryKey: ["orderDetails", selectedOrderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${selectedOrderId}`);
      return response.data;
    },
    enabled: !!selectedOrderId, // Uruchom zapytanie tylko, gdy mamy ID
  });

  const {
    data: config,
    isLoading: isConfigLoading,
    error: configError,
  } = useShippingConfig();

  const [validationResult, setValidationResult] = useState<
    | z.ZodSafeParseSuccess<AddressSchema>
    | z.ZodSafeParseError<AddressSchema>
    | null
  >(null);

  const [isEditAddressDialogOpen, setIsEditAddressDialogOpen] = useState(false);
  const [packages, setPackages] = useState<PackageState[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set()
  );

  const {
    data: shipments,
    isLoading: areShipmentsLoading,
    error: shipmentsError,
  } = useOrderShipments(order?.id);

  const { data: serviceMappings } = useQuery<AdditionalServiceMapping[]>({
    queryKey: ["additionalServiceMappings"],
    queryFn: async () => (await api.get("/additional-service-mappings")).data,
    enabled: !!order,
  });

  const cardData = useMemo(() => {
    if (!order) return null;

    const paymentInfo = {
      type:
        order.paymentType === "CASH_ON_DELIVERY"
          ? ("cod" as const)
          : order.paymentStatus === "COMPLETED"
          ? ("paid" as const)
          : order.paymentStatus === "PENDING"
          ? ("pending" as const)
          : ("unpaid" as const),
      label:
        order.paymentType === "CASH_ON_DELIVERY"
          ? "Pobranie"
          : order.paymentStatus === "COMPLETED"
          ? "Opłacone"
          : order.paymentStatus === "PENDING"
          ? "Oczekuje"
          : "Nieopłacone",
      amount: order.totalToPay,
      currency: order.detailsPayload?.summary?.totalToPay?.currency || "PLN",
    };

    const deliveryAddress = order.deliveryAddress;
    const pickupPoint = order.pickupPoint;

    const addressInfo = {
      isPickupPoint: !!pickupPoint,
      pickupPointName: pickupPoint?.name,
      recipientName: `${deliveryAddress?.firstName || ""} ${
        deliveryAddress?.lastName || ""
      }`.trim(),
      street: deliveryAddress?.street || pickupPoint?.address?.street,
      zipCode: deliveryAddress?.zipCode || pickupPoint?.address?.zipCode,
      city: deliveryAddress?.city || pickupPoint?.address?.city,
      phoneNumber: deliveryAddress?.phoneNumber,
    };

    let invoiceInfo = null;
    const invoiceAddress = order.invoiceAddress;
    if (invoiceAddress) {
      invoiceInfo = {
        invoiceName:
          invoiceAddress.companyName ||
          `${invoiceAddress.firstName || ""} ${
            invoiceAddress.lastName || ""
          }`.trim(),
        taxId: invoiceAddress.taxId,
        street: invoiceAddress.street,
        zipCode: invoiceAddress.zipCode,
        city: invoiceAddress.city,
      };
    }

    const lineItems = order.lineItems || [];
    const message =
      order.detailsPayload?.messageToSeller?.text ||
      order.detailsPayload?.user_comments;

    return { paymentInfo, addressInfo, invoiceInfo, lineItems, message };
  }, [order]);

  const paymentStatus = useMemo(() => {
    if (!order) return { isReadyForShipment: false, warning: null };
    const isPaid = order.paymentStatus === "COMPLETED";
    const isCashOnDelivery = order.paymentType === "CASH_ON_DELIVERY";
    if (isPaid || isCashOnDelivery) {
      return { isReadyForShipment: true, warning: null };
    }
    if (order.paymentStatus === "PENDING" && !isCashOnDelivery) {
      return {
        isReadyForShipment: false,
        warning: "Zamówienie oczekuje na opłacenie przez klienta.",
      };
    }
    return {
      isReadyForShipment: false,
      warning: "Zamówienie nie jest opłacone. Nie można wygenerować etykiety.",
    };
  }, [order]);

  const isCodOrder = useMemo(
    () => order?.paymentType === "CASH_ON_DELIVERY",
    [order]
  );

  const totalCodAmount = useMemo(() => {
    if (!isCodOrder || !order) return 0;
    return order.totalToPay ?? 0;
  }, [order, isCodOrder]);

  const { mappedCourier, mappedPackageId, mappingWarning } = useMemo(() => {
    if (!order || !config)
      return {
        mappedCourier: null,
        mappedPackageId: undefined,
        mappingWarning: null,
      };
    const deliveryMethodName =
      order.detailsPayload?.delivery?.method?.name ||
      order.detailsPayload?.delivery_method;
    if (!deliveryMethodName)
      return { warning: "W zamówieniu brakuje nazwy metody dostawy." };
    const mapping = config.mappings.find(
      (m) =>
        m.marketplace_delivery_method === deliveryMethodName &&
        m.source_integration?.id === order.serviceIntegration?.id
    );
    if (!mapping)
      return {
        mappingWarning: `Brak mapowania dla metody: "${deliveryMethodName}".`,
      };
    if (!mapping.serviceIntegration_id || !mapping.courier_service_code)
      return {
        mappingWarning: `Mapowanie dla "${deliveryMethodName}" jest niekompletne.`,
      };
    const courier = config.couriers.find(
      (c) => c.id === mapping.serviceIntegration_id
    );
    const defaultPackage = config.packages.find((p) => p.is_default);
    return {
      mappedCourier: courier,
      mappedPackageId:
        mapping.default_package_definition_id || defaultPackage?.id,
      mappingWarning: null,
    };
  }, [order, config]);

  const addressToValidate = useMemo((): AddressSchema | null => {
    if (!cardData || !order) return null;
    return {
      name: cardData.addressInfo.recipientName ?? "",
      street: cardData.addressInfo.street ?? "",
      postalCode: cardData.addressInfo.zipCode ?? "",
      city: cardData.addressInfo.city ?? "",
      phone: order.deliveryAddress?.phoneNumber || order.buyerPhoneNumber || "",
      email: order.buyerEmail || "",
    };
  }, [cardData, order]);

  useEffect(() => {
    if (
      !order ||
      !addressToValidate ||
      !mappedCourier ||
      cardData?.addressInfo.isPickupPoint
    ) {
      setValidationResult(null);
      return;
    }
    const validator = getAddressValidator(mappedCourier.provider_type);
    const result = validator.safeParse(addressToValidate);
    setValidationResult(result);
  }, [order, addressToValidate, mappedCourier, cardData]);

  useEffect(() => {
    if (order && mappedPackageId !== undefined) {
      const isCod = order.paymentType === "CASH_ON_DELIVERY";
      const codAmount = isCod ? (order.totalToPay ?? 0).toFixed(2) : "";

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
          codAmount: codAmount,
          courier_code: "COL",
        },
      ]);
      setReferenceNumber(order.externalOrderId || order.buyerLogin || "");
    } else {
      setPackages([]);
      setReferenceNumber("");
    }
  }, [order, mappedPackageId]);

  useEffect(() => {
    if (order?.buyerLogin && order.serviceIntegration) {
      api
        .get<Thread[]>("/threads/by-buyer-login", {
          params: {
            buyerLogin: order.buyerLogin,
            integration_id: order.serviceIntegration.id,
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
      const lineItems = order.detailsPayload?.lineItems || [];
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

  const handleAddressUpdateSuccess = (updatedOrder: MarketplaceOrder) => {
    onOrderUpdated(updatedOrder);
  };

  const handlePackageChange = (
    index: number,
    field: keyof PackageState,
    value: any
  ) =>
    setPackages((pkgs) =>
      pkgs.map((pkg, i) => (i === index ? { ...pkg, [field]: value } : pkg))
    );
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
  const handleCodAmountChange = (index: number, value: string) =>
    setPackages((pkgs) =>
      pkgs.map((pkg, i) => (i === index ? { ...pkg, codAmount: value } : pkg))
    );
  const splitCodForPackages = (currentPackages: PackageState[]) => {
    if (!isCodOrder || currentPackages.length === 0) return;
    const totalCents = Math.round(totalCodAmount * 100);
    const baseCents = Math.floor(totalCents / currentPackages.length);
    let remainderCents = totalCents % currentPackages.length;
    const updatedPackages = currentPackages.map((pkg) => {
      let packageCents = baseCents;
      if (remainderCents > 0) {
        packageCents += 1;
        remainderCents--;
      }
      return { ...pkg, codAmount: (packageCents / 100).toFixed(2) };
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
    };
    const newPackages = [...packages, newPackage];
    setPackages(newPackages);
    if (isCodOrder) splitCodForPackages(newPackages);
  };
  const removePackage = (id: string) => {
    const newPackages = packages.filter((p) => p.id !== id);
    setPackages(newPackages);
    if (isCodOrder && newPackages.length > 0) splitCodForPackages(newPackages);
  };
  const handleSplitCodClick = () => {
    splitCodForPackages(packages);
    toast.success("Kwota pobrania została podzielona.");
  };
  const handleServiceToggle = (serviceCode: string) =>
    setSelectedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceCode)) newSet.delete(serviceCode);
      else newSet.add(serviceCode);
      return newSet;
    });
  const handleGenerateLabels = async () => {
    /* ... */
  };

  // ### NOWA OBSŁUGA STANÓW ###
  if (!selectedOrderId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/20">
        <PackageOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Wybierz zamówienie</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Wybierz zamówienie z listy po prawej, aby przygotować przesyłkę.
        </p>
      </div>
    );
  }

  if (isOrderLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Wczytywanie szczegółów...</p>
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">
          Błąd ładowania zamówienia
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nie udało się pobrać szczegółów tego zamówienia.
        </p>
      </div>
    );
  }

  if (!order) {
    // Sytuacja awaryjna, nie powinna wystąpić jeśli `isOrderLoading` jest false
    return null;
  }

  const isGenerateButtonDisabled =
    isGenerating ||
    !!mappingWarning ||
    !paymentStatus.isReadyForShipment ||
    (validationResult && !validationResult.success) ||
    packages.length === 0 ||
    packages.some(
      (p) =>
        (p.mode === "predefined" && !p.selectedPackageId) ||
        (p.mode === "custom" &&
          (Object.values(p.customPackage).some((v) => v === "") ||
            !p.courier_code)) ||
        (isCodOrder && (p.codAmount === "" || isNaN(parseFloat(p.codAmount))))
    );

  return (
    <>
      <EditAddressDialog
        isOpen={isEditAddressDialogOpen}
        onClose={() => setIsEditAddressDialogOpen(false)}
        onSuccess={handleAddressUpdateSuccess}
        order={order}
        courierProvider={mappedCourier?.provider_type}
      />

      <div className="p-4 space-y-4 h-full overflow-y-auto">
        {cardData && (
          <OrderInfoCard
            orderExternalId={order.externalOrderId}
            buyerLogin={order.buyerLogin}
            paymentInfo={cardData.paymentInfo}
            addressInfo={cardData.addressInfo}
            invoiceInfo={cardData.invoiceInfo}
            lineItems={cardData.lineItems}
            message={cardData.message}
            onEditAddress={() => setIsEditAddressDialogOpen(true)}
          />
        )}

        {paymentStatus.warning && (
          <Alert variant="warning">
            <CreditCard className="h-4 w-4" />
            <AlertTitle>Problem z płatnością</AlertTitle>
            <AlertDescription>{paymentStatus.warning}</AlertDescription>
          </Alert>
        )}

        {validationResult && !validationResult.success && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Adres dostawy wymaga uwagi</AlertTitle>
            <AlertDescription className="mt-2">
              <ul className="list-disc list-inside space-y-1">
                {validationResult.error.issues.map((issue) => (
                  <li key={issue.path.join("-") + issue.code}>
                    {issue.message}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                Użyj ikony edycji powyżej, aby poprawić dane.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {order && (
          <ShipmentHistory
            shipments={shipments || []}
            isLoading={areShipmentsLoading}
            error={shipmentsError}
          />
        )}

        <Accordion
          type="single"
          collapsible
          className="w-full"
          defaultValue={totalMessages > 0 ? "chat-history" : undefined}
        >
          <AccordionItem value="chat-history">
            <AccordionTrigger className="text-base font-semibold px-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>Historia Rozmowy</span>
                {totalMessages > 0 && <Badge>{totalMessages}</Badge>}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="border-t h-[600px] overflow-y-auto">
                {order.buyerLogin && order.serviceIntegration ? (
                  <ChatPanel
                    buyerLogin={order.buyerLogin}
                    integrationId={order.serviceIntegration.id}
                    currentOrderId={order.id}
                    myLogin={order.serviceIntegration.external_user_id}
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
        <Card>
          <CardHeader>
            <CardTitle>Przygotuj Przesyłkę</CardTitle>
            <CardDescription>
              Skonfiguruj paczki i wygeneruj etykiety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isConfigLoading && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ładowanie
                konfiguracji...
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
                className="p-4 border rounded-lg space-y-4 relative"
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold">Paczka #{index + 1}</p>
                  {packages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 absolute top-1 right-1"
                      onClick={() => removePackage(pkg.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <RadioGroup
                  value={pkg.mode}
                  onValueChange={(value) =>
                    handlePackageChange(index, "mode", value as any)
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem
                      value="predefined"
                      id={`predefined-${pkg.id}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`predefined-${pkg.id}`}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Package className="mb-3 h-6 w-6" /> Predefiniowane
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="custom"
                      id={`custom-${pkg.id}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`custom-${pkg.id}`}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <PencilRuler className="mb-3 h-6 w-6" /> Niestandardowe
                    </Label>
                  </div>
                </RadioGroup>
                {pkg.mode === "predefined" ? (
                  <div>
                    <Label className="text-sm font-medium">Opakowanie</Label>
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
                            {p.name} ({p.length_cm}x{p.width_cm}x{p.height_cm}
                            cm, {p.weight_kg}kg)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`length_cm-${pkg.id}`}>
                          Długość (cm)
                        </Label>
                        <Input
                          id={`length_cm-${pkg.id}`}
                          name="length_cm"
                          value={pkg.customPackage.length_cm}
                          onChange={(e) =>
                            handleCustomDimensionChange(index, e)
                          }
                          placeholder="np. 30"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`width_cm-${pkg.id}`}>
                          Szerokość (cm)
                        </Label>
                        <Input
                          id={`width_cm-${pkg.id}`}
                          name="width_cm"
                          value={pkg.customPackage.width_cm}
                          onChange={(e) =>
                            handleCustomDimensionChange(index, e)
                          }
                          placeholder="np. 20"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`height_cm-${pkg.id}`}>
                          Wysokość (cm)
                        </Label>
                        <Input
                          id={`height_cm-${pkg.id}`}
                          name="height_cm"
                          value={pkg.customPackage.height_cm}
                          onChange={(e) =>
                            handleCustomDimensionChange(index, e)
                          }
                          placeholder="np. 10"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`weight_kg-${pkg.id}`}>Waga (kg)</Label>
                        <Input
                          id={`weight_kg-${pkg.id}`}
                          name="weight_kg"
                          value={pkg.customPackage.weight_kg}
                          onChange={(e) =>
                            handleCustomDimensionChange(index, e)
                          }
                          placeholder="np. 1.5"
                        />
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
                  <DivideCircle className="mr-2 h-4 w-4" /> Podziel pobranie
                  równo
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
    </>
  );
}
