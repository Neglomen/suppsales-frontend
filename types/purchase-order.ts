export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT_TO_SUPPLIER"
  | "COMPLETED"
  | "CANCELLED";

// Ten typ odzwierciedla dane OTRZYMYWANE z API (camelCase)
export interface PurchaseOrderLineItem {
  marketplaceLineItemId: string;
  name: string;
  quantity: number;
  supplierProductIndex: string | null;
}

// Ten typ odzwierciedla dane OTRZYMYWANE z API (camelCase)
export interface PurchaseOrder {
  id: string;
  status: PurchaseOrderStatus;
  marketplaceOrderId: string;
  supplierIntegrationId: number;
  lineItems?: PurchaseOrderLineItem[];
  notes: string | null;
  // Zostawiamy snake_case tam, gdzie backendowy model ma tak samo (np. ARRAY)
  tracking_numbers: string[] | null;
  supplier_address_code: string | null;
  created_at: string;
  updated_at: string;

  // Pola ze złączonych danych
  marketplaceExternalOrderId?: string;
  buyerLogin?: string;
  firstItemName?: string;
}
