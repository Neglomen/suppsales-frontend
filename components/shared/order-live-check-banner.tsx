// components/shared/order-live-check-banner.tsx
"use client";

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LiveCheckResult } from "@/hooks/use-order-live-check";

interface OrderLiveCheckBannerProps {
  isChecking: boolean;
  result: LiveCheckResult | null;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  CANCELLED:  "ANULOWANE",
  RETURNED:   "ZWRÓCONE",
  DISPUTE:    "W SPORZE",
  BOUGHT:     "Opłacone",
  FILLED_IN:  "Wypełnione",
  READY_FOR_SHIPMENT: "Gotowe do wysyłki",
  SENT:       "Wysłane",
  PICKED_UP:  "Odebrane",
};

const getStatusLabel = (status: string | null) =>
  status ? (STATUS_LABELS[status] ?? status) : "—";

export function OrderLiveCheckBanner({
  isChecking,
  result,
  className,
}: OrderLiveCheckBannerProps) {
  // ─── Checking spinner ────────────────────────────────────────────────────
  if (isChecking) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground bg-muted/30 border border-border/20",
          className
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-primary/70" />
        <span>Weryfikacja danych z Allegro...</span>
      </div>
    );
  }

  if (!result) return null;

  // ─── Critical status (CANCELLED / RETURNED / DISPUTE) ────────────────────
  if (result.status_critical) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "rounded-2xl border-2 border-destructive/60 bg-destructive/10 p-4 space-y-3",
            className
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/20 border border-destructive/40 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-destructive leading-tight">
                ZAMÓWIENIE ZMIENIONO STATUS W ALLEGRO
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                Aktualny status:{" "}
                <span className="font-bold">
                  {getStatusLabel(result.allegro_status)}
                </span>
                {result.stored_status && (
                  <>
                    {" "}(poprzednio:{" "}
                    {getStatusLabel(result.stored_status)})
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-destructive/15 border border-destructive/30 px-4 py-3 text-xs text-destructive font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Nie pakuj tej przesyłki. Dane zostały automatycznie zaktualizowane i zalogowane w historii zamówienia.
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Data updated (non-critical) — small success notice ──────────────────
  if (result.has_data_changes) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400",
            className
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Dane zamówienia zostały automatycznie zaktualizowane z Allegro. Zmiana zalogowana w historii.
          </span>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── All OK ───────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          className
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Dane zgodne z Allegro · Ustawiono status &quot;W realizacji&quot;</span>
      </motion.div>
    </AnimatePresence>
  );
}
