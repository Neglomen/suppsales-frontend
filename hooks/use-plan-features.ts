// hooks/use-plan-features.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────
export interface PlanFeatures {
  ai_assistant: boolean;
  communication_center: boolean;
  auto_sync: boolean;
  response_templates: boolean;
  max_integrations: number | null;
  max_members: number | null;
  max_templates: number | null;
  max_orders_per_month: number | null;
  max_ai_drafts_per_month: number | null;
}

export interface PlanInfo {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  name: string;
  label: string;
  color: string;
  price_monthly_pln: number | null;
  description: string;
  features: PlanFeatures;
}

interface UsePlanFeaturesReturn {
  planInfo: PlanInfo | null;
  isLoading: boolean;
  error: string | null;
  /** Sprawdza czy aktualny plan organizacji ma dostęp do danej funkcji */
  hasFeature: (feature: keyof PlanFeatures) => boolean;
  /** Pobiera limit dla danej funkcji, null = nielimitowane */
  getLimit: (limitKey: keyof PlanFeatures) => number | null;
  /** Czy plan to FREE */
  isFree: boolean;
  /** Czy plan to PRO */
  isPro: boolean;
  /** Czy plan to ENTERPRISE */
  isEnterprise: boolean;
  /** Odświeża dane planu */
  refetch: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────
export function usePlanFeatures(): UsePlanFeaturesReturn {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/organization/plan-info");
      setPlanInfo(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Nie udało się pobrać informacji o planie.";
      setError(msg);
      // Default to FREE plan on error to prevent unauthorized access
      setPlanInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanInfo();
  }, [fetchPlanInfo]);

  const hasFeature = useCallback(
    (feature: keyof PlanFeatures): boolean => {
      if (!planInfo) return false;
      const val = planInfo.features[feature];
      return typeof val === "boolean" ? val : (val !== null && val > 0);
    },
    [planInfo]
  );

  const getLimit = useCallback(
    (limitKey: keyof PlanFeatures): number | null => {
      if (!planInfo) return 0;
      const val = planInfo.features[limitKey];
      return typeof val === "number" ? val : null;
    },
    [planInfo]
  );

  return {
    planInfo,
    isLoading,
    error,
    hasFeature,
    getLimit,
    isFree: planInfo?.plan === "FREE",
    isPro: planInfo?.plan === "PRO",
    isEnterprise: planInfo?.plan === "ENTERPRISE",
    refetch: fetchPlanInfo,
  };
}
