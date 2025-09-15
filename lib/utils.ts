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
