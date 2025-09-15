// src/lib/zod.ts
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({
    message: "Proszę podać poprawny adres email.",
  }),
  password: z.string().min(6, {
    message: "Hasło musi mieć co najmniej 6 znaków.",
  }),
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

export const serviceIntegrationFormSchema = z
  .object({
    name: z.string().min(2, "Nazwa musi mieć co najmniej 2 znaki."),
    provider_type: z.enum(["ALLEGRO", "BASELINKER", "SUUS", "AB"]),

    sync_orders: z.boolean().optional(),
    sync_messages: z.boolean().optional(),
    sync_returns: z.boolean().optional(),

    api_token: z.string().optional(),
    suus_login: z.string().optional(),
    suus_password: z.string().optional(),

    ab_client_code: z.string().optional(),
    ab_login: z.string().optional(),
    ab_password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.provider_type === "BASELINKER") {
        return !!data.api_token && data.api_token.length > 5;
      }
      if (data.provider_type === "SUUS") {
        return (
          !!data.suus_login &&
          data.suus_login.length > 0 &&
          !!data.suus_password &&
          data.suus_password.length > 0
        );
      }
      // ### DODAJ NOWY WARUNEK DLA AB ###
      if (data.provider_type === "AB") {
        return (
          !!data.ab_client_code &&
          data.ab_client_code.length > 0 &&
          !!data.ab_login &&
          data.ab_login.length > 0 &&
          !!data.ab_password &&
          data.ab_password.length > 0
        );
      }
      return true;
    },
    {
      message: "Wypełnij wymagane pola dla wybranego typu integracji.",
      path: ["name"], // Błąd wciąż przypisujemy do ogólnego pola
    }
  );

// ### DODAJ NOWY TYP GENEROWANY Z ZOD ###
export type ServiceIntegrationFormValues = z.infer<
  typeof serviceIntegrationFormSchema
>;

// === KONIEC NOWYCH SCHEMATÓW INTEGRACJI ===

// Schemat aktualizacji jest prostszy i nie zawiera 'type' ani 'api_token'
export const IntegrationUpdateSchema = z.object({
  name: z.string().min(2, { message: "Nazwa musi mieć co najmniej 2 znaki." }),

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
  ab_client_code: z.string().optional(),
  ab_login: z.string().optional(),
  ab_password: z.string().optional(),
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
    buyerLogin: z.string().optional(),
    buyerEmail: z.string().email("Nieprawidłowy adres email."),

    deliveryType: z.enum(["address", "pickupPoint"]),
    deliveryAddress: ManualOrderAddressSchema.optional(),
    pickupPoint: ManualOrderPickupPointSchema.optional(),

    lineItems: z
      .array(ManualOrderLineItemSchema)
      .min(1, "Zamówienie musi zawierać co najmniej jeden produkt."),

    has_invoiceAddress: z.boolean(),
    invoiceAddress: ManualOrderInvoiceSchema.optional(),

    note: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.deliveryType === "address") return !!data.deliveryAddress;
      if (data.deliveryType === "pickupPoint") return !!data.pickupPoint;
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
      if (!data.deliveryAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Adres dostawy jest wymagany.",
          path: ["deliveryAddress"],
        });
      }
    } else if (data.deliveryType === "pickupPoint") {
      // Jeśli wybrano punkt odbioru, sprawdź, czy został podany
      if (!data.pickupPoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Punkt odbioru jest wymagany.",
          path: ["pickupPoint"],
        });
      }
    }

    if (data.has_invoiceAddress) {
      if (!data.invoiceAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dane do faktury są wymagane.",
          path: ["has_invoiceAddress"],
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
  serviceIntegration_id: z
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
