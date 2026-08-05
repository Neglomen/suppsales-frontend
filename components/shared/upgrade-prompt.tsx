// components/shared/upgrade-prompt.tsx
"use client";

import { Sparkles, Crown, ArrowRight, Lock } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  /** Kompaktowy inline wariant (np. przycisk z tooltipem) vs pełna karta */
  variant?: "card" | "inline" | "banner";
  requiredPlan?: "PRO" | "ENTERPRISE";
  className?: string;
}

const planLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PRO: {
    label: "Pro",
    color: "text-primary",
    icon: <Crown className="h-3.5 w-3.5" />,
  },
  ENTERPRISE: {
    label: "Enterprise",
    color: "text-violet-400",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
};

// ─── Card variant: full-page / section overlay ────────────────────────
function UpgradeCard({ feature, description, requiredPlan = "PRO" }: UpgradePromptProps) {
  const plan = planLabels[requiredPlan];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Lock className="h-9 w-9 text-primary/70" />
        </div>
        <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-100 mb-2">{feature}</h2>
      <p className="text-slate-400 text-sm max-w-sm mb-1">
        {description || `Ta funkcja jest dostępna od planu ${plan.label}.`}
      </p>

      {/* Plan badge */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mt-4 mb-6 ${plan.color} text-sm font-semibold`}>
        {plan.icon}
        Wymagany plan: {plan.label}
      </div>

      <a
        href="/settings/billing"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
      >
        Zmień plan
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

// ─── Banner variant: horizontal strip inside a card ───────────────────
function UpgradeBanner({ feature, requiredPlan = "PRO" }: UpgradePromptProps) {
  const plan = planLabels[requiredPlan];

  return (
    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">{feature}</p>
          <p className="text-xs text-slate-400">
            Dostępne od planu{" "}
            <span className={`font-bold ${plan.color}`}>{plan.label}</span>
          </p>
        </div>
      </div>
      <a
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0"
      >
        Upgrade
        <ArrowRight className="h-3 w-3" />
      </a>
    </div>
  );
}

// ─── Inline variant: disabled button with tooltip ────────────────────
function UpgradeInline({ feature, requiredPlan = "PRO" }: UpgradePromptProps) {
  const plan = planLabels[requiredPlan];

  return (
    <div className="group relative inline-flex">
      <button
        disabled
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-white/10 text-slate-500 text-sm cursor-not-allowed"
      >
        <Lock className="h-3.5 w-3.5" />
        {feature}
      </button>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
        Dostępne od planu <span className={`font-bold ${plan.color}`}>{plan.label}</span>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────
export function UpgradePrompt({
  variant = "card",
  ...props
}: UpgradePromptProps) {
  if (variant === "banner") return <UpgradeBanner {...props} />;
  if (variant === "inline") return <UpgradeInline {...props} />;
  return <UpgradeCard {...props} />;
}
