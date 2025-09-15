export interface SenderConfig {
  name: string;
  company?: string;
  street: string;
  postal_code: string;
  city: string;
  country_code: string;
  email: string;
  phone: string;
}

export interface ServiceIntegration {
  id: number;
  name: string;
  // ### START ZMIANY ###
  category: "MARKETPLACE" | "COURIER" | "ACCOUNTING" | "WHOLESALE";
  provider_type: "ALLEGRO" | "BASELINKER" | "SUUS" | "AB";
  // ### KONIEC ZMIANY ###
  is_active: boolean;
  external_user_id: string | null;
  sync_orders: boolean;
  sync_messages: boolean;
  sync_returns: boolean;
  autoresponder_enabled: boolean;
  autoresponder_message: string | null;
  sender_config: SenderConfig | null;
  has_credentials: boolean;
}
