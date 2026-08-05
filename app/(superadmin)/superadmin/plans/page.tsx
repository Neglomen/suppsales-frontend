// app/(superadmin)/superadmin/plans/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import {
  Sparkles,
  Loader2,
  Zap,
  Crown,
  Building2,
  Users,
  LayoutGrid,
  MessageSquare,
  RefreshCw,
  Infinity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────
interface PlanFeatures {
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

interface PlanInfo {
  plan: string;
  name: string;
  label: string;
  color: string;
  price_monthly_pln: number | null;
  description: string;
  features: PlanFeatures;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const planColorClasses: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  slate: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    text: "text-slate-300",
    badge: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
  },
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    text: "text-primary",
    badge: "bg-primary/15 text-primary border border-primary/30",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    text: "text-violet-400",
    badge: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  },
};

const planIcons: Record<string, React.ReactNode> = {
  FREE: <Zap className="h-5 w-5" />,
  PRO: <Crown className="h-5 w-5" />,
  ENTERPRISE: <Building2 className="h-5 w-5" />,
};

function LimitValue({ value }: { value: number | null }) {
  if (value === null) return (
    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
      <Infinity className="h-3.5 w-3.5" /> Nielimitowane
    </span>
  );
  if (value === 0) return <span className="text-slate-500">–</span>;
  return <span className="font-semibold text-slate-200">{value.toLocaleString("pl-PL")}</span>;
}

function FeatureBool({ value }: { value: boolean }) {
  return value
    ? <span className="text-emerald-400 text-xs font-bold">✓ Tak</span>
    : <span className="text-slate-600 text-xs">✗ Nie</span>;
}

// ─── Main Component ────────────────────────────────────────────────────
export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const plansRes = await api.get("/superadmin/plans");
      setPlans(plansRes.data);
    } catch {
      toast.error("Błąd podczas wczytywania danych planów.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Plany Subskrypcji</h1>
          </div>
          <p className="text-slate-400 text-sm ml-13">
            Zarządzaj planami subskrypcji oraz limitami dla organizacji w systemie.
          </p>
        </div>
      </div>

      {/* ─── Plans Overview Card ─── */}
      <div className="rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <LayoutGrid className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Dostępne Plany Subskrypcji</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Przegląd funkcji i limitów dostępnych w każdym planie.
              </p>
            </div>
          </div>
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="rounded-xl border-white/10 hover:bg-white/5 text-slate-400"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const colors = planColorClasses[plan.color] ?? planColorClasses.slate;
              return (
                <div
                  key={plan.plan}
                  className={`rounded-xl border p-5 space-y-4 ${colors.border} bg-slate-950/40`}
                >
                  {/* Plan header */}
                  <div className="flex items-center justify-between">
                    <div className={`h-9 w-9 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center ${colors.text}`}>
                      {planIcons[plan.plan]}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                      {plan.label}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-lg font-bold ${colors.text}`}>{plan.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                  </div>

                  <div>
                    {plan.price_monthly_pln !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-bold ${colors.text}`}>
                          {plan.price_monthly_pln === 0 ? "0" : plan.price_monthly_pln.toLocaleString("pl-PL")}
                        </span>
                        <span className="text-slate-400 text-sm">zł / mies.</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 font-medium">Cena indywidualna</p>
                    )}
                  </div>

                  <div className="border-t border-white/5 pt-4 space-y-2.5">
                    {/* Feature booleans */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Sparkles className="h-3 w-3" /> Asystent AI
                      </span>
                      <FeatureBool value={plan.features.ai_assistant} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <MessageSquare className="h-3 w-3" /> Centrum komunikacji
                      </span>
                      <FeatureBool value={plan.features.communication_center} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <RefreshCw className="h-3 w-3" /> Auto-synchronizacja
                      </span>
                      <FeatureBool value={plan.features.auto_sync} />
                    </div>

                    <div className="border-t border-white/5 pt-2 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Limity</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <LayoutGrid className="h-3 w-3" /> Integracje
                        </span>
                        <LimitValue value={plan.features.max_integrations} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Users className="h-3 w-3" /> Użytkownicy
                        </span>
                        <LimitValue value={plan.features.max_members} />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Sparkles className="h-3 w-3" /> Szkice AI / mies.
                        </span>
                        <LimitValue value={plan.features.max_ai_drafts_per_month} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 mt-4 text-center">
            Aby zmienić plan konkretnej organizacji, przejdź do{" "}
            <a href="/superadmin/organizations" className="text-primary hover:underline">Listy organizacji</a>
            {" "}i edytuj wybraną firmę.
          </p>
        </div>
      </div>
    </div>
  );
}
