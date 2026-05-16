export type PurchaseOrderBatchStatus =
  | "PROCESSING"
  | "DISPATCHING"
  | "COMPLETED"
  | "PARTIAL_FAILURE"
  | "FAILED";

export interface PurchaseOrderBatch {
  id: string;
  status: PurchaseOrderBatchStatus;
  supplier_integration_id: number; // Zmieniono z supplierIntegrationId
  item_count: number; // Zmieniono z itemCount
  created_at: string; // Zmieniono z createdAt
  total_gross_amount?: number; // Zmieniono z totalGrossAmount
}
