"use client";

import { useErpStatus } from "@/hooks/use-erp-status";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ErpStatusIndicator({ isCollapsed }: { isCollapsed: boolean }) {
  const { isConfigured, isLoading, status, integrationName } = useErpStatus();

  if (!isConfigured) {
    return null;
  }

  const getStatusColor = () => {
    if (isLoading && !status) {
      return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse";
    }
    if (!status || !status.is_connected) {
      return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    }
    if (status.is_connected && !status.sfera_connected) {
      return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse";
    }
    if (status.is_connected && status.sfera_connected) {
      return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
    }
    return "bg-gray-500";
  };

  const getStatusText = () => {
    if (isLoading && !status) {
      return "Sprawdzanie...";
    }
    if (!status || !status.is_connected) {
      return "Odłączony";
    }
    if (status.is_connected && !status.sfera_connected) {
      return "Brak Sfery";
    }
    if (status.is_connected && status.sfera_connected) {
      return "Połączono";
    }
    return "Nieznany";
  };

  const getTooltipText = () => {
    const mainText = `${integrationName}: ${getStatusText()}`;
    if (status?.message && !status.is_connected) {
      return `${mainText} (${status.message})`;
    }
    if (status?.is_connected && !status.sfera_connected) {
      return `${mainText} (Agent online, brak Sfery)`;
    }
    return mainText;
  };

  const isFullyConnected = status?.is_connected && status?.sfera_connected;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center rounded-xl p-2 transition-all duration-300 hover:bg-white/5 cursor-pointer glass",
              isCollapsed ? "justify-center w-10 h-10" : "gap-3 w-full"
            )}
          >
            <div className="relative flex items-center justify-center">
              <Database className="h-5 w-5 text-muted-foreground" />
              {isFullyConnected && (
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3 rounded-full bg-green-500/60 animate-ping" />
              )}
              {status?.is_connected && !status?.sfera_connected && (
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3 rounded-full bg-yellow-500/60 animate-ping" />
              )}
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-3 w-3 rounded-full border-2 border-background",
                  getStatusColor()
                )}
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-none">
                  {integrationName}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {getStatusText()}
                </p>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
