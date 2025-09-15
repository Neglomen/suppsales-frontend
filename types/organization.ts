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
}
