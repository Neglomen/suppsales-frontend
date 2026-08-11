// Definicja typów z enums.py
export enum ShipmentStatus {
  PENDING = "PENDING",
  CREATED = "CREATED",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  ERROR = "ERROR",
}

export enum LabelFormat {
  PDF = "PDF",
  ZPL = "ZPL",
}

export interface Shipment {
  id: string;
  tracking_number: string | null;
  courier_service_code: string;
  status: ShipmentStatus;
  label_format: LabelFormat | null;
  package_details: {
    name: string;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    weight_kg: number;
  };
  order_id: string;
  courier_integration_id: number;
  is_return?: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}
