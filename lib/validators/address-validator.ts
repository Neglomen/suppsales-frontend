import { z } from "zod";

export const COURIER_PROVIDERS = {
  ALLEGRO: "ALLEGRO",
  SUUS: "SUUS",
} as const;

export type CourierProvider = keyof typeof COURIER_PROVIDERS;

const postalCodeRegex = /^\d{2}-\d{3}$/;

/**
 * Bazowy schemat — imię/nazwisko lub firma (opcjonalne razem, wymagane przynajmniej jedno).
 */
const baseAddressSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    street: z.string().min(3, "Ulica i numer są wymagane."),
    postalCode: z
      .string()
      .regex(postalCodeRegex, "Nieprawidłowy format kodu pocztowego (np. 12-345)."),
    city: z.string().min(2, "Miasto jest wymagane."),
    phone: z.string().min(9, "Numer telefonu jest wymagany."),
    email: z
      .string()
      .email("Nieprawidłowy adres e-mail.")
      .optional()
      .or(z.literal("")),
    deliveryPointId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasPersonal = data.firstName?.trim() && data.lastName?.trim();
    const hasCompany = data.companyName?.trim();
    if (!hasPersonal && !hasCompany) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj imię i nazwisko lub nazwę firmy.",
        path: ["firstName"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wymagane gdy brak nazwy firmy.",
        path: ["lastName"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lub podaj imię i nazwisko.",
        path: ["companyName"],
      });
    }
  });

const allegroAddressSchema = baseAddressSchema;
const suusAddressSchema = baseAddressSchema;

const validatorMap = {
  [COURIER_PROVIDERS.ALLEGRO]: allegroAddressSchema,
  [COURIER_PROVIDERS.SUUS]: suusAddressSchema,
};

export const getAddressValidator = (provider?: string) => {
  if (provider && provider in validatorMap) {
    return validatorMap[provider as CourierProvider];
  }
  return allegroAddressSchema;
};

export type AddressSchema = z.infer<typeof baseAddressSchema>;
