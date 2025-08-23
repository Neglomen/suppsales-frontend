// src/app/(dashboard)/orders/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Loader2,
  Package,
  User,
  Clock,
  Home,
  Banknote,
  FileText,
  Info,
  Mail,
  MessageSquare,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "./_components/chat-panel";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";
import { SendEmailDialog } from "../../../../components/shared/send-email-dialog";
import { Button } from "@/components/ui/button";
import { OrderDetailsApiResponse, MappedOrderDetails } from "@/types/order";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunicationHistoryTimeline } from "./_components/communication-history-timeline";

// --- Definicje Typów ---
interface Address {
  firstName?: string;
  lastName?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  companyName?: string;
  phoneNumber?: string;
  taxId?: string;
}

// --- Mapper Danych (Finalna, Poprawiona Wersja) ---
const mapOrderPayloadToDetails = (
  order: OrderDetailsApiResponse
): MappedOrderDetails => {
  const payload = order.details_payload;

  if (order.integration?.type === "BASELINKER") {
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
        type:
          payload.payment_method_cod === "1" ? "CASH_ON_DELIVERY" : "ONLINE",
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
      })),
    };
  }

  // Domyślny mapper dla Allegro i zamówień ręcznych
  return {
    delivery: {
      methodName: payload.delivery?.method?.name || "Brak informacji",
      isPickupPoint: !!payload.delivery?.pickupPoint,
      pickupPointName: payload.delivery?.pickupPoint?.name,
      address: payload.delivery?.address,
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
      address: payload.invoice?.address,
    },
    line_items: (payload.lineItems || []).map((item: any) => ({
      id: item.id,
      name: item.offer.name,
      quantity: item.quantity,
      price: `${item.price.amount} ${item.price.currency}`,
    })),
  };
};

// --- Komponenty Podrzędne (bez zmian w definicji, ale poprawimy ich wywołania) ---
const IntegrationCard = ({
  integration,
}: {
  integration: OrderDetailsApiResponse["integration"];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Info size={20} /> Źródło Zamówienia
      </CardTitle>
    </CardHeader>
    <CardContent className="flex items-center gap-3">
      {!integration && <Package className="h-8 w-8 text-muted-foreground" />}
      {integration?.type === "ALLEGRO" && <AllegroIcon className="h-8 w-8" />}
      {integration?.type === "BASELINKER" && (
        <BaseLinkerIcon className="h-8 w-8 rounded" />
      )}
      <div>
        <p className="font-semibold">
          {integration?.name || "Zamówienie Ręczne"}
        </p>
        <p className="text-sm text-muted-foreground">
          {integration?.external_user_id}
        </p>
      </div>
    </CardContent>
  </Card>
);

const DeliveryCard = ({
  details,
}: {
  details: MappedOrderDetails["delivery"];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Home size={20} /> Dostawa
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm space-y-1">
      {details.isPickupPoint ? (
        <>
          <p className="font-semibold text-primary">
            {details.pickupPointName}
          </p>
          <p>{details.address?.street}</p>
          <p>
            {details.address?.zipCode} {details.address?.city}
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold">
            {details.address?.companyName ||
              `${details.address?.firstName} ${details.address?.lastName}`.trim()}
          </p>
          <p>{details.address?.street}</p>
          <p>
            {details.address?.zipCode} {details.address?.city}
          </p>
          <p>{details.address?.phoneNumber}</p>
        </>
      )}
      <p className="pt-2 text-muted-foreground">Metoda: {details.methodName}</p>
    </CardContent>
  </Card>
);

const PaymentCard = ({
  details,
}: {
  details: MappedOrderDetails["payment"];
}) => {
  const paymentStatusMap = {
    COMPLETED: { text: "Opłacone", variant: "default" as const },
    CANCELED: { text: "Anulowane", variant: "destructive" as const },
    PENDING: { text: "Oczekuje", variant: "secondary" as const },
    default: { text: details.status, variant: "secondary" as const },
  };
  const statusInfo =
    paymentStatusMap[details.status as keyof typeof paymentStatusMap] ||
    paymentStatusMap.default;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote size={20} /> Płatność
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Typ:</span>
          <span className="font-medium">
            {details.type === "CASH_ON_DELIVERY" ? "Za pobraniem" : "Online"}
          </span>
        </div>
        {details.provider && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Operator:</span>
            <span className="font-medium">{details.provider}</span>
          </div>
        )}
        <div className="flex justify-between font-bold pt-2 border-t">
          <span>Suma:</span>
          <span>{details.total}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const InvoiceCard = ({
  details,
}: {
  details: MappedOrderDetails["invoice"];
}) => {
  if (!details.required) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} /> Dane do Faktury
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Klient nie poprosił o fakturę.
          </p>
        </CardContent>
      </Card>
    );
  }
  const { address } = details;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={20} /> Dane do Faktury
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <p className="font-semibold">
          {address?.companyName ||
            `${address?.firstName} ${address?.lastName}`.trim()}
        </p>
        {address?.taxId && <p>NIP: {address.taxId}</p>}
        <p className="pt-2">{address?.street}</p>
        <p>
          {address?.zipCode} {address?.city}
        </p>
      </CardContent>
    </Card>
  );
};

// --- Główny Komponent Strony ---
function OrderDetailsContent() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [order, setOrder] = useState<OrderDetailsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendTemplateOpen, setSendTemplateOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchOrderDetails = async () => {
        setIsLoading(true);
        try {
          const response = await api.get<OrderDetailsApiResponse>(
            `/orders/${id}`
          );
          setOrder(response.data);
        } catch (error) {
          toast.error("Nie udało się pobrać szczegółów zamówienia.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrderDetails();
    }
  }, [id]);

  const mappedDetails = useMemo(() => {
    if (!order) return null;
    return mapOrderPayloadToDetails(order);
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (!order || !mappedDetails) {
    return (
      <div className="text-center">
        Nie znaleziono zamówienia lub wystąpił błąd mapowania danych.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Szczegóły Zamówienia</h1>
          <p className="text-muted-foreground">
            ID Systemowe: {order.id} / ID Zewnętrzne: {order.external_order_id}
          </p>
        </div>
        {/* === NOWY PRZYCISK === */}
        <Button onClick={() => setSendTemplateOpen(true)}>
          <Mail className="mr-2 h-4 w-4" />
          Wyślij e-mail z szablonu
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <IntegrationCard integration={order.integration} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={20} /> Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default">{order.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} /> Kupujący
            </CardTitle>
          </CardHeader>
          <CardContent className="font-medium">
            {order.buyer_login || "Brak"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} /> Data Zakupu
            </CardTitle>
          </CardHeader>
          <CardContent className="font-medium">
            {new Date(order.purchased_at).toLocaleString("pl-PL")}
          </CardContent>
        </Card>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DeliveryCard details={mappedDetails.delivery} />
          <InvoiceCard details={mappedDetails.invoice} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <PaymentCard details={mappedDetails.payment} />
          <Card>
            <CardHeader>
              <CardTitle>Produkty</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                {mappedDetails.line_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between items-start gap-4 border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="flex-1">
                      {item.name}{" "}
                      <span className="text-muted-foreground">
                        x {item.quantity}
                      </span>
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {item.price}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      {order.event_logs && order.event_logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historia Zdarzeń</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Kontener dla osi czasu */}
            <div className="relative pl-6">
              {/* Linia osi czasu, która łączy kropki */}
              <div className="absolute left-[23px] top-2 h-full w-0.5 bg-muted -translate-x-1/2"></div>

              {/* Sortujemy logi od najnowszego do najstarszego */}
              {order.event_logs
                .sort(
                  (a, b) =>
                    new Date(b.occurred_at).getTime() -
                    new Date(a.occurred_at).getTime()
                )
                .map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 mb-8 last:mb-0"
                  >
                    {/* Kropka na osi czasu */}
                    <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Clock size={14} />
                    </div>
                    {/* Treść logu */}
                    <div className="flex-1">
                      <p className="font-semibold">{log.summary}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.occurred_at).toLocaleString("pl-PL", {
                          dateStyle: "long",
                          timeStyle: "medium",
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground pt-1">
                        Źródło: {log.source} | Typ: {log.type}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">
            <MessageSquare className="mr-2 h-4 w-4" /> Wiadomości z Marketplace
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" /> Historia Wysłanych E-maili
          </TabsTrigger>
        </TabsList>
        <TabsContent value="messages">
          <Card>
            <CardContent className="p-0 h-[600px] overflow-y-auto">
              {/* === ZMIANA TUTAJ === */}
              {/* Sprawdzamy, czy mamy potrzebne dane i przekazujemy je do ChatPanel */}
              {order.buyer_login && order.integration ? (
                <ChatPanel
                  buyerLogin={order.buyer_login}
                  integrationId={order.integration.id}
                  currentOrderId={order.id}
                  myLogin={order.integration.external_user_id}
                />
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  Wiadomości są dostępne tylko dla zamówień z integracji.
                </div>
              )}
              {/* === KONIEC ZMIANY === */}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <CommunicationHistoryTimeline orderId={order.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SendEmailDialog
        isOpen={isSendTemplateOpen}
        setIsOpen={setSendTemplateOpen}
        order={order}
      />
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <OrderDetailsContent />
    </Suspense>
  );
}
