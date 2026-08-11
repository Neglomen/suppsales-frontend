import { MarketplaceOrder } from "./marketplace-order";
import { ErpSyncStatus } from "./invoice";

// Odpowiednik schematu EventLogRead
export interface OrderEventLogRead {
  id: string;
  source: string;
  type: string;
  summary: string;
  occurred_at: string;
}

// Odpowiednik schematu OrderDetailsRead
export interface OrderDetailsRead extends MarketplaceOrder {
  event_logs: OrderEventLogRead[];
  erp_sales_document_number?: string | null;
  erp_sales_correction_number?: string | null;
  erp_sales_document_sync_status?: ErpSyncStatus | null;
  erp_sales_document_sync_notes?: string | null;
  erp_sales_document_synced_at?: string | null;
}
type MappedAddress = {
  street?: string;
  zip_code?: string;
  city?: string;
} | null;

type BuyerDetails = {
  name: string;
  isCompany: boolean;
  taxId: string | null;
  address: MappedAddress;
  source: "invoice" | "delivery";
} | null;

type DeliveryDetails = {
  methodName: string;
  isPickupPoint: boolean;
  pickupPointName?: string | null;
  address?: {
    first_name?: string;
    last_name?: string;
    street?: string;
    zip_code?: string;
    city?: string;
    company_name?: string;
    phone_number?: string;
  } | null;
} | null;

type DeliveryCost = {
  amount: number;
  currency: string;
} | null;

export interface MappedOrderDetails {
  buyerDetails: BuyerDetails;
  deliveryDetails: DeliveryDetails;
  deliveryCost: DeliveryCost;
  lineItems: {
    id: string;
    name: string;
    quantity: number;
    price: string;
    offerId: string | null;
  }[];
  // Dodajemy pole `payment` dla PaymentCard
  payment: {
    type: any;
    provider?: string | null;
    status: any;
    total: string;
  };
}
