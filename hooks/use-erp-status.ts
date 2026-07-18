import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export interface ErpStatusInfo {
  is_connected: boolean;
  sfera_connected: boolean;
  message: string | null;
}

export function useErpStatus() {
  const authHasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 1. Fetch integrations to check if ERP/Subiekt GT is configured
  const { data: integrations, isLoading: isIntegrationsLoading } = useQuery<any[]>({
    queryKey: ["serviceIntegrationsForStatus"],
    queryFn: async () => (await api.get("/service-integrations")).data,
    enabled: authHasHydrated && isAuthenticated,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  const erpIntegration = integrations?.find((i) => i.provider_type === "SUBIEKT_GT");
  const isConfigured = !!erpIntegration;
  const integrationId = erpIntegration?.id;

  // 2. Fetch the ERP status if configured
  const { data: statusData, isLoading: isStatusLoading } = useQuery<ErpStatusInfo>({
    queryKey: ["erpStatus", integrationId],
    queryFn: async () => {
      const res = await api.get(`/erp-proxy/integrations/${integrationId}/status`);
      return res.data;
    },
    enabled: !!integrationId,
    refetchInterval: 30000, // check every 30 seconds
    refetchOnWindowFocus: true,
  });

  return {
    isConfigured,
    isLoading: isIntegrationsLoading || (isConfigured && isStatusLoading),
    status: statusData || null,
    integrationName: erpIntegration?.name || "Subiekt GT",
  };
}
