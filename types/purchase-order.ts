export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT_TO_SUPPLIER"
  | "COMPLETED"
  | "CANCELLED";

// Ten typ odzwierciedla dane OTRZYMYWANE z API (camelCase)
export interface PurchaseOrderLineItem {
  marketplaceLineItemId?: string;
  name: string;
  quantity: number;
  supplierProductIndex?: string | null;
  // backend snake_case fallbacks
  marketplace_line_item_id?: string;
  supplier_product_index?: string | null;
}

// Ten typ odzwierciedla dane OTRZYMYWANE z API (camelCase)
export interface PurchaseOrder {
  id: string;
  status: PurchaseOrderStatus;
  marketplaceOrderId?: string;
  supplierIntegrationId?: number;
  lineItems?: PurchaseOrderLineItem[];
  notes: string | null;
  
  // backend snake_case fallbacks
  marketplace_order_id?: string;
  supplier_integration_id?: number;
  line_items?: PurchaseOrderLineItem[];
  // Zostawiamy snake_case tam, gdzie backendowy model ma tak samo (np. ARRAY)
  tracking_numbers: string[] | null;
  supplier_address_code: string | null;
  created_at: string;
  updated_at: string;

  // Pola ze złączonych danych - camelCase (z Pydantic computed_field)
  marketplaceExternalOrderId?: string;
  buyerLogin?: string;
  firstItemName?: string;
  supplierIntegration?: { id: number; name: string; provider_type?: string };
  
  // snake_case fallbacks dla enriched pól
  marketplace_external_order_id?: string;
  buyer_login?: string;
  first_item_name?: string;
  supplier_integration?: { id: number; name: string; provider_type?: string };

  // Zagnieżdżone pełne dane zamówienia marketplace (z Enriched)
  marketplace_order?: {
    id: string;
    external_order_id?: string;
    buyer_login?: string;
    buyer_first_name?: string;
    buyer_last_name?: string;
    buyer_email?: string;
    delivery_address?: {
      first_name?: string;
      last_name?: string;
      street?: string;
      zip_code?: string;
      city?: string;
      phone_number?: string;
    };
    line_items?: Array<{ offer?: { name?: string }; quantity?: number }>;
    details_payload?: Record<string, any>;
    total_to_pay?: number;
  };
}
