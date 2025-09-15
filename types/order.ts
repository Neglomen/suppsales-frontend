// src/types/order.ts
import { ServiceIntegration } from "./service-integration";

interface OrderEventLog {
  id: string;
  source: string;
  type: string;
  summary: string;
  occurred_at: string;
}

export interface OrderDetailsApiResponse {
  id: string;
  externalOrderId: string;
  status: string;
  buyerLogin: string | null;
  buyerEmail: string | null;
  purchasedAt: string;
  serviceIntegration: ServiceIntegration | null;
  trackingNumbers: string[] | null;
  detailsPayload: any;
  event_logs: OrderEventLog[];

  // === POPRAWKA: Dodajemy oba pola zwracane przez API ===
  paymentType: "CASH_ON_DELIVERY" | "ONLINE" | null;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | null;
}

export interface MappedOrderDetails {
  delivery: {
    methodName: string;
    isPickupPoint: boolean;
    pickupPointName?: string;
    address?: {
      firstName?: string;
      lastName?: string;
      street?: string;
      zipCode?: string;
      city?: string;
      countryCode?: string;
      companyName?: string;
      phoneNumber?: string;
    };
  };
  payment: {
    type: "CASH_ON_DELIVERY" | "ONLINE" | null;
    provider?: string;
    status: "PENDING" | "COMPLETED" | "FAILED" | null;
    total: string;
  };
  invoice: {
    required: boolean;
    address?: {
      firstName?: string;
      lastName?: string;
      companyName?: string;
      taxId?: string;
      street?: string;
      zipCode?: string;
      city?: string;
      countryCode?: string;
    };
  };
  lineItems: {
    id: string;
    name: string;
    quantity: number;
    price: string;
  }[];
}

export type PaymentStatus =
  | "COMPLETED"
  | "PENDING"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN";
