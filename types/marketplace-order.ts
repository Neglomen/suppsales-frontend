// marketplace-order.ts
import { ServiceIntegration } from "./service-integration";

interface LineItem {
  id: string;
  quantity: number;
  price: { amount: string; currency: string };
  offer: { id: string | null; name: string };
  offer_id?: string | null;
}

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
  tax_id?: string;
  // snake_case aliases present in some responses
  first_name?: string;
  last_name?: string;
  zip_code?: string;
  company_name?: string;
  phone_number?: string;
}

export interface MarketplaceOrder {
  id: string;
  // camelCase (z nowego API / z poprzednich sesji)
  externalOrderId?: string;
  organizationId?: string;
  fulfillmentStatus?: string | null;
  buyerLogin?: string | null;
  buyerEmail?: string | null;
  buyerFirstName?: string | null;
  buyerLastName?: string | null;
  buyerPhoneNumber?: string | null;
  trackingNumbers?: string[] | null;
  purchasedAt?: string;
  totalToPay?: number | null;
  serviceIntegration?: ServiceIntegration | null;
  hasPurchaseOrder?: boolean;
  lineItems?: LineItem[];
  deliveryAddress?: Address | null;
  invoiceAddress?: Address | null;
  detailsPayload?: any;
  erpSalesDocumentNumber?: string | null;
  erpSalesDocumentSyncedAt?: string | null;
  pickupPoint?: any | null;
  pickup_point?: any | null;
  flags?: string[];

  // snake_case (z backupu / starszego kodu)
  external_order_id?: string;
  organization_id?: string;
  status?: string;
  external_status?: string;
  fulfillment_status?: string | null;
  buyer_login?: string | null;
  buyer_email?: string | null;
  buyer_first_name?: string | null;
  buyer_last_name?: string | null;
  tracking_numbers?: string[] | null;
  purchased_at?: string;
  total_to_pay?: number | null;
  service_integration?: ServiceIntegration | null;
  service_integration_id?: number | null;
  details_payload?: any;
  line_items?: LineItem[];
  delivery_address?: Address | null;
  payment_type?: string | null;
  invoice_address?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    tax_id?: string | null;
    street?: string | null;
    zip_code?: string | null;
    city?: string | null;
  } | null;
  erp_sales_document_number?: string | null;
  erp_sales_correction_number?: string | null;
  erp_sales_document_synced_at?: string | null;
}
