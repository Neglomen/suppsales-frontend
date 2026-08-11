// app/(dashboard)/support/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, AlertCircle, Clock, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";
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
  BILLING: "Płatności/Konto 💳",
  QUESTION: "Pytanie ❓",
  OTHER: "Inne 💬",
};

export default function SupportTicketsHistoryPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTickets = async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await api.get("/support", {
        params: { page: pageNum, size: 10 },
      });
      setTickets(response.data.items);
      setTotalPages(response.data.pages);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd wczytywania zgłoszeń wsparcia");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(page);
  }, [page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Twoje Zgłoszenia i Kontakt
          </h1>
          <p className="text-muted-foreground mt-1">
            Historia spraw, zgłoszeń błędów oraz sugestii w kontakcie z administracją.
          </p>
        </div>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-support-widget"));
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-tr from-primary to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:scale-105 transition-all duration-300 shrink-0"
        >
          <Headphones className="h-4.5 w-4.5" />
          Napisz do wsparcia
        </button>
      </div>

      {/* Tickets List */}
      <Card className="border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950/20">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-1/3 bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-5 w-20 bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <Skeleton className="h-4 w-40 bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 space-y-4 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-slate-950/10">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 text-muted-foreground dark:text-slate-400">
                <Headphones className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground dark:text-slate-200">Brak zgłoszeń</h3>
              <p className="text-xs text-muted-foreground dark:text-slate-400 max-w-xs mx-auto">
                Nie masz jeszcze żadnych zgłoszeń. Kliknij przycisk powyżej lub użyj widgetu w prawym rogu, aby opisać błąd lub zadać pytanie.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header column labels for wide screen */}
              <div className="hidden md:grid grid-cols-[1fr_150px_130px_160px_160px_50px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400 border-b border-slate-150 dark:border-white/5">
                <div>Temat zgłoszenia</div>
                <div>Kategoria</div>
                <div>Status</div>
                <div>Odpowiedzialny Admin</div>
                <div>Ostatnia zmiana</div>
                <div className="text-right">Akcja</div>
              </div>

              {tickets.map((ticket) => {
                const status = statusLabels[ticket.status] || { label: ticket.status, className: "" };

                return (
                  <div
                    key={ticket.id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_150px_130px_160px_160px_50px] gap-4 items-center p-4 rounded-xl border border-slate-150 dark:border-white/5 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
                  >
                    {/* Temat */}
                    <div className="space-y-1 min-w-0">
                      <Link
                        href={`/support/${ticket.id}`}
                        className="font-medium text-foreground dark:text-slate-200 hover:text-primary transition-colors block truncate"
                      >
                        {ticket.title}
                      </Link>
                      <span className="text-[10px] text-muted-foreground dark:text-slate-500 font-mono">#{ticket.id}</span>
                    </div>

                    {/* Kategoria */}
                    <div className="text-xs text-foreground/90 dark:text-slate-300">
                      {categoryLabels[ticket.category] || ticket.category}
                    </div>

                    {/* Status */}
                    <div>
                      <Badge variant="outline" className={`${status.className} font-semibold`}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Odpowiedzialny Admin */}
                    <div className="text-xs text-foreground/90 dark:text-slate-300 truncate">
                      {ticket.assigned_admin ? (
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{ticket.assigned_admin.name || "Administrator"}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground dark:text-slate-600">Oczekuje na przypisanie</span>
                      )}
                    </div>

                    {/* Ostatnia zmiana */}
                    <div className="text-[11px] text-muted-foreground dark:text-slate-400">
                      {new Date(ticket.updated_at).toLocaleString("pl-PL")}
                    </div>

                    {/* Akcja */}
                    <div className="text-right">
                      <Link
                        href={`/support/${ticket.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 text-foreground dark:text-slate-300 hover:bg-primary hover:text-white transition-all group-hover:translate-x-1"
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
            <div className="flex items-center justify-between border-t border-slate-150 dark:border-white/5 mt-6 pt-6">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-foreground dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Poprzednia
              </button>
              <span className="text-xs text-muted-foreground dark:text-slate-400">
                Strona {page} z {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-semibold text-foreground dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
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
