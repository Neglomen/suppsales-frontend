// src/types/order.ts

// Przenosimy tutaj wszystkie definicje typów ze strony szczegółów zamówienia

export interface Address {
  firstName?: string;
  lastName?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  countryCode?: string;
  companyName?: string;
  phoneNumber?: string;
  taxId?: string;
}

export interface MappedOrderDetails {
  delivery: {
    methodName: string;
    address: Address;
    isPickupPoint: boolean;
    pickupPointName?: string;
  };
  payment: { type: string; provider?: string; status: string; total: string };
  invoice: { required: boolean; address: Address };
  line_items: { id: string; name: string; quantity: number; price: string }[];
}

export interface OrderDetailsApiResponse {
  id: string;
  external_order_id: string;
  status: string;
  buyer_login: string | null;
  purchased_at: string;
  integration: {
    id: number;
    name: string;
    type: "ALLEGRO" | "BASELINKER";
    external_user_id: string | null;
  } | null;
  line_items: any[];
  event_logs: {
    id: string;
    source: string;
    type: string;
    summary: string;
    occurred_at: string;
  }[];
  details_payload: any;
}
