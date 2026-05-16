import { MappedOrderDetails, OrderDetailsRead } from "@/types/order-schemas";

const get = (obj: any, snake: string, camel: string): string | undefined => {
  if (obj === null || typeof obj !== "object") return undefined;
  return obj[snake] ?? obj[camel];
};

export const mapOrderToMappedDetails = (
  order: OrderDetailsRead
): MappedOrderDetails => {
  const payload = order.details_payload;

  const deliveryPayload = payload.delivery?.address;
  const deliveryRoot = (order as any).delivery_address || (order as any).deliveryAddress;

  const invoicePayload = payload.invoice?.address;
  const invoiceRoot = (order as any).invoice_address || (order as any).invoiceAddress;
  const invoiceCompanyPayload = invoicePayload?.company;
  const invoicePersonPayload = invoicePayload?.naturalPerson;

  let buyerDetails: MappedOrderDetails["buyerDetails"] = null;
  const hasInvoiceData = invoicePayload || invoiceRoot;

  if (hasInvoiceData) {
    const companyName =
      get(invoiceCompanyPayload, "name", "company_name") ||
      get(invoiceRoot, "companyName", "company_name");
    const addressPart = `${
      get(invoicePayload, "street", "street") ||
      get(invoiceRoot, "street", "street") ||
      ""
    }, ${
      get(invoicePayload, "zipCode", "zip_code") ||
      get(invoiceRoot, "zipCode", "zip_code") ||
      ""
    } ${
      get(invoicePayload, "city", "city") ||
      get(invoiceRoot, "city", "city") ||
      ""
    }`.trim();

    if (companyName) {
      buyerDetails = {
        name: companyName,
        isCompany: true,
        taxId:
          get(invoiceCompanyPayload, "taxId", "tax_id") ||
          get(invoiceRoot, "taxId", "tax_id") ||
          null,
        address: {
          street:
            get(invoicePayload, "street", "street") ||
            get(invoiceRoot, "street", "street"),
          zip_code:
            get(invoicePayload, "zipCode", "zip_code") ||
            get(invoiceRoot, "zipCode", "zip_code"),
          city:
            get(invoicePayload, "city", "city") ||
            get(invoiceRoot, "city", "city"),
        },
        source: "invoice",
      };
    } else {
      const firstName =
        get(invoicePersonPayload, "firstName", "first_name") ||
        get(invoiceRoot, "firstName", "first_name");
      const lastName =
        get(invoicePersonPayload, "lastName", "last_name") ||
        get(invoiceRoot, "lastName", "last_name");
      if (firstName || lastName) {
        buyerDetails = {
          name: `${firstName || ""} ${lastName || ""}`.trim(),
          isCompany: false,
          taxId: null,
          address: {
            street:
              get(invoicePayload, "street", "street") ||
              get(invoiceRoot, "street", "street"),
            zip_code:
              get(invoicePayload, "zipCode", "zip_code") ||
              get(invoiceRoot, "zipCode", "zip_code"),
            city:
              get(invoicePayload, "city", "city") ||
              get(invoiceRoot, "city", "city"),
          },
          source: "invoice",
        };
      }
    }
  }

  if (!buyerDetails && (deliveryPayload || deliveryRoot)) {
    // Fallback na dane dostawy
    const addressPart = `${
      get(deliveryPayload, "street", "street") ||
      get(deliveryRoot, "street", "street") ||
      ""
    }, ${
      get(deliveryPayload, "zipCode", "zip_code") ||
      get(deliveryRoot, "zipCode", "zip_code") ||
      ""
    } ${
      get(deliveryPayload, "city", "city") ||
      get(deliveryRoot, "city", "city") ||
      ""
    }`.trim();
    const firstName =
      get(deliveryPayload, "firstName", "first_name") ||
      get(deliveryRoot, "firstName", "first_name");
    const lastName =
      get(deliveryPayload, "lastName", "last_name") ||
      get(deliveryRoot, "lastName", "last_name");
    buyerDetails = {
      name: `${firstName || ""} ${lastName || ""}`.trim(),
      isCompany: !!(
        get(deliveryPayload, "companyName", "company_name") ||
        get(deliveryRoot, "companyName", "company_name")
      ),
      taxId:
        get(deliveryPayload, "taxId", "tax_id") ||
        get(deliveryRoot, "taxId", "tax_id") ||
        null,
      address: {
        street:
          get(invoicePayload, "street", "street") ||
          get(invoiceRoot, "street", "street"),
        zip_code:
          get(invoicePayload, "zipCode", "zip_code") ||
          get(invoiceRoot, "zipCode", "zip_code"),
        city:
          get(invoicePayload, "city", "city") ||
          get(invoiceRoot, "city", "city"),
      },
      source: "delivery",
    };
  }

  let deliveryDetails: MappedOrderDetails["deliveryDetails"] = null;
  if (deliveryPayload || deliveryRoot) {
    deliveryDetails = {
      methodName: payload.delivery?.method?.name || "Brak informacji",
      isPickupPoint: !!payload.delivery?.pickupPoint,
      pickupPointName: payload.delivery?.pickupPoint?.name,
      address: {
        first_name:
          get(deliveryPayload, "firstName", "first_name") ||
          get(deliveryRoot, "firstName", "first_name"),
        last_name:
          get(deliveryPayload, "lastName", "last_name") ||
          get(deliveryRoot, "lastName", "last_name"),
        street:
          get(deliveryPayload, "street", "street") ||
          get(deliveryRoot, "street", "street"),
        zip_code:
          get(deliveryPayload, "zipCode", "zip_code") ||
          get(deliveryRoot, "zipCode", "zip_code"),
        city:
          get(deliveryPayload, "city", "city") ||
          get(deliveryRoot, "city", "city"),
        company_name:
          get(deliveryPayload, "companyName", "company_name") ||
          get(deliveryRoot, "companyName", "company_name"),
        phone_number:
          get(deliveryPayload, "phoneNumber", "phone_number") ||
          get(deliveryRoot, "phoneNumber", "phone_number"),
      },
    };
  }

  const deliveryCost: MappedOrderDetails["deliveryCost"] = {
    amount: parseFloat(payload.delivery?.cost?.amount || "0"),
    currency: payload.delivery?.cost?.currency || "PLN",
  };

  // === Normalizacja lineItems: priorytet na znormalizowane pola z DB ===
  const rawLineItems = order.line_items || payload.lineItems || [];
  const lineItems = rawLineItems.map((item: any) => ({
    id: item.id,
    name: item.offer?.name || item.name || "Brak nazwy",
    quantity: item.quantity || 1,
    price: item.price
      ? `${item.price.amount || item.price} ${item.price.currency || "PLN"}`
      : "0.00 PLN",
    offerId: item.offer?.id || item.product_id || null,
  }));

  return {
    buyerDetails,
    deliveryDetails,
    deliveryCost,
    lineItems,
    payment: {
      type: (order as any).payment_type || payload.payment?.type,
      provider: payload.payment?.provider,
      status: (order as any).payment_status || (payload.payment?.finishedAt ? "COMPLETED" : "PENDING"),
      total: order.total_to_pay
        ? `${Number(order.total_to_pay).toFixed(2)} PLN`
        : `${payload.summary?.totalToPay?.amount || "0.00"} ${
            payload.summary?.totalToPay?.currency || "PLN"
          }`,
    },
  };
  // === KONIEC POPRAWKI ===
};
