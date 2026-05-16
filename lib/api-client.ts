import api from "@/lib/api";
import { SupplierInvoice } from "@/types/invoice";
import { ServiceIntegration } from "@/types/service-integration";

// === INVOICES API ===

type GetInvoicesParams = {
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
  integrationId?: number;
};

export async function getSupplierInvoices(
  params: GetInvoicesParams
): Promise<SupplierInvoice[]> {
  const response = await api.get<SupplierInvoice[]>("/supplier-invoices", {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      limit: params.limit,
      skip: params.skip,
      integrationId: params.integrationId,
    },
  });
  return response.data;
}

export async function downloadInvoicesZip(invoiceIds: string[]): Promise<Blob> {
  const response = await api.post<Blob>(
    "/supplier-invoices/download-zip", // Usunięto ukośnik z końca
    { invoiceIds: invoiceIds }, // axios-case-converter zamieni to na snake_case
    {
      responseType: "blob",
    }
  );
  return response.data;
}

export async function downloadSingleInvoice(invoiceId: string): Promise<Blob> {
  const response = await api.get<Blob>(
    `/supplier-invoices/${invoiceId}/download`,
    {
      responseType: "blob",
    }
  );
  return response.data;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(",")[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function getSingleInvoiceAsBase64(
  invoiceId: string
): Promise<string> {
  const response = await api.get<Blob>(
    `/supplier-invoices/${invoiceId}/download`,
    {
      responseType: "blob",
    }
  );
  return blobToBase64(response.data);
}

export async function getInvoiceKsefXml(invoiceId: string): Promise<string> {
  const response = await api.get<string>(
    `/supplier-invoices/${invoiceId}/ksef-xml`,
    {
      responseType: "text",
    }
  );
  return response.data;
}

export interface TaskResultSummary {
  total: number;
  created: number;
  existed: number;
  skipped: number;
  failed: number;
  details: { invoiceNumber: string; status: string; message: string }[];
}

export interface TaskStatusResponse {
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILURE" | "PARTIAL_FAILURE";
  result?: {
    summary?: TaskResultSummary;
    error?: string;
  };
}

export const getTaskStatus = async (
  taskId: string
): Promise<TaskStatusResponse> => {
  const response = await api.get(`/tasks/${taskId}/status`);
  return response.data;
};

// === ZMIANY PONIŻEJ ===

// Definiujemy nowy, poprawny typ zwrotny w camelCase
export type TaskLaunchResponse = {
  message: string;
  taskId: string;
  actorName: string;
};

export const checkInvoicesInSubiekt = async (
  invoiceIds: string[]
): Promise<TaskLaunchResponse> => {
  // === POPRAWKA: Wysyłamy snake_case ===
  const response = await api.post("/supplier-invoices/check-subiekt-status", {
    invoice_ids: invoiceIds,
  });
  return response.data;
};

export const createInvoicesInSubiekt = async (
  invoiceIds: string[]
): Promise<TaskLaunchResponse> => {
  // === POPRAWKA: Wysyłamy snake_case ===
  const response = await api.post("/supplier-invoices/create-in-subiekt", {
    invoice_ids: invoiceIds,
  });
  return response.data;
};

// === INTEGRACJE ===

export async function getServiceIntegrations(
  category?: string
): Promise<ServiceIntegration[]> {
  const response = await api.get<ServiceIntegration[]>("/service-integrations", {
    params: { category },
  });
  return response.data;
}

export async function triggerKsefSync(
  integrationId: number,
  fromDate?: string,
  toDate?: string
): Promise<{ message: string; task_id: string }> {
  const payload: any = { integration_id: integrationId };
  if (fromDate) payload.date_from = fromDate;
  if (toDate) payload.date_to = toDate;
  const response = await api.post("/ksef/sync", payload);
  return response.data;
}
