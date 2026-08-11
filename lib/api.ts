// src/lib/api.ts
import axios from "axios";
import { useAuthStore } from "@/store/auth";

// Create a new Axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Use an interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    // Get the token from the Zustand store
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add an interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get a 401, the token is invalid or expired, so log the user out.
      useAuthStore.getState().logout();
      // Optionally, redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (detail) {
      if (Array.isArray(detail)) {
        return detail.map((err: any) => `${err.loc?.join(".") || "pole"}: ${err.msg}`).join("; ");
      }
      if (typeof detail === "object") {
        if (detail.error_code === "INSUFFICIENT_STOCK" && Array.isArray(detail.details)) {
          const itemsList = detail.details
            .map((item: any) => `${item.symbol} (wymagane: ${item.required}, dostępne: ${item.available})`)
            .join(", ");
          return `${detail.message || "Brak wystarczającej ilości towaru w magazynie Subiekta"}: ${itemsList}`;
        }
        if ("message" in detail) {
          return String(detail.message);
        }
      }
      return typeof detail === "string" ? detail : error.response?.data?.message || error.message;
    }
    return error.response?.data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error)
    return String((error as any).message);
  return "Wystąpił nieznany błąd";
}

export function getMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase = api.defaults.baseURL || "http://127.0.0.1:8000/api/v1";
  const base = apiBase.replace(/\/api\/v1\/?$/, "");
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${base}${cleanUrl}`;
}

