import { ServiceIntegration } from "./service-integration";

// Prosty typ dla logów zdarzeń
interface OrderEventLog {
  id: string;
  source: string;
  type: string;
  summary: string;
  occurred_at: string; // ISO date string
}

// Główny, szczegółowy typ odpowiedzi z API dla /orders/{id}
export interface OrderDetailsApiResponse {
  id: string;
  external_order_id: string;
  organization_id: string;
  status: string;
  external_status: string;
  fulfillment_status: string | null;
  buyer_login: string | null;
  buyer_email: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  tracking_numbers: string[] | null;
  purchased_at: string; // ISO date string
  erp_sales_document_number?: string | null;

  service_integration: ServiceIntegration | null;
  // alias używany na stronie szczegółów
  integration?: ServiceIntegration | null;

  // Na stronie szczegółów ZAWSZE dostajemy pełny payload
  details_payload: any;

  // Znormalizowany adres FV z bazy danych
  invoice_address?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    tax_id?: string | null;
    street?: string | null;
    zip_code?: string | null;
    city?: string | null;
  } | null;

  // Dołączamy też listę logów zdarzeń
  event_logs: OrderEventLog[];
}

// Typ dla zmapowanych, przetworzonych danych używanych w UI
// (dla komponentów DeliveryCard, PaymentCard, etc.)
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
    type?: string;
    provider?: string;
    status: string;
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
  line_items: {
    id: string;
    name: string;
    quantity: number;
    price: string;
    imageUrl?: string;
    sku?: string;
    ean?: string;
  }[];
}
