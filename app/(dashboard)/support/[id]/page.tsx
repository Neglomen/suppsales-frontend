// app/(dashboard)/support/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, CheckCircle2, Clock, Calendar, HelpCircle, Tag, ShieldCheck, Laptop } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender: User;
  content: string;
  is_internal: boolean;
  attachments: string[];
  created_at: string;
}

interface TicketDetail {
  id: string;
  title: string;
  status: "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  category: "BUG" | "FEATURE_REQUEST" | "BILLING" | "QUESTION" | "OTHER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  url_context: string | null;
  user_agent: string | null;
  viewport_size: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
  messages: Message[];
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

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    try {
      const response = await api.get(`/support/${id}`);
      setTicket(response.data);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Zgłoszenie nie zostało odnalezione.");
      router.push("/support");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (ticket) {
      scrollToBottom();
    }
  }, [ticket?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;

    setSending(true);
    try {
      const response = await api.post(`/support/${id}/messages`, {
        content: reply,
      });
      // Dodajemy nową wiadomość lokalnie, by nie przeładowywać całej strony
      if (ticket) {
        setTicket({
          ...ticket,
          messages: [...ticket.messages, response.data],
          status: "OPEN", // Każda odpowiedź usera otwiera na nowo ticket na OPEN
        });
      }
      setReply("");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd wysyłania wiadomości");
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    try {
      const response = await api.post(`/support/${id}/close`);
      setTicket(response.data);
      toast.success("Zgłoszenie zostało zamknięte.");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd zamykania zgłoszenia");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-24 bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3 bg-slate-200 dark:bg-slate-800" />
            <Skeleton className="h-64 w-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <Skeleton className="h-48 w-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const status = statusLabels[ticket.status] || { label: ticket.status, className: "" };
  const priority = priorityLabels[ticket.priority] || { label: ticket.priority, className: "" };

  return (
    <div className="space-y-6">
      {/* Back navigation & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do historii zgłoszeń
        </Link>
        {ticket.status !== "CLOSED" && (
          <button
            onClick={handleCloseTicket}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all shadow-md shadow-emerald-500/5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Rozwiązałem problem - Zamknij zgłoszenie
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Left Column: Chat and Reply Form */}
        <div className="space-y-6 flex flex-col h-[650px]">
          {/* Chat Window */}
          <Card className="border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col flex-1 overflow-hidden">
            <CardHeader className="border-b border-slate-200 dark:border-white/5 px-6 py-4 flex flex-row items-center gap-4 justify-between shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground dark:text-slate-200 text-base truncate">{ticket.title}</h2>
                <p className="text-xs text-muted-foreground dark:text-slate-500 mt-0.5 font-mono">#{ticket.id}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`${status.className} font-semibold`}>
                  {status.label}
                </Badge>
              </div>
            </CardHeader>

            {/* Conversation Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/10">
              {ticket.messages.map((message) => {
                // Czy autorem jest superadmin / pomoc?
                // Możemy to zweryfikować na podstawie sender_id (czy to id usera ticketu?)
                const isSupport = message.sender_id !== ticket.user_id;

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col max-w-[80%] ${isSupport ? "mr-auto items-start" : "ml-auto items-end"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-muted-foreground dark:text-slate-400">
                      {isSupport && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                      <span className="font-semibold text-foreground dark:text-slate-200">{message.sender.name || message.sender.email}</span>
                      {isSupport && <span className="text-primary dark:text-primary-400 font-bold">(Wsparcie)</span>}
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span>{new Date(message.created_at).toLocaleString("pl-PL")}</span>
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap border ${
                        isSupport
                          ? "bg-slate-100 dark:bg-slate-900/90 text-foreground dark:text-slate-200 border-slate-200 dark:border-white/10 rounded-tl-none"
                          : "bg-primary text-white border-primary/20 rounded-tr-none shadow-lg shadow-primary/10"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            {ticket.status !== "CLOSED" ? (
              <div className="border-t border-slate-200 dark:border-white/5 p-4 shrink-0 bg-slate-50 dark:bg-slate-950/20">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Wpisz swoją odpowiedź..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none transition-colors"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-violet-600 text-white shadow-lg shadow-primary/20 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            ) : (
              <div className="border-t border-slate-200 dark:border-white/5 p-4 shrink-0 bg-slate-100 dark:bg-slate-950/40 text-center text-xs text-muted-foreground">
                🔒 Zgłoszenie zostało zamknięte. Napisanie wiadomości w widgetcie lub ponowny kontakt otworzy nowy wątek.
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Sidebar Meta */}
        <div className="space-y-6">
          {/* Ticket Information Card */}
          <Card className="border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200 dark:border-white/5 px-6 py-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                Metadane zgłoszenia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm">
              {/* Kategoria */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-4 w-4" />
                  Kategoria
                </span>
                <span className="font-semibold text-foreground dark:text-slate-200">
                  {categoryLabels[ticket.category] || ticket.category}
                </span>
              </div>

              {/* Priorytet */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Priorytet
                </span>
                <Badge variant="outline" className={`${priority.className} font-medium`}>
                  {priority.label}
                </Badge>
              </div>

              {/* Data utworzenia */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Utworzono
                </span>
                <span className="text-foreground dark:text-slate-300">
                  {new Date(ticket.created_at).toLocaleDateString("pl-PL")}
                </span>
              </div>

              {/* URL Context (Diagnostyka) */}
              {ticket.url_context && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5" />
                    Ścieżka diagnostyczna
                  </span>
                  <div className="font-mono text-xs rounded bg-slate-100 dark:bg-slate-950 px-2 py-1 text-foreground dark:text-slate-300 truncate" title={ticket.url_context}>
                    {ticket.url_context}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
