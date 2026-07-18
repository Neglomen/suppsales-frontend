export enum LabelFormat {
  PDF = "PDF",
  ZPL = "ZPL",
}

export interface Organization {
  id: string;
  name: string;
  company_name: string | null;
  tax_id: string | null;
  address_street: string | null;
  address_city: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  default_sender_name: string | null;
  default_sender_company: string | null;
  default_sender_street: string | null;
  default_sender_postal_code: string | null;
  default_sender_city: string | null;
  default_sender_country_code: string | null;
  default_sender_email: string | null;
  default_sender_phone: string | null;
  default_iban: string | null;
  default_label_format: LabelFormat;
  default_reference_number_template?: string;
  print_hub_enabled?: boolean;
  print_hub_default_invoice_printer?: string | null;
  print_hub_default_label_printer?: string | null;
  print_erp_symbol_on_label?: boolean;
  print_full_name_on_label?: boolean;
  label_items_per_page?: number;
  warn_invoice_exists?: boolean;
  warn_waybill_exists?: boolean;
  warn_cod_mismatch?: boolean;
}
