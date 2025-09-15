import { z } from "zod";

// Definiujemy stałe dla typów dostawców, aby uniknąć "magicznych stringów" w kodzie.
export const COURIER_PROVIDERS = {
  ALLEGRO: "ALLEGRO",
  SUUS: "SUUS",
} as const;

export type CourierProvider = keyof typeof COURIER_PROVIDERS;

// Wspólne, czytelne komunikaty o błędach w języku polskim.
const requiredError = "To pole jest wymagane.";
const invalidEmailError = "Wprowadź poprawny adres e-mail.";
const postalCodeRegex = /^\d{2}-\d{3}$/;
const invalidPostalCodeError =
  "Wprowadź poprawny polski kod pocztowy (np. 12-345).";
const phoneRegex = /^(?:\+?48)?(?:[ ]?)?(?:\d{3}(?:[ -]?)){2}\d{3}$/;
const invalidPhoneError = "Wprowadź poprawny 9-cyfrowy numer telefonu.";

// Poprawka 3: Tworzymy bazowy schemat dla samego stringa email
const baseEmailSchema = z.string().email(invalidEmailError);

/**
 * Bazowy schemat walidacji adresu.
 * Zawiera reguły wspólne dla wszystkich kurierów.
 */
const baseAddressSchema = z.object({
  name: z.string().min(3, "Imię i nazwisko lub nazwa firmy są wymagane."),
  street: z.string().min(3, "Ulica i numer są wymagane."),
  postalCode: z
    .string()
    .regex(
      /^\d{2}-\d{3}$/,
      "Nieprawidłowy format kodu pocztowego (np. 12-345)."
    ),
  city: z.string().min(2, "Miasto jest wymagane."),
  phone: z.string().min(9, "Numer telefonu jest wymagany."),
  email: z
    .string()
    .email("Nieprawidłowy adres e-mail.")
    .optional()
    .or(z.literal("")),
});

/**
 * Schemat walidacji dla Allegro (WzA).
 * Zakładamy bardziej liberalne limity długości pól.
 */
const allegroAddressSchema = baseAddressSchema.extend({
  name: baseAddressSchema.shape.name.max(
    100,
    "Imię i nazwisko może mieć maksymalnie 100 znaków."
  ),
  street: baseAddressSchema.shape.street.max(
    255,
    "Ulica i numer mogą mieć maksymalnie 255 znaków."
  ),
  city: baseAddressSchema.shape.city.max(
    100,
    "Miasto może mieć maksymalnie 100 znaków."
  ),
  phone: baseAddressSchema.shape.phone.transform((val) =>
    val.replace(/[\s-]/g, "")
  ),
});

/**
 * Schemat walidacji dla SUUS.
 * SUUS ma bardzo restrykcyjne limity na długość pól.
 */
const suusAddressSchema = baseAddressSchema.extend({
  name: baseAddressSchema.shape.name.max(
    100,
    "Imię i nazwisko dla SUUS może mieć maksymalnie 100 znaków."
  ),
  street: baseAddressSchema.shape.street.max(
    50,
    "Ulica i numer dla SUUS mogą mieć maksymalnie 50 znaków."
  ),
  city: baseAddressSchema.shape.city.max(
    50,
    "Miasto dla SUUS może mieć maksymalnie 50 znaków."
  ),
  phone: baseAddressSchema.shape.phone
    .max(
      30,
      "Numer telefonu dla SUUS może mieć maksymalnie 30 znaków (wraz ze spacjami/myślnikami)."
    )
    .transform((val) => val.replace(/[\s-]/g, "")),
  // Poprawka 3: Zaczynamy od czystego `baseEmailSchema`, dodajemy `.max()`, a dopiero potem `.optional().or(...)`
  email: baseEmailSchema
    .max(100, "Email dla SUUS może mieć maksymalnie 100 znaków.")
    .optional()
    .or(z.literal("")),
});

// Mapa przechowująca schematy walidacji dla każdego dostawcy.
const validatorMap = {
  [COURIER_PROVIDERS.ALLEGRO]: allegroAddressSchema,
  [COURIER_PROVIDERS.SUUS]: suusAddressSchema,
};

/**
 * Funkcja fabryczna zwracająca odpowiedni schemat walidacji Zod na podstawie
 * typu dostawcy kuriera.
 * @param provider - Typ dostawcy (np. 'ALLEGRO', 'SUUS').
 * @returns Odpowiedni schemat Zod lub bazowy schemat, jeśli nie znaleziono dopasowania.
 */
export const getAddressValidator = (provider?: string) => {
  if (provider && provider in validatorMap) {
    return validatorMap[provider as CourierProvider];
  }
  // Fallback: Zwracamy schemat Allegro jako domyślny, ponieważ jest bardziej liberalny.
  return allegroAddressSchema;
};

// Eksportujemy typ na podstawie bazowego schematu.
export type AddressSchema = z.infer<typeof baseAddressSchema>;
