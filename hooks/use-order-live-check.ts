// hooks/use-order-live-check.ts
"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { MarketplaceOrder } from "@/types/marketplace-order";

export interface LiveCheckResult {
  status_changed: boolean;
  status_critical: boolean;       // CANCELLED / RETURNED / DISPUTE
  allegro_status: string | null;
  stored_status: string | null;
  has_data_changes: boolean;
  diff: Record<string, { stored: any; current: any } | null>;
}

interface UseOrderLiveCheckReturn {
  isChecking: boolean;
  result: LiveCheckResult | null;
}

// Session-scoped cache — keeps track of which order IDs were already checked
// so we don't repeat the call if the user switches back to an already-checked order.
const sessionCheckedIds = new Set<string>();

const DEBOUNCE_MS = 800;

export function useOrderLiveCheck(
  order: MarketplaceOrder | null,
  enabled: boolean
): UseOrderLiveCheckReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<LiveCheckResult | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer on order change
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }

    // Guard: only Allegro orders when feature is enabled
    if (!enabled) return;
    if (!order?.id) return;
    if (order.service_integration?.provider_type !== "ALLEGRO") return;

    // Guard: already checked this order in this browser session
    if (sessionCheckedIds.has(order.id)) return;

    // Debounce — avoids firing when user is quickly scrolling through the list
    debounceTimer.current = setTimeout(async () => {
      setIsChecking(true);
      try {
        const res = await api.get<LiveCheckResult>(
          `/orders/${order.id}/allegro-live-check`,
          { params: { set_in_progress: true } }
        );
        sessionCheckedIds.add(order.id);
        setResult(res.data);
      } catch {
        // Silent fail — network/API errors are ignored per product spec
        sessionCheckedIds.add(order.id); // Mark as checked so we don't retry endlessly
      } finally {
        setIsChecking(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [order?.id, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset result when order changes
  useEffect(() => {
    setResult(null);
  }, [order?.id]);

  return { isChecking, result };
}
