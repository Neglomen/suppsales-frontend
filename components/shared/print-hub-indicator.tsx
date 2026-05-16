"use client";

import { usePrintHubStore } from "@/store/print-hub";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PrintHubIndicator({ isCollapsed }: { isCollapsed: boolean }) {
  const { status } = usePrintHubStore();

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]";
      case "connecting":
        return "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse";
      case "error":
      case "disconnected":
        return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return "Połączono";
      case "connecting":
        return "Łączenie...";
      case "error":
      case "disconnected":
        return "Odłączony";
      default:
        return "Nieznany";
    }
  };

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
              <Printer className="h-5 w-5 text-muted-foreground" />
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
                  PrintHub
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {getStatusText()}
                </p>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          PrintHub: {getStatusText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
