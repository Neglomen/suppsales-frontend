// app/(superadmin)/superadmin/tickets/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, AlertCircle, Clock, CheckCircle, ArrowRight, Tag, ShieldCheck, HelpCircle } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Ticket {
  id: string;
  title: string;
  status: "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  category: "BUG" | "FEATURE_REQUEST" | "BILLING" | "QUESTION" | "OTHER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  user_id: string;
  user: User;
  organization_id: string | null;
  assigned_to_id: string | null;
  assigned_admin: User | null;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  NEW: { label: "Nowe", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  OPEN: { label: "Otwarte", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  IN_PROGRESS: { label: "W toku", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  RESOLVED: { label: "Rozwiązane", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CLOSED: { label: "Zamknięte", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

const categoryLabels: Record<string, string> = {
  BUG: "Błąd 🐛",
  FEATURE_REQUEST: "Sugestia 💡",
  BILLING: "Rozliczenia 💳",
  QUESTION: "Pytanie ❓",
  OTHER: "Inne 💬",
};

const priorityLabels: Record<string, { label: string; className: string }> = {
  LOW: { label: "Niski", className: "bg-slate-500/10 text-slate-300 border-slate-500/20" },
  MEDIUM: { label: "Średni", className: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  HIGH: { label: "Wysoki", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  CRITICAL: { label: "Krytyczny", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function SuperAdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filtry
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  const fetchTickets = async (pageNum: number) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: pageNum, size: 10 };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const response = await api.get("/superadmin/support", { params });
      setTickets(response.data.items);
      setTotalPages(response.data.pages);
      setTotalItems(response.data.total);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd pobierania zgłoszeń wsparcia");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(page);
  }, [page, statusFilter, categoryFilter, priorityFilter]);

  // Reset do strony 1 przy zmianie filtrów
  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Wszystkie Zgłoszenia Klientów
        </h1>
        <p className="text-slate-400 mt-1">
          Zarządzaj sprawami technicznymi i błędami zgłaszanymi przez użytkowników.
        </p>
      </div>

      {/* Filters bar */}
      <Card className="border-white/5 bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary/50"
              >
                <option value="">Wszystkie</option>
                <option value="NEW">Nowe (New)</option>
                <option value="OPEN">Otwarte (Open)</option>
                <option value="IN_PROGRESS">W toku (In Progress)</option>
                <option value="RESOLVED">Rozwiązane (Resolved)</option>
                <option value="CLOSED">Zamknięte (Closed)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Kategoria</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary/50"
              >
                <option value="">Wszystkie</option>
                <option value="BUG">Błąd systemowy 🐛</option>
                <option value="FEATURE_REQUEST">Sugestia 💡</option>
                <option value="BILLING">Konto / Rozliczenia 💳</option>
                <option value="QUESTION">Zapytanie ❓</option>
                <option value="OTHER">Inne 💬</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Priorytet</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary/50"
              >
                <option value="">Wszystkie</option>
                <option value="LOW">Niski</option>
                <option value="MEDIUM">Średni</option>
                <option value="HIGH">Wysoki</option>
                <option value="CRITICAL">Krytyczny</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Znaleziono zgłoszeń: <strong className="text-slate-200">{totalItems}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card className="border-white/5 bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col gap-4 p-4 rounded-xl border border-white/5 bg-slate-950/20">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-1/4 bg-slate-800" />
                    <Skeleton className="h-5 w-20 bg-slate-800" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28 bg-slate-800" />
                    <Skeleton className="h-4 w-24 bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 space-y-4 border border-dashed border-white/10 rounded-2xl bg-slate-950/10">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-400">
                <Headphones className="h-6 w-6" />
              </div>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Brak zgłoszeń wsparcia odpowiadających wybranym kryteriom filtrowania.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[1fr_180px_130px_120px_120px_130px_140px_50px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/5">
                <div>Temat zgłoszenia</div>
                <div>Zgłaszający</div>
                <div>Kategoria</div>
                <div>Priorytet</div>
                <div>Status</div>
                <div>Przypisany Admin</div>
                <div>Data modyfikacji</div>
                <div className="text-right">Akcja</div>
              </div>

              {tickets.map((ticket) => {
                const status = statusLabels[ticket.status] || { label: ticket.status, className: "" };
                const priority = priorityLabels[ticket.priority] || { label: ticket.priority, className: "" };

                return (
                  <div
                    key={ticket.id}
                    className="grid grid-cols-1 lg:grid-cols-[1fr_180px_130px_120px_120px_130px_140px_50px] gap-4 items-center p-4 rounded-xl border border-white/5 bg-slate-950/20 hover:bg-white/5 transition-colors group"
                  >
                    {/* Temat i ID */}
                    <div className="space-y-1 min-w-0">
                      <Link
                        href={`/superadmin/tickets/${ticket.id}`}
                        className="font-medium text-slate-200 hover:text-primary transition-colors block truncate"
                      >
                        {ticket.title}
                      </Link>
                      <span className="text-[10px] text-slate-500 font-mono">#{ticket.id}</span>
                    </div>

                    {/* Zgłaszający */}
                    <div className="text-xs text-slate-300 min-w-0">
                      <div className="font-semibold truncate">{ticket.user.name || "Użytkownik"}</div>
                      <div className="text-[10px] text-slate-500 truncate">{ticket.user.email}</div>
                    </div>

                    {/* Kategoria */}
                    <div className="text-xs text-slate-300">
                      {categoryLabels[ticket.category] || ticket.category}
                    </div>

                    {/* Priorytet */}
                    <div>
                      <Badge variant="outline" className={`${priority.className} font-medium`}>
                        {priority.label}
                      </Badge>
                    </div>

                    {/* Status */}
                    <div>
                      <Badge variant="outline" className={`${status.className} font-semibold`}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Przypisany Admin */}
                    <div className="text-xs text-slate-300 truncate">
                      {ticket.assigned_admin ? (
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{ticket.assigned_admin.name || ticket.assigned_admin.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">Nieprzypisany</span>
                      )}
                    </div>

                    {/* Data modyfikacji */}
                    <div className="text-[11px] text-slate-400">
                      {new Date(ticket.updated_at).toLocaleString("pl-PL")}
                    </div>

                    {/* Akcja */}
                    <div className="text-right">
                      <Link
                        href={`/superadmin/tickets/${ticket.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-300 hover:bg-primary hover:text-white transition-all group-hover:translate-x-1"
                        title="Otwórz konwersację jako Administrator"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 mt-6 pt-6">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Poprzednia
              </button>
              <span className="text-xs text-slate-400">
                Strona {page} z {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Następna
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
