// src/app/(dashboard)/shipping/_components/OrderInfoCard.tsx

"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  CheckCircle,
  StickyNote,
  Home,
  Edit,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceOrder } from "@/types/marketplace-order";

// Typy dla propsów, które będzie przyjmował komponent
interface PaymentInfo {
  type: "cod" | "paid" | "pending" | "unpaid";
  label: string;
  amount?: number | null;
  currency?: string;
}

// ### START ZMIAN ###
interface AddressInfoData {
  recipientName: string;
  street?: string; // Zmienione z string na string | undefined
  zipCode?: string; // Zmienione z string na string | undefined
  city?: string; // Zmienione z string na string | undefined
  isPickupPoint: boolean;
  pickupPointName?: string;
}

interface InvoiceInfoData {
  invoiceName: string;
  taxId?: string | null;
  street?: string; // Zmienione z string na string | undefined
  zipCode?: string; // Zmienione z string na string | undefined
  city?: string; // Zmienione z string na string | undefined
}
// ### KONIEC ZMIAN ###

interface OrderInfoCardProps {
  orderExternalId: string;
  buyerLogin: string | null;
  paymentInfo: PaymentInfo;
  addressInfo: AddressInfoData;
  invoiceInfo?: InvoiceInfoData | null;
  lineItems: MarketplaceOrder["lineItems"];
  message?: string | null;
  onEditAddress: () => void;
}

export function OrderInfoCard({
  orderExternalId,
  buyerLogin,
  paymentInfo,
  addressInfo,
  invoiceInfo,
  lineItems,
  message,
  onEditAddress,
}: OrderInfoCardProps) {
  // ... (reszta komponentu bez zmian) ...
  const paymentBadgeVariant = useMemo(() => {
    switch (paymentInfo.type) {
      case "cod":
        return "warning";
      case "paid":
        return "success";
      default:
        return "secondary";
    }
  }, [paymentInfo.type]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Zamówienie #{orderExternalId}</CardTitle>
            <CardDescription>{buyerLogin}</CardDescription>
          </div>
          <Badge variant={paymentBadgeVariant}>
            {paymentInfo.type === "cod" && (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {paymentInfo.type === "paid" && (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {paymentInfo.label}: {paymentInfo.amount} {paymentInfo.currency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 font-medium mb-1">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span>Adres Dostawy</span>
            </div>
            {!addressInfo.isPickupPoint && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onEditAddress}
              >
                <Edit className="h-4 w-4 text-primary" />
                <span className="sr-only">Edytuj adres</span>
              </Button>
            )}
          </div>
          <div className="pl-6 text-muted-foreground">
            {addressInfo.isPickupPoint ? (
              <>
                <p className="font-semibold text-foreground">
                  {addressInfo.pickupPointName}
                </p>
                <p>{addressInfo.street}</p>
                <p>
                  {addressInfo.zipCode} {addressInfo.city}
                </p>
                <Badge variant="outline" className="mt-2">
                  Odbiór w punkcie
                </Badge>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">
                  {addressInfo.recipientName}
                </p>
                <p>{addressInfo.street}</p>
                <p>
                  {addressInfo.zipCode} {addressInfo.city}
                </p>
              </>
            )}
          </div>
        </div>

        {lineItems.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="font-medium mb-2">Produkty</p>
              <ul className="text-muted-foreground space-y-1">
                {lineItems.map((item, index) => (
                  <li key={item.id || index} className="flex justify-between">
                    <span>{item.offer?.name}</span>
                    <span className="font-semibold text-foreground whitespace-nowrap pl-2">
                      x{item.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
        {invoiceInfo && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Dane do Faktury</span>
              </div>
              <div className="pl-6 text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {invoiceInfo.invoiceName}
                </p>
                {invoiceInfo.taxId && <p>NIP: {invoiceInfo.taxId}</p>}
                <p>{invoiceInfo.street}</p>
                <p>
                  {invoiceInfo.zipCode} {invoiceInfo.city}
                </p>
              </div>
            </div>
          </>
        )}
        {message && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <span>Wiadomość od kupującego</span>
              </div>
              <div className="pl-6 border-l-2 ml-2 pl-4 italic">{message}</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
