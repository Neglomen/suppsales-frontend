/**
 * Ten plik definiuje typy dla faktur.
 * Wszystkie pola są zdefiniowane w `snake_case`, aby odpowiadały bezpośrednio odpowiedzi API.
 */

export type SupplierInvoiceStatus =
  | "PENDING"
  | "AUTO_LINKED"
  | "MANUALLY_LINKED"
  | "LINKING_ERROR"
  | "UNMATCHED";

export type ErpSyncStatus = "PENDING" | "SYNCED" | "ERROR" | "NOT_FOUND";

/**
 * Adres dostawy zagnieżdżony w `raw_metadata`.
 */
interface ShippingAddress {
  name: string | null;
  line1: string | null;
  line2: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  ab_code: string | null;
}

/**
 * Minimalne dane zamówienia marketplace, zagnieżdżone w `PurchaseOrderForInvoice`.
 */
interface MarketplaceOrderForInvoice {
  external_order_id: string;
  buyer_login: string | null;
}

/**
 * Minimalne dane zlecenia zakupu (Purchase Order), zagnieżdżone w `SupplierInvoice`.
 */
interface PurchaseOrderForInvoice {
  id: string;
  marketplace_order: MarketplaceOrderForInvoice;
}

/**
 * Główny interfejs reprezentujący fakturę dostawcy (`SupplierInvoice`).
 * Odzwierciedla schemat Pydantic `SupplierInvoiceRead`.
 */
export interface SupplierInvoice {
  id: string;
  invoice_number: string;
  issue_date: string; // ISO string, np. "2023-10-27"
  due_date: string | null;
  total_gross_amount: number;
  currency: string;
  status: SupplierInvoiceStatus;

  // Kwoty netto/VAT z KSeF
  total_net_amount: number | null;
  total_vat_amount: number | null;

  // Numer faktury wystawcy (oddzielnie od invoice_number = numer KSeF)
  original_invoice_number: string | null;

  // Dane sprzedawcy z KSeF
  seller_nip: string | null;
  seller_name: string | null;

  // Dane nabywcy z KSeF
  buyer_nip: string | null;
  buyer_name: string | null;
  recipient_name: string | null;

  // Typ faktury KSeF (Vat, Zal, Kor, etc.)
  invoice_type: string | null;

  // Data przyjęcia faktury do KSeF
  ksef_acquisition_date: string | null;

  // Ścieżka do fizycznego pliku PDF na serwerze (np. dla faktur ze zwykłych hurtowni)
  file_path: string | null;

  // Pola synchronizacji z ERP (Subiekt)
  erp_sync_status: ErpSyncStatus;
  erp_synced_at: string | null; // ISO datetime string
  erp_sync_notes: string | null;

  ksef_category?: string | null;
  notes?: string | null;

  // Surowe metadane z pliku
  raw_metadata: {
    shipping_address?: ShippingAddress | null;
    [key: string]: any;
  } | null;

  // Lista powiązanych zleceń
  purchase_orders: PurchaseOrderForInvoice[];

  supplier_integration: {
    id: number;
    name: string;
    provider_type: string; // Używamy string, żeby uniknąć importów, albo ProviderType jeśli dostępne
  } | null;
}

/**
 * Definiuje strukturę faktury sprzedaży (SalesInvoice).
 */
export interface SalesInvoice {
  id: string;
  invoice_number: string;
  issue_date: string; // ISO date string
  sale_date: string; // ISO date string
  payment_due_date: string; // ISO date string

  seller_details: {
    name: string;
    tax_id: string | null;
    address: string;
    [key: string]: any;
  };
  buyer_details: {
    name: string;
    tax_id: string | null;
    address: string;
    [key: string]: any;
  };

  line_items: any[];
  totals: {
    gross: number;
    [key: string]: any;
  };

  notes: string | null;
  order_id: string;
}
