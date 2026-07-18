import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const downloadFileFromBase64 = (
  base64String: string,
  fileName: string,
  mimeType: string = "application/pdf"
) => {
  // Usuń ewentualny prefix dataURL, który mógł zostać dodany
  const cleanBase64 = base64String.split(",")[1] || base64String;

  try {
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error("Error downloading file from base64:", error);
    // Można tutaj dodać toast.error, jeśli błąd jest krytyczny
  }
};

export interface ErpItem {
  erpSymbol: string;
  name: string;
  quantity: number;
}

export function explodeBundleItems(
  items: any[], 
  productMappings: Record<string, any>, 
  bundleComponents: Record<string, Array<{ symbol: string; quantity: number }>> | null | undefined
): ErpItem[] {
  const exploded: ErpItem[] = [];

  for (const item of items) {
    const offerId = item.offer?.id || item.product_id;
    const mapping = productMappings?.[offerId] || productMappings?.[item.id];
    if (!mapping) continue;

    const erpSymbol = mapping.erp_product_symbol;
    const components = bundleComponents?.[erpSymbol];

    if (components && components.length > 0) {
      for (const comp of components) {
        exploded.push({
          erpSymbol: comp.symbol,
          name: `[SKŁADNIK] ${comp.symbol}`,
          quantity: item.quantity * comp.quantity,
        });
      }
    } else {
      exploded.push({
        erpSymbol: erpSymbol,
        name: item.offer?.name || item.name || "Produkt",
        quantity: item.quantity,
      });
    }
  }

  return exploded;
}

