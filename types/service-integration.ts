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
  category: "MARKETPLACE" | "COURIER" | "ACCOUNTING" | "ERP" | "GOVERNMENT" | "WHOLESALE";
  provider_type: "ALLEGRO" | "BASELINKER" | "SUUS" | "SUBIEKT_GT" | "KSEF" | "APACZKA" | "AB" | "EMPIK" | "GEIS" | "GEODIS" | "INPOST_BUY" | "RABEN";
  is_active: boolean;
  external_user_id: string | null;
  sync_orders: boolean;
  sync_messages: boolean;
  sync_returns: boolean;
  autoresponder_enabled: boolean;
  autoresponder_type: string | null;
  autoresponder_message: string | null;
  autoresponder_mode: string | null;
  sender_config: SenderConfig | null;
  has_credentials: boolean;
  api_config?: Record<string, any> | null;
  sync_config?: Record<string, any> | null;
}
