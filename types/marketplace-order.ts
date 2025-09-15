// src/types/marketplace-order.ts
import { ServiceIntegration } from "./service-integration";

// Definicja typów adresów, aby uniknąć `any`
interface Address {
  firstName?: string;
  lastName?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  companyName?: string;
  countryCode?: string;
  phoneNumber?: string;
  taxId?: string;
}

interface PickupPoint {
  id?: string;
  name?: string;
  address?: Address;
}

interface LineItem {
  id: string;
  quantity: number;
  price: {
    amount: string;
    currency: string;
  };
  offer: {
    id: string | null;
    name: string;
  };
}

export interface MarketplaceOrder {
  id: string;
  externalOrderId: string;
  status: string;
  buyerLogin: string | null;
  buyerEmail: string | null;
  buyerFirstName: string | null;
  buyerLastName: string | null;
  buyerPhoneNumber: string | null;
  purchasedAt: string;
  serviceIntegration: ServiceIntegration | null;
  trackingNumbers: string[] | null;
  detailsPayload: any;

  fulfillmentStatus: string | null;
  paymentType: "CASH_ON_DELIVERY" | "ONLINE" | string | null;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | string | null;
  totalToPay: number | null;
  lineItems: LineItem[];

  deliveryAddress: Address | null;
  pickupPoint: PickupPoint | null;
  invoiceAddress: Address | null;

  hasPurchaseOrder?: boolean;
}
