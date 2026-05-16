export interface ProductErpMapping {
  id: string;
  marketplace_offer_id: string;
  erp_product_symbol: string;
  source_integration_id: number;
  erp_integration_id: number;
  last_known_offer_name: string | null;
  notes: string | null;
  source_integration_name: string | null;
  erp_integration_name: string | null;
}
