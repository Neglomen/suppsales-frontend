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

export const IntegrationSchema = z
  .object({
    // Wszystkie pola są teraz na jednym poziomie
    type: z.enum(["ALLEGRO", "BASELINKER"]),
    name: z
      .string()
      .min(2, { message: "Nazwa musi mieć co najmniej 2 znaki." }),
    sync_orders: z.boolean(),
    // Pola warunkowe są teraz opcjonalne
    sync_messages: z.boolean().optional(),
    sync_returns: z.boolean().optional(),
    api_token: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Tutaj implementujemy logikę walidacji warunkowej
    if (data.type === "BASELINKER") {
      if (!data.api_token || data.api_token.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Token API jest wymagany i musi być poprawny.",
          path: ["api_token"],
        });
      }
    }
    if (data.type === "ALLEGRO") {
      // Dla Allegro, te pola są wymagane, więc sprawdzamy czy są zdefiniowane
      if (typeof data.sync_messages !== "boolean") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To pole jest wymagane.",
          path: ["sync_messages"],
        });
      }
      if (typeof data.sync_returns !== "boolean") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To pole jest wymagane.",
          path: ["sync_returns"],
        });
      }
    }
  });
export type IntegrationSchemaType = z.infer<typeof IntegrationSchema>;

// === KONIEC NOWYCH SCHEMATÓW INTEGRACJI ===

// Schemat aktualizacji jest prostszy i nie zawiera 'type' ani 'api_token'
export const IntegrationUpdateSchema = z.object({
  name: z.string().min(2, { message: "Nazwa musi mieć co najmniej 2 znaki." }),
  sync_orders: z.boolean(),
  sync_messages: z.boolean(),
  sync_returns: z.boolean(),
  autoresponder_enabled: z.boolean().optional(),
  autoresponder_message: z.string().optional(),
  api_token: z.string().optional(),
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
