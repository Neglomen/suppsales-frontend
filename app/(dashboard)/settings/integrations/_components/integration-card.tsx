"use client";

import { cn } from "@/lib/utils";
import { ServiceIntegration } from "@/types/service-integration";
import { AlertCircle, MessageSquareReply } from "lucide-react";
import {
  ABIcon,
  AllegroIcon,
  BaseLinkerIcon,
  SubiektIcon,
  SuusIcon,
} from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IntegrationCardProps {
  integration: ServiceIntegration;
  onManageClick: (integration: ServiceIntegration) => void;
  onReconnectClick: (integrationId: number) => void;
}

import { KsefIcon } from "@/components/shared/ksef-icon";
import { Package } from "lucide-react";

export const IntegrationCard = ({
  integration,
  onManageClick,
  onReconnectClick,
}: IntegrationCardProps) => {
  const providerIcons = {
    ALLEGRO: <AllegroIcon width={96} height={32} className="drop-shadow-lg" />,
    BASELINKER: <BaseLinkerIcon className="w-28 h-auto drop-shadow-lg" />,
    SUUS: <SuusIcon className="w-32 h-auto drop-shadow-lg" />,
    AB: <ABIcon className="h-10 w-auto drop-shadow-lg" />,
    SUBIEKT_GT: <SubiektIcon className="w-24 h-auto drop-shadow-lg" />,
    KSEF: <KsefIcon className="w-24 h-auto drop-shadow-lg" />,
    APACZKA: <Package className="w-12 h-12 text-primary drop-shadow-lg" />,
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border/20 glass-dark p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] hover:-translate-y-1 overflow-hidden",
        !integration.is_active &&
          "border-destructive/30 bg-destructive/5 hover:border-destructive/60 hover:shadow-[0_0_30px_-5px_hsl(var(--destructive)/0.3)]"
      )}
    >
      {/* Dekoracyjny gradient w tle (widoczny przy hoverze) */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10 flex-grow">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center justify-center p-3 rounded-xl bg-background/50 border border-border/10 shadow-inner h-16 min-w-[120px]">
            {
              providerIcons[
                integration.provider_type as keyof typeof providerIcons
              ]
            }
          </div>
          {!integration.is_active && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Połączenie wygasło lub jest nieprawidłowe.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <h3 className="text-lg font-bold tracking-tight mt-3">{integration.name}</h3>
        <p className="text-sm text-muted-foreground/80 font-medium truncate mt-1">
          {integration.is_active && integration.external_user_id ? (
            <>
              Konto:{" "}
              <span className="text-foreground">
                {integration.external_user_id}
              </span>
            </>
          ) : (
            integration.provider_type
          )}
        </p>
      </div>

      <div className="relative z-10 mt-6 pt-5 border-t border-border/10">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Zadania
        </p>
        <div className="flex flex-wrap gap-2">
          {integration.sync_orders ? (
            <Badge variant="outline" className="bg-background/40 border-primary/30 text-primary">Zamówienia</Badge>
          ) : (
            <Badge variant="secondary" className="opacity-60">Zamówienia (wył.)</Badge>
          )}
          {integration.provider_type === "ALLEGRO" &&
            (integration.sync_messages ? (
              <Badge variant="outline" className="bg-background/40 border-primary/30 text-primary">Wiadomości</Badge>
            ) : (
              <Badge variant="secondary" className="opacity-60">Wiadomości (wył.)</Badge>
            ))}
          {integration.provider_type === "ALLEGRO" &&
            (integration.sync_returns ? (
              <Badge variant="outline" className="bg-background/40 border-primary/30 text-primary">Zwroty</Badge>
            ) : (
              <Badge variant="secondary" className="opacity-60">Zwroty (wył.)</Badge>
            ))}
          {integration.provider_type === "ALLEGRO" &&
            integration.autoresponder_enabled && (
              <Badge
                variant="default"
                className="bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20"
              >
                <MessageSquareReply className="mr-1.5 h-3.5 w-3.5" />
                Autoresponder
              </Badge>
            )}
          {integration.provider_type === "SUBIEKT_GT" && (
            <Badge variant="outline" className="bg-background/40 border-primary/30 text-primary">Faktury</Badge>
          )}
        </div>
      </div>

      <div className="relative z-10 flex justify-between items-center mt-6">
        <Badge 
          variant={integration.is_active ? "success" : "destructive"}
          className={cn(
            "px-2.5 py-1 text-xs font-semibold",
            integration.is_active ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/30" : ""
          )}
        >
          {integration.is_active ? "Aktywna" : "Wymaga uwagi"}
        </Badge>
        <div className="flex gap-2">
          {integration.is_active && integration.provider_type === "ALLEGRO" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReconnectClick(integration.id)}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              Odśwież autoryzację
            </Button>
          )}
          {integration.is_active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onManageClick(integration)}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              Zarządzaj
            </Button>
          ) : integration.provider_type === "ALLEGRO" ? (
            <Button onClick={() => onReconnectClick(integration.id)} size="sm" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Połącz ponownie
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onManageClick(integration)}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              Popraw konfigurację
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
