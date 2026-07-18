// src/lib/zod.ts
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({
    message: "Proszę podać poprawny adres email.",
  }),
  password: z.string().min(6, {
    message: "Hasło musi mieć co najmniej 6 znaków.",
  }),
  rememberMe: z.boolean().optional(),
});
export type LoginSchemaType = z.infer<typeof LoginSchema>;

export const InviteUserSchema = z.object({
  email: z.string().email({
    message: "Proszę podać poprawny adres email.",
  }),
});
export type InviteUserSchemaType = z.infer<typeof InviteUserSchema>;

export const AcceptInvitationSchema = z
  .object({
    name: z.string().optional(),
    password: z.string().min(8, {
      message: "Hasło musi mieć co najmniej 8 znaków.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są takie same.",
    path: ["confirmPassword"],
  });
export type AcceptInvitationSchemaType = z.infer<typeof AcceptInvitationSchema>;

export const RegisterStep1Schema = z.object({
  email: z.string().email({ message: "Proszę podać poprawny adres email." }),
  password: z
    .string()
    .min(8, { message: "Hasło musi mieć co najmniej 8 znaków." }),
  name: z.string().optional(),
});

export const RegisterStep2Schema = z.object({
  organizationName: z
    .string()
    .min(2, { message: "Nazwa organizacji musi mieć co najmniej 2 znaki." }),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
});

export const RegisterStep3Schema = z.object({
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Musisz zaakceptować regulamin, aby kontynuować.",
  }),
});

export const FullRegisterSchema =
  RegisterStep1Schema.merge(RegisterStep2Schema).merge(RegisterStep3Schema);
export type FullRegisterSchemaType = z.infer<typeof FullRegisterSchema>;

export type ServiceIntegrationFormValues = {
  name: string;
  provider_type: "ALLEGRO" | "BASELINKER" | "SUUS" | "KSEF" | "AB" | "SUBIEKT_GT" | "APACZKA" | "EMPIK" | "GEIS" | "GEODIS" | "INPOST_BUY" | "RABEN";
  sync_orders?: boolean; // Zmieniamy na opcjonalne, bo `reset` czasami go nie ma
  sync_messages?: boolean;
  sync_returns?: boolean;
  api_token?: string;
  suus_login?: string;
  suus_password?: string;
  suus_order_type?: string;
  ksef_token?: string;
  ab_client_code?: string;
  ab_login?: string;
  ab_password?: string;
  apaczka_app_id?: string;
  apaczka_app_secret?: string;
  subiekt_agent_url?: string;
  subiekt_api_key?: string;
  subiekt_erp_sales_reference_template?: string;
  nip?: string;
  environment?: string;
  empik_token?: string;
  ksef_auto_sync_enabled?: boolean;
  invoice_sync_interval?: number;
  ksef_sync_interval?: number;
  geis_customer_code?: string;
  geis_password?: string;
  geis_is_test?: boolean;
  geis_iban?: string;
  geis_pdf_format?: string;
  geodis_client_id?: string;
  geodis_client_secret?: string;
  geodis_customer_id?: string;
  geodis_warehouse_id?: string;
  geodis_is_test?: boolean;
  inpost_buy_client_id?: string;
  inpost_buy_client_secret?: string;
  inpost_buy_organization_id?: string;
  inpost_buy_sandbox?: boolean;
  raben_username?: string;
  raben_password?: string;
  raben_edi_sender?: string;
  raben_edi_receiver?: string;
  raben_department?: string;
  raben_payer_identifier?: string;
  raben_is_test?: boolean;
  raben_product_type?: string;
  raben_service_level?: string;
};

// === KROK 2: Upraszczamy schemat, aby produkował zgodny typ ===
export const serviceIntegrationFormSchema = z
  .object({
    name: z.string().min(2, "Nazwa musi mieć co najmniej 2 znaki."),
    provider_type: z.enum(["ALLEGRO", "BASELINKER", "SUUS", "KSEF", "AB", "SUBIEKT_GT", "APACZKA", "EMPIK", "GEIS", "GEODIS", "INPOST_BUY", "RABEN"]),

    sync_orders: z.boolean().optional(),
    sync_messages: z.boolean().optional(),
    sync_returns: z.boolean().optional(),

    api_token: z.string().optional(),
    suus_login: z.string().optional(),
    suus_password: z.string().optional(),
    suus_order_type: z.string().optional(),
    ksef_token: z.string().optional(),
    ab_client_code: z.string().optional(),
    ab_login: z.string().optional(),
    ab_password: z.string().optional(),
    apaczka_app_id: z.string().optional(),
    apaczka_app_secret: z.string().optional(),
    subiekt_agent_url: z.string().optional(),
    subiekt_api_key: z.string().optional(),
    subiekt_erp_sales_reference_template: z.string().optional(),
    nip: z.string().optional(),
    environment: z.string().optional(),
    empik_token: z.string().optional(),
    ksef_auto_sync_enabled: z.boolean().optional(),
    invoice_sync_interval: z.number().optional(),
    ksef_sync_interval: z.number().optional(),

    geis_customer_code: z.string().optional(),
    geis_password: z.string().optional(),
    geis_is_test: z.boolean().optional(),
    geis_iban: z.string().optional(),
    geis_pdf_format: z.string().optional(),
    geodis_client_id: z.string().optional(),
    geodis_client_secret: z.string().optional(),
    geodis_customer_id: z.string().optional(),
    geodis_warehouse_id: z.string().optional(),
    geodis_is_test: z.boolean().optional(),
    inpost_buy_client_id: z.string().optional(),
    inpost_buy_client_secret: z.string().optional(),
    inpost_buy_organization_id: z.string().optional(),
    inpost_buy_sandbox: z.boolean().optional(),
    raben_username: z.string().optional(),
    raben_password: z.string().optional(),
    raben_edi_sender: z.string().optional(),
    raben_edi_receiver: z.string().optional(),
    raben_department: z.string().optional(),
    raben_payer_identifier: z.string().optional(),
    raben_is_test: z.boolean().optional(),
    raben_product_type: z.string().optional(),
    raben_service_level: z.string().optional(),
    geodis_warehouse_id: z.string().optional(),
    geodis_is_test: z.boolean().optional(),
    inpost_buy_client_id: z.string().optional(),
    inpost_buy_client_secret: z.string().optional(),
    inpost_buy_organization_id: z.string().optional(),
    inpost_buy_sandbox: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.provider_type === "BASELINKER") {
      if (!data.api_token || data.api_token.length <= 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Podaj poprawny token API BaseLinker.",
          path: ["api_token"],
        });
      }
    }
    
    if (data.provider_type === "SUUS") {
      if (!data.suus_login) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Login jest wymagany.",
          path: ["suus_login"],
        });
      }
      if (!data.suus_password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hasło jest wymagane.",
          path: ["suus_password"],
        });
      }
    }

    if (data.provider_type === "KSEF") {
      if (!data.nip || data.nip.replace(/\D/g, "").length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Podaj poprawny NIP (10 cyfr).",
          path: ["nip"],
        });
      }
      if (!data.ksef_token || data.ksef_token.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Podaj poprawny token KSeF.",
          path: ["ksef_token"],
        });
      }
    }

    if (data.provider_type === "APACZKA") {
      if (!data.apaczka_app_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "App ID jest wymagane.",
          path: ["apaczka_app_id"],
        });
      }
      if (!data.apaczka_app_secret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "App Secret jest wymagany.",
          path: ["apaczka_app_secret"],
        });
      }
    }
    
    if (data.provider_type === "AB") {
      if (!data.ab_client_code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kod klienta jest wymagany.",
          path: ["ab_client_code"],
        });
      }
      if (!data.ab_login) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Login jest wymagany.",
          path: ["ab_login"],
        });
      }
      if (!data.ab_password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hasło jest wymagane.",
          path: ["ab_password"],
        });
      }
    }
    
    if (data.provider_type === "EMPIK") {
      if (!data.empik_token || data.empik_token.length <= 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Podaj poprawny token API Empik.",
          path: ["empik_token"],
        });
      }
    }

    if (data.provider_type === "GEIS") {
      if (!data.geis_customer_code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kod klienta jest wymagany.",
          path: ["geis_customer_code"],
        });
      }
      if (!data.geis_password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hasło API jest wymagane.",
          path: ["geis_password"],
        });
      }
    }

    if (data.provider_type === "GEODIS") {
      if (!data.geodis_client_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Client ID jest wymagany.",
          path: ["geodis_client_id"],
        });
      }
      if (!data.geodis_client_secret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Client Secret jest wymagany.",
          path: ["geodis_client_secret"],
        });
      }
      if (!data.geodis_customer_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Customer ID jest wymagany.",
          path: ["geodis_customer_id"],
        });
      }
    }

    if (data.provider_type === "RABEN") {
      if (!data.raben_username) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nazwa użytkownika API jest wymagana.",
          path: ["raben_username"],
        });
      }
      if (!data.raben_password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hasło API jest wymagane.",
          path: ["raben_password"],
        });
      }
      if (!data.raben_edi_sender) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nadawca EDI jest wymagany.",
          path: ["raben_edi_sender"],
        });
      }
      if (!data.raben_edi_receiver) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Odbiorca EDI jest wymagany.",
          path: ["raben_edi_receiver"],
        });
      }
      if (!data.raben_department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Numer oddziału jest wymagany.",
          path: ["raben_department"],
        });
      }
      if (!data.raben_payer_identifier) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Identyfikator płatnika jest wymagany.",
          path: ["raben_payer_identifier"],
        });
      }
    }
  });

// === KONIEC NOWYCH SCHEMATÓW INTEGRACJI ===

// Schemat aktualizacji jest prostszy i nie zawiera 'type' ani 'api_token'
export const IntegrationUpdateSchema = z.object({
  name: z.string().min(2, { message: "Nazwa musi mieć co najmniej 2 znaki." }),
  is_active: z.boolean().optional(),

  // Pola dla Marketplace (wszystkie opcjonalne)
  sync_orders: z.boolean().optional(),
  sync_messages: z.boolean().optional(),
  sync_returns: z.boolean().optional(),
  autoresponder_enabled: z.boolean().optional(),
  autoresponder_message: z.string().optional(),

  // Pole dla BaseLinker (opcjonalne)
  api_token: z.string().optional(),

  // NOWE Pola dla SUUS (opcjonalne)
  suus_login: z.string().optional(),
  suus_password: z.string().optional(),
  suus_order_type: z.string().optional(),

  geis_customer_code: z.string().optional(),
  geis_password: z.string().optional(),
  geis_is_test: z.boolean().optional(),
  geis_iban: z.string().optional(),
  geis_pdf_format: z.string().optional(),

  geodis_client_id: z.string().optional(),
  geodis_client_secret: z.string().optional(),
  geodis_customer_id: z.string().optional(),
  geodis_warehouse_id: z.string().optional(),
  geodis_is_test: z.boolean().optional(),

  raben_username: z.string().optional(),
  raben_password: z.string().optional(),
  raben_edi_sender: z.string().optional(),
  raben_edi_receiver: z.string().optional(),
  raben_department: z.string().optional(),
  raben_payer_identifier: z.string().optional(),
  raben_is_test: z.boolean().optional(),
  raben_product_type: z.string().optional(),
  raben_service_level: z.string().optional(),

  nip: z.string().optional(),
  ksef_token: z.string().optional(),
  environment: z.string().optional(),
  
  ab_client_code: z.string().optional(),
  ab_login: z.string().optional(),
  ab_password: z.string().optional(),
  
  apaczka_app_id: z.string().optional(),
  apaczka_app_secret: z.string().optional(),
  apaczka_bank_account: z.string().optional(),
  subiekt_agent_url: z.string().optional(),
  subiekt_api_key: z.string().optional(),
  subiekt_erp_sales_reference_template: z.string().optional(),
  empik_token: z.string().optional(),
  ksef_auto_sync_enabled: z.boolean().optional(),
  invoice_sync_interval: z.number().optional(),
  ksef_sync_interval: z.number().optional(),
  sync_config: z.any().optional(),
  inpost_buy_client_id: z.string().optional(),
  inpost_buy_client_secret: z.string().optional(),
  inpost_buy_organization_id: z.string().optional(),
  inpost_buy_sandbox: z.boolean().optional(),
});

export type IntegrationUpdateSchemaType = z.infer<
  typeof IntegrationUpdateSchema
>;

// --- ZAKTUALIZOWANE SCHEMATY ZAMÓWIEŃ RĘCZNYCH ---

export const ManualOrderAddressSchema = z.object({
  first_name: z.string().min(2, "Imię jest wymagane."),
  last_name: z.string().min(2, "Nazwisko jest wymagane."),
  street: z.string().min(3, "Ulica jest wymagana."),
  city: z.string().min(2, "Miasto jest wymagane."),
  postal_code: z
    .string()
    .regex(/^\d{2}-\d{3}$/, "Nieprawidłowy kod pocztowy (np. 00-000)."),
  country: z.string().min(2, "Kraj jest wymagany."),
  phone_number: z.string().min(9, "Numer telefonu jest wymagany."),
});

export const ManualOrderPickupPointSchema = z.object({
  point_id: z.string().min(1, "ID punktu jest wymagane."),
  name: z.string().min(3, "Nazwa punktu jest wymagana."),
  street: z.string().min(3, "Ulica jest wymagana."),
  city: z.string().min(2, "Miasto jest wymagane."),
  postal_code: z.string().regex(/^\d{2}-\d{3}$/, "Nieprawidłowy kod pocztowy."),
  description: z.string().optional(),
});

export const ManualOrderLineItemSchema = z.object({
  name: z.string().min(3, "Nazwa produktu jest wymagana."),
  quantity: z.number().min(1, "Ilość musi być większa od 0."),
  price: z.number().min(0.01, "Cena musi być większa od 0."),
});

export const ManualOrderInvoiceSchema = z
  .object({
    company_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    tax_id: z.string().optional(), // NIP
    street: z.string().min(3, "Ulica jest wymagana."),
    city: z.string().min(2, "Miasto jest wymagane."),
    postal_code: z
      .string()
      .regex(/^\d{2}-\d{3}$/, "Nieprawidłowy kod pocztowy."),
    country: z.string().min(2, "Kraj jest wymagany."),
  })
  .refine(
    (data) => !!data.company_name || (!!data.first_name && !!data.last_name),
    {
      // Walidacja: Musi być albo nazwa firmy, albo imię i nazwisko
      message: "Należy podać nazwę firmy lub imię i nazwisko.",
      path: ["company_name"], // Przypisz błąd do pierwszego pola
    }
  );

export const ManualOrderSchema = z
  .object({
    reference_number: z.string().optional(),
    buyer_login: z.string().optional(),
    buyer_email: z.string().email("Nieprawidłowy adres email."),

    deliveryType: z.enum(["address", "pickup_point"]),
    delivery_address: ManualOrderAddressSchema.optional(),
    pickup_point: ManualOrderPickupPointSchema.optional(),

    line_items: z
      .array(ManualOrderLineItemSchema)
      .min(1, "Zamówienie musi zawierać co najmniej jeden produkt."),

    has_invoice_address: z.boolean(),
    invoice_address: ManualOrderInvoiceSchema.optional(),

    note: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.deliveryType === "address") return !!data.delivery_address;
      if (data.deliveryType === "pickup_point") return !!data.pickup_point;
      return false;
    },
    {
      message: "Proszę uzupełnić dane dla wybranego typu dostawy.",
      path: ["deliveryType"],
    }
  )
  .superRefine((data, ctx) => {
    if (data.deliveryType === "address") {
      // Jeśli wybrano adres, sprawdź, czy został podany
      if (!data.delivery_address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Adres dostawy jest wymagany.",
          path: ["delivery_address"],
        });
      }
    } else if (data.deliveryType === "pickup_point") {
      // Jeśli wybrano punkt odbioru, sprawdź, czy został podany
      if (!data.pickup_point) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Punkt odbioru jest wymagany.",
          path: ["pickup_point"],
        });
      }
    }

    if (data.has_invoice_address) {
      if (!data.invoice_address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dane do faktury są wymagane.",
          path: ["has_invoice_address"],
        });
      }
    }
  });
export type ManualOrderSchemaType = z.infer<typeof ManualOrderSchema>;

export const packageFormSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana.").max(100),

  // === OSTATECZNE, NAJPROSTSZE ROZWIĄZANIE ===
  // Walidujemy jako string, ale sprawdzamy, czy można go przekonwertować na poprawną liczbę.

  length_cm: z
    .string()
    .min(1, "Długość jest wymagana.")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Musi być liczbą większą od 0",
    }),

  width_cm: z
    .string()
    .min(1, "Szerokość jest wymagana.")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Musi być liczbą większą od 0",
    }),

  height_cm: z
    .string()
    .min(1, "Wysokość jest wymagana.")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Musi być liczbą większą od 0",
    }),

  weight_kg: z
    .string()
    .min(1, "Waga jest wymagana.")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Musi być liczbą większą od 0",
    }),
  courier_code: z.string().optional(),
});

// Teraz mamy tylko jeden typ, bo nie ma transformacji.
export type PackageFormValues = z.infer<typeof packageFormSchema>;

export const deliveryMappingFormSchema = z.object({
  marketplace_delivery_method: z
    .string()
    .min(3, "Nazwa metody jest wymagana.")
    .max(255),
  service_integration_id: z
    .string()
    .min(1, "Musisz wybrać integrację kurierską."),
  courier_service_code: z.string().min(1, "Kod usługi jest wymagany.").max(100),
  courier_credentials_id: z.string().optional(),
  default_package_definition_id: z.string().optional(),
});

export type DeliveryMappingFormValues = z.infer<
  typeof deliveryMappingFormSchema
>;

const postalCodeRegex = /^\d{2}-\d{3}$/;

export const organizationSettingsSchema = z.object({
  name: z.string().min(2, "Nazwa organizacji musi mieć co najmniej 2 znaki."),
  company_name: z.string().optional(),
  tax_id: z.string().optional(), // Można dodać .regex() do walidacji NIP
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_postal_code: z
    .string()
    .optional()
    .refine(
      (val) => !val || postalCodeRegex.test(val),
      "Nieprawidłowy kod pocztowy."
    ),
  address_country: z.string().optional(),

  // Pola domyślnego nadawcy
  default_sender_name: z.string().optional(),
  default_sender_company: z.string().optional(),
  default_sender_street: z.string().optional(),
  default_sender_postal_code: z
    .string()
    .optional()
    .refine(
      (val) => !val || postalCodeRegex.test(val),
      "Nieprawidłowy kod pocztowy."
    ),
  default_sender_city: z.string().optional(),
  default_sender_country_code: z.string().optional(),
  default_sender_email: z
    .string()
    .optional()
    .refine(
      (val) => !val || z.string().email().safeParse(val).success,
      "Nieprawidłowy adres email."
    ),
  default_sender_phone: z.string().optional(),
});

export type OrganizationSettingsValues = z.infer<
  typeof organizationSettingsSchema
>;

export const additionalServiceMappingFormSchema = z.object({
  marketplace_service_id: z
    .string()
    .min(1, "ID usługi marketplace jest wymagane."),
  marketplace_service_name: z
    .string()
    .min(1, "Nazwa usługi marketplace jest wymagana."),
  source_integration_provider: z
    .string()
    .min(1, "Dostawca marketplace jest wymagany."),
  courier_provider: z.string().min(1, "Dostawca kurierski jest wymagany."),
  courier_service_code: z
    .string()
    .min(1, "Kod usługi kurierskiej jest wymagany."),
  // Pola opcjonalne
  param_name: z.string().optional(),
  param_source: z.string().optional(),
});
export type AdditionalServiceMappingFormValues = z.infer<
  typeof additionalServiceMappingFormSchema
>;

export const productSupplierMappingSchema = z.object({
  marketplace_offer_id: z.string().min(1, "ID oferty jest wymagane."),
  supplierIntegrationId: z.string().min(1, "Musisz wybrać hurtownię."),
  supplierProductIndex: z.string().min(1, "Indeks dostawcy jest wymagany."),
});

export type ProductSupplierMappingFormValues = z.infer<
  typeof productSupplierMappingSchema
>;
