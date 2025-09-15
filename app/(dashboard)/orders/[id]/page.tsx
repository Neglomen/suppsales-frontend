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
import { cn } from "@/lib/utils";

// --- Definicje Typów (już niepotrzebne, bo są w /types/order) ---

// --- Mapper Danych ---
const mapOrderPayloadToDetails = (
  order: OrderDetailsApiResponse
): MappedOrderDetails => {
  const payload = order.detailsPayload;

  // POPRAWKA: Używamy 'serviceIntegration.provider_type'
  if (order.serviceIntegration?.provider_type === "BASELINKER") {
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
          street: payload.deliveryAddress,
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
          street: payload.invoiceAddress,
          zipCode: payload.invoice_postcode,
          city: payload.invoice_city,
          countryCode: payload.invoice_country_code,
        },
      },
      lineItems: (payload.products || []).map((product: any) => ({
        id: product.order_product_id,
        name: product.name,
        quantity: product.quantity,
        price: `${product.price_brutto} ${payload.currency}`,
      })),
    };
  }

  // Domyślny mapper (Allegro, zamówienia ręczne)
  return {
    delivery: {
      methodName: payload.delivery?.method?.name || "Brak informacji",
      isPickupPoint: !!payload.delivery?.pickupPoint,
      pickupPointName: payload.delivery?.pickupPoint?.name,
      address: payload.delivery?.address,
    },
    payment: {
      type: order.paymentType,
      provider: payload.payment?.provider,
      status: order.paymentStatus,
      total: `${payload.summary?.totalToPay?.amount || "0.00"} ${
        payload.summary?.totalToPay?.currency || "PLN"
      }`,
    },
    invoice: {
      required: !!payload.invoice?.required,
      address: payload.invoice?.address,
    },
    lineItems: (payload.lineItems || []).map((item: any) => ({
      id: item.id,
      name: item.offer.name,
      quantity: item.quantity,
      price: `${item.price.amount} ${item.price.currency}`,
    })),
  };
};

// --- Komponenty Podrzędne ---
const IntegrationCard = ({
  integration,
}: {
  // POPRAWKA: Używamy 'serviceIntegration'
  integration: OrderDetailsApiResponse["serviceIntegration"];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Info size={20} /> Źródło Zamówienia
      </CardTitle>
    </CardHeader>
    <CardContent className="flex items-center gap-3">
      {!integration && <Package className="h-8 w-8 text-muted-foreground" />}
      {integration?.provider_type === "ALLEGRO" && (
        <AllegroIcon className="h-8 w-8" />
      )}
      {integration?.provider_type === "BASELINKER" && (
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
              `${details.address?.firstName || ""} ${
                details.address?.lastName || ""
              }`.trim()}
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
  const isPaid = details.status === "COMPLETED";
  const isCashOnDelivery = details.type === "CASH_ON_DELIVERY";
  const isPaymentPending = details.status === "PENDING" && !isCashOnDelivery;
  const isUnpaid = !isPaid && !isCashOnDelivery && !isPaymentPending;

  let statusText = "Nieznany";
  let statusVariant:
    | "default"
    | "secondary"
    | "destructive"
    | "warning"
    | "success" = "secondary";

  if (isPaid) {
    statusText = "Opłacone";
    statusVariant = "success";
  } else if (isCashOnDelivery) {
    statusText = "Pobranie";
    statusVariant = "warning";
  } else if (isPaymentPending) {
    statusText = "Płatność rozpoczęta";
    statusVariant = "secondary";
  } else if (isUnpaid) {
    statusText = "Nieopłacone";
    statusVariant = "destructive";
  }

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
          <Badge variant={statusVariant}>{statusText}</Badge>
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
            `${address?.firstName || ""} ${address?.lastName || ""}`.trim()}
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
      <div className="text-center p-8">
        Nie znaleziono zamówienia lub wystąpił błąd.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Szczegóły Zamówienia</h1>
          <p className="text-muted-foreground">
            ID Systemowe: {order.id} / ID Zewnętrzne: {order.externalOrderId}
          </p>
        </div>
        <Button onClick={() => setSendTemplateOpen(true)}>
          <Mail className="mr-2 h-4 w-4" />
          Wyślij e-mail
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* POPRAWKA: Przekazujemy 'serviceIntegration' */}
        <IntegrationCard integration={order.serviceIntegration} />
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
            {order.buyerLogin || "Brak"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} /> Data Zakupu
            </CardTitle>
          </CardHeader>
          <CardContent className="font-medium">
            {new Date(order.purchasedAt).toLocaleString("pl-PL")}
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
                {mappedDetails.lineItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between items-start gap-4 border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="flex-1">
                      {item.name}
                      <span className="text-muted-foreground">
                        {" "}
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
            <div className="relative pl-6">
              <div className="absolute left-[23px] top-2 h-full w-0.5 bg-muted -translate-x-1/2"></div>
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
                    <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Clock size={14} />
                    </div>
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
              {/* POPRAWKA: Używamy 'serviceIntegration' */}
              {order.buyerLogin && order.serviceIntegration ? (
                <ChatPanel
                  buyerLogin={order.buyerLogin}
                  integrationId={order.serviceIntegration.id}
                  currentOrderId={order.id}
                  myLogin={order.serviceIntegration.external_user_id}
                />
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  Wiadomości są dostępne tylko dla zamówień z integracji.
                </div>
              )}
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
