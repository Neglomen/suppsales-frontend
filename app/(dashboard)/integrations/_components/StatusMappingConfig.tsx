"use client";

import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

interface MarketplaceStatus {
  id: string;
  name: string;
}

interface StatusMappingConfigProps {
  integrationId: number;
}

const FULFILLMENT_STATUSES = [
  { value: "NEW", label: "Nowy (NEW)", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "PROCESSING", label: "W realizacji (PROCESSING)", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "READY_FOR_SHIPMENT", label: "Gotowe do wysłania (READY_FOR_SHIPMENT)", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { value: "SENT", label: "Wysłane (SENT)", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "CANCELLED", label: "Anulowane (CANCELLED)", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
];

export function StatusMappingConfig({ integrationId }: StatusMappingConfigProps) {
  const { watch, setValue } = useFormContext();
  
  // Watch sync_config to read/write mapping
  const syncConfig = watch("sync_config") || {};
  const statusMapping = syncConfig.status_mapping || {};

  const { data: statuses, isLoading, error } = useQuery<MarketplaceStatus[]>({
    queryKey: ["marketplaceStatuses", integrationId],
    queryFn: async () => {
      const res = await api.get(`/service-integrations/${integrationId}/marketplace-statuses`);
      return res.data;
    },
    enabled: !!integrationId,
  });

  // Set default mappings if the field is completely empty when statuses are loaded
  useEffect(() => {
    if (statuses && Object.keys(statusMapping).length === 0) {
      const defaults: Record<string, string> = {};
      statuses.forEach((s) => {
        const idUpper = s.id.toUpperCase();
        // Intelligent defaults for common states
        if (idUpper === "SHIPPING" || idUpper === "READY_FOR_SHIPMENT" || idUpper === "PICKUP_READY") {
          defaults[s.id] = "READY_FOR_SHIPMENT";
        } else if (idUpper === "WAITING_ACCEPTANCE" || idUpper === "NEW") {
          defaults[s.id] = "NEW";
        } else if (idUpper.includes("DEBIT") || idUpper === "PROCESSING" || idUpper === "SUSPENDED") {
          defaults[s.id] = "PROCESSING";
        } else if (idUpper === "SHIPPED" || idUpper === "RECEIVED" || idUpper === "CLOSED" || idUpper === "SENT") {
          defaults[s.id] = "SENT";
        } else if (idUpper === "CANCELED" || idUpper === "CANCELLED" || idUpper === "REFUSED") {
          defaults[s.id] = "CANCELLED";
        }
      });
      if (Object.keys(defaults).length > 0) {
        setValue("sync_config", {
          ...syncConfig,
          status_mapping: defaults,
        }, { shouldDirty: true });
      }
    }
  }, [statuses]);

  const handleStatusChange = (externalStatusId: string, internalStatus: string) => {
    const updatedMapping = {
      ...statusMapping,
      [externalStatusId]: internalStatus,
    };
    setValue("sync_config", {
      ...syncConfig,
      status_mapping: updatedMapping,
    }, { shouldDirty: true });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
        Pobieranie statusów z marketplace...
      </div>
    );
  }

  if (error || !statuses) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
        <Info className="h-4 w-4" />
        Nie udało się pobrać listy statusów z API. Upewnij się, że integracja jest poprawnie skonfigurowana.
      </div>
    );
  }

  if (statuses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Ta integracja nie zwróciła żadnych statusów do zmapowania.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/10">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold tracking-wide">Mapowanie Statusów Zamówień</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Dopasuj statusy z platformy marketplace do standardowych statusów w naszym systemie. 
        Tylko zamówienia zmapowane jako <span className="font-semibold text-blue-400">Nowe</span>,{" "}
        <span className="font-semibold text-amber-400">W realizacji</span> oraz{" "}
        <span className="font-semibold text-orange-400">Gotowe do wysłania</span> pojawią się w Stacji Nabijania.
      </p>

      <div className="rounded-xl border border-border/10 bg-background/50 overflow-hidden shadow-inner">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/10 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3">Status w Marketplace</th>
              <th className="px-4 py-3">Ujednolicony Status (SuppSales)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {statuses.map((status) => {
              const currentVal = statusMapping[status.id] || "";
              const activeStatus = FULFILLMENT_STATUSES.find(s => s.value === currentVal);
              
              return (
                <tr key={status.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {status.name}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={currentVal}
                      onValueChange={(val) => handleStatusChange(status.id, val)}
                    >
                      <SelectTrigger className="w-[280px] bg-background/80 border-border/20 focus:ring-primary/20">
                        <SelectValue placeholder="Wybierz status...">
                          {activeStatus && (
                            <Badge className={`${activeStatus.color} hover:bg-transparent transition-none font-medium text-xs rounded border px-2 py-0.5`}>
                              {activeStatus.label}
                            </Badge>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {FULFILLMENT_STATUSES.map((fs) => (
                          <SelectItem key={fs.value} value={fs.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={`${fs.color} hover:bg-transparent font-medium text-xs rounded border px-2 py-0.5`}>
                                {fs.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
