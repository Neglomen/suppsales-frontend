"use client";

import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useShippingConfig } from "../_hooks/use-shipping-config";
import { MarketplaceOrder } from "@/types/marketplace-order";
import { Shipment } from "@/types/shipment";
import { downloadFileFromBase64 } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Undo2,
  User,
  Building,
  Truck,
  Package,
  Calendar,
} from "lucide-react";

interface ReturnLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: MarketplaceOrder;
  onSuccess?: (createdShipments: Shipment[]) => void;
}

interface AddressFormState {
  name: string;
  company: string;
  street: string;
  postal_code: string;
  city: string;
  country_code: string;
  phone: string;
  email: string;
}

interface CustomPackageState {
  length_cm: string;
  width_cm: string;
  height_cm: string;
  weight_kg: string;
}

export function ReturnLabelDialog({
  isOpen,
  onClose,
  order,
  onSuccess,
}: ReturnLabelDialogProps) {
  const { data: config, isLoading: isConfigLoading } = useShippingConfig();

  // Selected courier integration
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [apaczkaServices, setApaczkaServices] = useState<any[]>([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>("");
  const [isFetchingApaczkaServices, setIsFetchingApaczkaServices] = useState(false);

  // Address states
  const [senderAddress, setSenderAddress] = useState<AddressFormState>({
    name: "",
    company: "",
    street: "",
    postal_code: "",
    city: "",
    country_code: "PL",
    phone: "",
    email: "",
  });

  const [receiverAddress, setReceiverAddress] = useState<AddressFormState>({
    name: "",
    company: "",
    street: "",
    postal_code: "",
    city: "",
    country_code: "PL",
    phone: "",
    email: "",
  });

  // Package states
  const [packageMode, setPackageMode] = useState<"predefined" | "custom">("predefined");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [customPackage, setCustomPackage] = useState<CustomPackageState>({
    length_cm: "20",
    width_cm: "15",
    height_cm: "10",
    weight_kg: "1.0",
  });
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Pickup / Dispatch call state (Wezwanie kuriera do klienta)
  const [pickupType, setPickupType] = useState<"COURIER" | "SELF">("COURIER");
  const [pickupDate, setPickupDate] = useState<string>("");
  const [pickupHoursFrom, setPickupHoursFrom] = useState<string>("09:00");
  const [pickupHoursTo, setPickupHoursTo] = useState<string>("17:00");

  // Fetch organization default sender address on dialog open
  useEffect(() => {
    if (!isOpen || !order) return;

    // Default pickup date to next business day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2); // Skip Sat -> Mon
    else if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // Skip Sun -> Mon
    setPickupDate(tomorrow.toISOString().split("T")[0]);

    // 1. Setup Customer Sender Address from order
    const del = order.delivery_address || (order.details_payload as any)?.delivery || {};
    const buyerName =
      del.first_name || del.lastName || del.firstName
        ? `${del.first_name || del.firstName || ""} ${del.last_name || del.lastName || ""}`.trim()
        : order.buyerFirstName || order.buyerLastName
        ? `${order.buyerFirstName || ""} ${order.buyerLastName || ""}`.trim()
        : order.buyerLogin || (order as any).buyer_login || "Klient";

    setSenderAddress({
      name: buyerName,
      company: del.company_name || del.companyName || del.company || "",
      street: del.street || "",
      postal_code: del.zip_code || del.zipCode || del.postalCode || "",
      city: del.city || "",
      country_code: del.country_code || del.countryCode || "PL",
      phone: del.phone_number || del.phoneNumber || del.phone || order.buyerPhoneNumber || (order as any).buyer_phone_number || "",
      email: order.buyerEmail || (order as any).buyer_email || del.email || "",
    });

    // 2. Setup Company Receiver Address from organization details
    api
      .get("/organization")
      .then((res) => {
        const org = res.data;
        if (org) {
          setReceiverAddress({
            name: org.default_sender_name || "Magazyn Zwrotów",
            company: org.default_sender_company || org.name || "Firma",
            street: org.default_sender_street || "",
            postal_code: org.default_sender_postal_code || "",
            city: org.default_sender_city || "",
            country_code: org.default_sender_country_code || "PL",
            phone: org.default_sender_phone || "",
            email: org.default_sender_email || "",
          });
        }
      })
      .catch(() => {
        // Fallback default company address
        setReceiverAddress({
          name: "Magazyn Zwrotów",
          company: "Firma",
          street: "",
          postal_code: "",
          city: "",
          country_code: "PL",
          phone: "",
          email: "",
        });
      });

    // 3. Set default reference number
    setReferenceNumber(`Zwrot-${order.external_order_id || order.id.slice(-6)}`);
  }, [isOpen, order]);

  // Set default courier selection on config load
  useEffect(() => {
    if (!isOpen || !config?.couriers || config.couriers.length === 0) return;

    // Filter available courier integrations
    const couriers = config.couriers;
    const mappedIntegrationId = order.service_integration?.id;

    // If order courier is non-Allegro, select it; otherwise pick first non-Allegro courier
    const mappedCourier = couriers.find((c) => c.id === mappedIntegrationId);
    if (mappedCourier && mappedCourier.provider_type !== "ALLEGRO") {
      setSelectedCourierId(mappedCourier.id);
    } else {
      const nonAllegro = couriers.find((c) => c.provider_type !== "ALLEGRO");
      if (nonAllegro) {
        setSelectedCourierId(nonAllegro.id);
      }
    }

    // Set default package ID
    const defaultPkg = config.packages.find((p) => p.is_default) || config.packages[0];
    if (defaultPkg) {
      setSelectedPackageId(defaultPkg.id);
    }
  }, [isOpen, config, order.service_integration?.id]);

  // Fetch Apaczka services when an Apaczka courier is selected
  useEffect(() => {
    if (!selectedCourierId || !config?.couriers) return;

    const chosen = config.couriers.find((c) => c.id === selectedCourierId);
    if (chosen?.provider_type === "APACZKA") {
      setIsFetchingApaczkaServices(true);
      api
        .get(`/service-integrations/${selectedCourierId}/apaczka/services`)
        .then((res) => {
          setApaczkaServices(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedServiceCode(res.data[0].id);
          }
        })
        .catch(() => setApaczkaServices([]))
        .finally(() => setIsFetchingApaczkaServices(false));
    } else {
      setApaczkaServices([]);
      setSelectedServiceCode("");
    }
  }, [selectedCourierId, config?.couriers]);

  const selectedCourierObj = useMemo(() => {
    return config?.couriers.find((c) => c.id === selectedCourierId);
  }, [config?.couriers, selectedCourierId]);

  // Submit return label generation
  const handleGenerateReturnLabel = async () => {
    if (!selectedCourierId) {
      toast.error("Wybierz kuriera dla przesyłki zwrotnej.");
      return;
    }

    if (selectedCourierObj?.provider_type === "ALLEGRO") {
      toast.error("Allegro WZA nie obsługuje bezpośredniego generowania etykiet zwrotnych.");
      return;
    }

    if (selectedCourierObj?.provider_type === "APACZKA" && !selectedServiceCode) {
      toast.error("Wybierz serwis kurierski Apaczki.");
      return;
    }

    // Package payload
    let packagePayload: any = {};
    if (packageMode === "predefined") {
      if (!selectedPackageId) {
        toast.error("Wybierz opakowanie z listy.");
        return;
      }
      packagePayload.package_definition_id = selectedPackageId;
    } else {
      const l = parseFloat(customPackage.length_cm.replace(",", "."));
      const w = parseFloat(customPackage.width_cm.replace(",", "."));
      const h = parseFloat(customPackage.height_cm.replace(",", "."));
      const kg = parseFloat(customPackage.weight_kg.replace(",", "."));

      if (isNaN(l) || isNaN(w) || isNaN(h) || isNaN(kg) || l <= 0 || w <= 0 || h <= 0 || kg <= 0) {
        toast.error("Wprowadź poprawne dodatnie wymiary i wagę paczki.");
        return;
      }

      packagePayload.custom_package = {
        length_cm: l,
        width_cm: w,
        height_cm: h,
        weight_kg: kg,
      };
    }

    setIsGenerating(true);

    const payload = {
      order_id: order.id,
      is_return: true,
      override_courier_integration_id: selectedCourierId,
      override_service_code: selectedServiceCode || undefined,
      packages: [packagePayload],
      reference_number: referenceNumber.trim() || undefined,
      sender_override: senderAddress,
      recipient_override: receiverAddress,
      pickup_override: {
        type: pickupType,
        date: pickupDate || undefined,
        hours_from: pickupHoursFrom,
        hours_to: pickupHoursTo,
      },
    };

    try {
      const res = await api.post<Shipment[]>("/shipping/generate-labels", payload);
      const createdShipments = res.data || [];

      toast.success(
        `Wygenerowano etykietę zwrotną (${createdShipments.length} szt.). Rozpoczynam pobieranie...`
      );

      // Download label
      for (const shipment of createdShipments) {
        try {
          const labelRes = await api.get(`/shipping/shipments/${shipment.id}/label`);
          const { label_data, label_format, tracking_number } = labelRes.data;
          const fileName = `etykieta-zwrot-${tracking_number || shipment.id}.${label_format.toLowerCase()}`;
          const mimeType = label_format === "PDF" ? "application/pdf" : "text/plain";
          downloadFileFromBase64(label_data, fileName, mimeType);
        } catch (err) {
          console.error("Nie udało się automatycznie pobrać pliku etykiety:", err);
        }
      }

      if (onSuccess) {
        onSuccess(createdShipments);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Błąd podczas generowania etykiety zwrotnej.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-blue-400">
            <Undo2 className="h-5 w-5" />
            Tworzenie Paczki Zwrotnej od Klienta
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Skonfiguruj adresy nadania (klient) i odbioru (firma), wybierz kuriera oraz wymiary paczki.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Wybór Kuriera */}
          <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-blue-400" />
                Wybór Kuriera
              </Label>
              {selectedCourierObj?.provider_type === "ALLEGRO" && (
                <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                  Allegro WZA zablokowane
                </Badge>
              )}
            </div>

            {isConfigLoading ? (
              <div className="flex items-center text-xs text-slate-400 py-2">
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-400" />
                Ładowanie integracji kurierskich...
              </div>
            ) : (
              <Select
                value={selectedCourierId?.toString() || ""}
                onValueChange={(val) => setSelectedCourierId(parseInt(val))}
              >
                <SelectTrigger className="h-10 bg-slate-900 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Wybierz kuriera..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {config?.couriers.map((courier) => {
                    const isAllegro = courier.provider_type === "ALLEGRO";
                    return (
                      <SelectItem
                        key={courier.id}
                        value={courier.id.toString()}
                        disabled={isAllegro}
                        className={isAllegro ? "opacity-40 cursor-not-allowed" : ""}
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">
                              {courier.provider_type}
                            </Badge>
                            <span>{courier.name}</span>
                          </span>
                          {isAllegro && (
                            <span className="text-[10px] text-rose-400 font-normal">
                              (brak obsługi zwrotów)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {/* Apaczka Service Selection */}
            {selectedCourierObj?.provider_type === "APACZKA" && (
              <div className="mt-2 space-y-1.5">
                <Label className="text-[11px] text-slate-400">Usługa Apaczki</Label>
                {isFetchingApaczkaServices ? (
                  <div className="flex items-center text-xs text-slate-400 py-1">
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Ładowanie serwisów Apaczki...
                  </div>
                ) : (
                  <Select
                    value={selectedServiceCode}
                    onValueChange={(val) => setSelectedServiceCode(val)}
                  >
                    <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-slate-200 text-xs">
                      <SelectValue placeholder="Wybierz serwis..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 max-h-56">
                      {apaczkaServices.map((srv) => (
                        <SelectItem key={srv.id} value={srv.id} className="text-xs">
                          {srv.courier_name ? `${srv.courier_name} - ${srv.name}` : srv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Opcja Wezwania Kuriera dla Apaczki / Podjazd z adresu klienta */}
            {selectedCourierObj?.provider_type === "APACZKA" && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  Wezwanie Kuriera do Klienta (Zlecenie Odbioru)
                </Label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPickupType("COURIER")}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all ${
                      pickupType === "COURIER"
                        ? "bg-blue-600/20 border-blue-500 text-blue-200"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Truck className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-slate-200">Wezwanie kuriera pod adres klienta</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Kurier odbiera paczkę od klienta z podanego adresu</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickupType("SELF")}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all ${
                      pickupType === "SELF"
                        ? "bg-blue-600/20 border-blue-500 text-blue-200"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Package className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-slate-200">Samodzielne nadanie w punkcie</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Klient sam dostarcza paczkę do punktu / oddziału</div>
                    </div>
                  </button>
                </div>

                {pickupType === "COURIER" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Data odbioru z adresu klienta</Label>
                      <Input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-400">Okno godzinowe odbioru</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="time"
                          value={pickupHoursFrom}
                          onChange={(e) => setPickupHoursFrom(e.target.value)}
                          className="h-8 text-xs bg-slate-900 border-slate-700 text-center text-slate-200"
                        />
                        <span className="text-slate-500 text-xs">-</span>
                        <Input
                          type="time"
                          value={pickupHoursTo}
                          onChange={(e) => setPickupHoursTo(e.target.value)}
                          className="h-8 text-xs bg-slate-900 border-slate-700 text-center text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Formularz Adresów: Zakładki Nadawca / Odbiorca */}
          <Tabs defaultValue="sender" className="w-full">
            <TabsList className="grid grid-cols-2 bg-slate-900 p-1 border border-slate-800 rounded-xl">
              <TabsTrigger
                value="sender"
                className="text-xs font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5" />
                Nadawca (Klient)
              </TabsTrigger>
              <TabsTrigger
                value="receiver"
                className="text-xs font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Building className="h-3.5 w-3.5" />
                Odbiorca (Firma / Magazyn)
              </TabsTrigger>
            </TabsList>

            {/* Adres Nadawcy (Klient) */}
            <TabsContent value="sender" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Imię i Nazwisko / Osoba kontaktowa</Label>
                  <Input
                    value={senderAddress.name}
                    onChange={(e) => setSenderAddress({ ...senderAddress, name: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Nazwa firmy (opcjonalnie)</Label>
                  <Input
                    value={senderAddress.company}
                    onChange={(e) => setSenderAddress({ ...senderAddress, company: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Ulica i numer</Label>
                <Input
                  value={senderAddress.street}
                  onChange={(e) => setSenderAddress({ ...senderAddress, street: e.target.value })}
                  className="h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Kod pocztowy</Label>
                  <Input
                    value={senderAddress.postal_code}
                    onChange={(e) => setSenderAddress({ ...senderAddress, postal_code: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-[11px] text-slate-400">Miasto</Label>
                  <Input
                    value={senderAddress.city}
                    onChange={(e) => setSenderAddress({ ...senderAddress, city: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Telefon</Label>
                  <Input
                    value={senderAddress.phone}
                    onChange={(e) => setSenderAddress({ ...senderAddress, phone: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Email</Label>
                  <Input
                    value={senderAddress.email}
                    onChange={(e) => setSenderAddress({ ...senderAddress, email: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Adres Odbiorcy (Firma) */}
            <TabsContent value="receiver" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Nazwa Odbiorcy / Magazynu</Label>
                  <Input
                    value={receiverAddress.name}
                    onChange={(e) => setReceiverAddress({ ...receiverAddress, name: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Firma</Label>
                  <Input
                    value={receiverAddress.company}
                    onChange={(e) => setReceiverAddress({ ...receiverAddress, company: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Ulica i numer</Label>
                <Input
                  value={receiverAddress.street}
                  onChange={(e) => setReceiverAddress({ ...receiverAddress, street: e.target.value })}
                  className="h-8 text-xs bg-slate-900 border-slate-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Kod pocztowy</Label>
                  <Input
                    value={receiverAddress.postal_code}
                    onChange={(e) => setReceiverAddress({ ...receiverAddress, postal_code: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-[11px] text-slate-400">Miasto</Label>
                  <Input
                    value={receiverAddress.city}
                    onChange={(e) => setReceiverAddress({ ...receiverAddress, city: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Telefon</Label>
                  <Input
                    value={receiverAddress.phone}
                    onChange={(e) => setReceiverAddress({ ...receiverAddress, phone: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Email</Label>
                  <Input
                    value={receiverAddress.email}
                    onChange={(e) => setReceiverAddress({ ...receiverAddress, email: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Konfiguracja Paczki */}
          <div className="space-y-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-emerald-400" />
              Opakowanie i Wymiary
            </Label>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="returnPkgMode"
                  checked={packageMode === "predefined"}
                  onChange={() => setPackageMode("predefined")}
                  className="accent-blue-500"
                />
                Opakowanie z listy
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="returnPkgMode"
                  checked={packageMode === "custom"}
                  onChange={() => setPackageMode("custom")}
                  className="accent-blue-500"
                />
                Wymiary niestandardowe
              </label>
            </div>

            {packageMode === "predefined" ? (
              <Select
                value={selectedPackageId}
                onValueChange={(val) => setSelectedPackageId(val)}
              >
                <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-slate-200 text-xs">
                  <SelectValue placeholder="Wybierz opakowanie..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {config?.packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id} className="text-xs">
                      {pkg.name} ({pkg.length_cm}x{pkg.width_cm}x{pkg.height_cm} cm, {pkg.weight_kg} kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Długość (cm)</Label>
                  <Input
                    value={customPackage.length_cm}
                    onChange={(e) => setCustomPackage({ ...customPackage, length_cm: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700 text-center"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Szerokość (cm)</Label>
                  <Input
                    value={customPackage.width_cm}
                    onChange={(e) => setCustomPackage({ ...customPackage, width_cm: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700 text-center"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Wysokość (cm)</Label>
                  <Input
                    value={customPackage.height_cm}
                    onChange={(e) => setCustomPackage({ ...customPackage, height_cm: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700 text-center"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Waga (kg)</Label>
                  <Input
                    value={customPackage.weight_kg}
                    onChange={(e) => setCustomPackage({ ...customPackage, weight_kg: e.target.value })}
                    className="h-8 text-xs bg-slate-900 border-slate-700 text-center"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1 pt-1">
              <Label className="text-[11px] text-slate-400">Numer referencyjny / Uwagi</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="h-8 text-xs bg-slate-900 border-slate-700"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isGenerating}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerateReturnLabel}
            disabled={isGenerating || !selectedCourierId || selectedCourierObj?.provider_type === "ALLEGRO"}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 px-4"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generowanie etykiety zwrotnej...
              </>
            ) : (
              <>
                <Undo2 className="h-3.5 w-3.5" />
                Wygeneruj etykietę zwrotną
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
