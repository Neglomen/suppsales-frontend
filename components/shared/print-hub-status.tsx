// suppsales_frontend/src/components/shared/print-hub-status.tsx
"use client";

import { usePrintHubStore } from "@/store/print-hub";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrintHub } from "@/hooks/use-print-hub";

const statusInfo = {
  connecting: { color: "text-yellow-500", label: "Łączenie z Print Hub..." },
  connected: { color: "text-green-500", label: "Połączono z Print Hub." },
  error: {
    color: "text-red-500",
    label: "Błąd połączenia z Print Hub. Uruchom aplikację.",
  },
  disconnected: { color: "text-gray-500", label: "Rozłączono z Print Hub." },
};

export function PrintHubStatus() {
  const { isEnabled, status } = usePrintHub();

  // Nie renderuj niczego, jeśli funkcja jest wyłączona
  if (!isEnabled) {
    return null;
  }

  const { color, label } = statusInfo[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center h-9 w-9">
            <Printer className={cn("h-5 w-5", color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
