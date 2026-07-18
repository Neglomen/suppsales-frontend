// src/app/(dashboard)/superadmin/page.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Users,
  PlugZap,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Loader2,
  Sparkles,
  Zap,
  Headphones,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface DashboardStats {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  active_users: number;
  active_integrations: number;
  plans: {
    FREE: number;
    PRO: number;
    ENTERPRISE: number;
  };
}

interface RecentOrg {
  id: string;
  name: string;
  is_active: boolean;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  created_at?: string;
}

interface Ticket {
  id: string;
  title: string;
  status: "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  user: {
    name: string | null;
    email: string;
  };
  updated_at: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  NEW: { label: "Nowe", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  OPEN: { label: "Otwarte", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  IN_PROGRESS: { label: "W toku", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  RESOLVED: { label: "Rozwiązane", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CLOSED: { label: "Zamknięte", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const priorityLabels: Record<string, { label: string; className: string }> = {
  LOW: { label: "Niski", className: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
  MEDIUM: { label: "Średni", className: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  HIGH: { label: "Wysoki", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  CRITICAL: { label: "Krytyczny", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrgs, setRecentOrgs] = useState<RecentOrg[]>([]);
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !user.is_super_admin) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await api.get<DashboardStats>("/superadmin/dashboard-stats");
        setStats(statsRes.data);

        const orgsRes = await api.get<RecentOrg[]>("/superadmin/organizations");
        // We take the first 5 organizations as recent ones
        setRecentOrgs(orgsRes.data.slice(0, 5));

        const ticketsRes = await api.get<Ticket[]>("/superadmin/support/pending");
        setPendingTickets(ticketsRes.data.slice(0, 5));
      } catch (err) {
        toast.error("Nie udało się pobrać statystyk panelu admina.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.is_super_admin) {
      fetchDashboardData();
    }
  }, [user]);

  if (!user?.is_super_admin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const planTotal = (stats?.plans.FREE || 0) + (stats?.plans.PRO || 0) + (stats?.plans.ENTERPRISE || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full">
              System Console
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 premium-gradient-text">
            Pulpit Super Admina
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Globalne statystyki, stan systemu oraz administracja podmiotami klientów.
          </p>
        </div>

        <Button asChild className="rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 text-white">
          <Link href="/superadmin/organizations">
            Zarządzaj firmami <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Orgs */}
        <Card className="glass border-white/5 bg-slate-900/30 shadow-lg relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none transition-all group-hover:bg-primary/10" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">Firmy / Organizacje</CardTitle>
            <Building className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-100">{stats?.total_organizations}</div>
            <p className="text-xs text-slate-500 mt-1">
              Aktywne: <span className="text-emerald-500 font-semibold">{stats?.active_organizations}</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Users */}
        <Card className="glass border-white/5 bg-slate-900/30 shadow-lg relative overflow-hidden group hover:border-purple-600/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-3xl rounded-full pointer-events-none transition-all group-hover:bg-purple-600/10" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">Wszyscy Użytkownicy</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-100">{stats?.total_users}</div>
            <p className="text-xs text-slate-500 mt-1">
              Aktywni: <span className="text-emerald-500 font-semibold">{stats?.active_users}</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Integrations */}
        <Card className="glass border-white/5 bg-slate-900/30 shadow-lg relative overflow-hidden group hover:border-pink-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-3xl rounded-full pointer-events-none transition-all group-hover:bg-pink-500/10" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">Aktywne Integracje</CardTitle>
            <PlugZap className="h-5 w-5 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-100">{stats?.active_integrations}</div>
            <p className="text-xs text-slate-500 mt-1">Statusy połączeń ERP & Marketplace</p>
          </CardContent>
        </Card>

        {/* Card 4: Plan Premium */}
        <Card className="glass border-white/5 bg-slate-900/30 shadow-lg relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none transition-all group-hover:bg-amber-500/10" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">Przychód / Plany PRO</CardTitle>
            <Zap className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-100">
              {((stats?.plans.PRO || 0) + (stats?.plans.ENTERPRISE || 0))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              PRO/ENT: <span className="text-amber-500 font-semibold">{Math.round((((stats?.plans.PRO || 0) + (stats?.plans.ENTERPRISE || 0)) / (planTotal || 1)) * 100)}%</span> wszystkich
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Visuals & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan distribution visual */}
        <Card className="glass border-white/5 bg-slate-900/20 col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-200">Struktura Planów</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Rozkład pakietów subskrypcyjnych firm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* FREE plan progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">FREE</span>
                <span className="text-slate-200">{stats?.plans.FREE || 0} ({Math.round(((stats?.plans.FREE || 0) / (planTotal || 1)) * 100)}%)</span>
              </div>
              <div className="h-2 w-full bg-slate-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-500"
                  style={{ width: `${((stats?.plans.FREE || 0) / (planTotal || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* PRO plan progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-primary">PRO</span>
                <span className="text-slate-200">{stats?.plans.PRO || 0} ({Math.round(((stats?.plans.PRO || 0) / (planTotal || 1)) * 100)}%)</span>
              </div>
              <div className="h-2 w-full bg-slate-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${((stats?.plans.PRO || 0) / (planTotal || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* ENTERPRISE plan progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-purple-500">ENTERPRISE</span>
                <span className="text-slate-200">{stats?.plans.ENTERPRISE || 0} ({Math.round(((stats?.plans.ENTERPRISE || 0) / (planTotal || 1)) * 100)}%)</span>
              </div>
              <div className="h-2 w-full bg-slate-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${((stats?.plans.ENTERPRISE || 0) / (planTotal || 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent organizations list */}
        <Card className="glass border-white/5 bg-slate-900/20 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-200">Najnowsze Rejestracje</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Ostatnio utworzone konta firmowe</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-slate-400 hover:text-primary">
              <Link href="/superadmin/organizations">Więcej</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrgs.length > 0 ? (
              <div className="divide-y divide-white/5">
                {recentOrgs.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-slate-950/40 flex items-center justify-center border border-white/5 text-slate-300 font-bold text-[10px] shrink-0">
                        {org.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">{org.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">ID: {org.id.slice(0, 6)}...</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={`rounded-lg text-[9px] px-1.5 py-0.5 border ${
                          org.plan === "ENTERPRISE"
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                            : org.plan === "PRO"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {org.plan}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`rounded-lg text-[9px] px-1.5 py-0.5 border ${
                          org.is_active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {org.is_active ? "Aktywna" : "Nieaktywna"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="h-8 w-8 text-slate-700 mx-auto mb-2 animate-bounce" />
                <div className="text-xs font-semibold text-slate-400">Brak zarejestrowanych firm</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Support Tickets list */}
        <Card className="glass border-white/5 bg-slate-900/20 col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-200">Zgłoszenia oczekujące</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Wymagające reakcji lub odpowiedzi</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-slate-400 hover:text-primary">
              <Link href="/superadmin/tickets">Więcej</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTickets.length > 0 ? (
              <div className="divide-y divide-white/5">
                {pendingTickets.map((ticket) => {
                  const priority = priorityLabels[ticket.priority] || { label: ticket.priority, className: "" };
                  const status = statusLabels[ticket.status] || { label: ticket.status, className: "" };
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => router.push(`/superadmin/tickets/${ticket.id}`)}
                      className="px-4 py-3 flex flex-col gap-1.5 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate flex-1" title={ticket.title}>
                          {ticket.title}
                        </div>
                        <Badge
                          variant="outline"
                          className={`rounded-lg text-[9px] px-1.5 py-0.5 border shrink-0 ${priority.className}`}
                        >
                          {priority.label}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <div className="truncate max-w-[120px]">
                          {ticket.user?.name || ticket.user?.email || "Klient"}
                        </div>
                        <div className="font-mono">
                          {new Date(ticket.updated_at).toLocaleDateString("pl-PL", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <Headphones className="h-8 w-8 text-slate-700 mx-auto mb-2 text-emerald-500 animate-pulse" />
                <div className="text-xs font-semibold text-slate-400">Brak oczekujących spraw</div>
                <p className="text-[10px] text-slate-500 mt-1">Wszystkie zgłoszenia są obsłużone! Dobra robota.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
