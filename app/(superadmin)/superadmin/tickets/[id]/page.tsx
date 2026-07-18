// app/(superadmin)/superadmin/tickets/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, ShieldCheck, CheckCircle2, User, HelpCircle, AlertCircle, FileText, Monitor, Globe } from "lucide-react";
import api, { getErrorMessage } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender: UserProfile;
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
  user_id: string;
  user: UserProfile;
  organization_id: string | null;
  assigned_to_id: string | null;
  assigned_admin: UserProfile | null;
  url_context: string | null;
  user_agent: string | null;
  viewport_size: string | null;
  system_metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  messages: Message[];
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

const categoryLabels: Record<string, string> = {
  BUG: "Błąd 🐛",
  FEATURE_REQUEST: "Sugestia 💡",
  BILLING: "Rozliczenia 💳",
  QUESTION: "Pytanie ❓",
  OTHER: "Inne 💬",
};

export default function SuperAdminTicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentAdmin } = useAuthStore();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Send message
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // Scroll to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = async () => {
    try {
      const response = await api.get(`/superadmin/support/${id}`);
      setTicket(response.data);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd ładowania szczegółów zgłoszenia");
      router.push("/superadmin/tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.post(`/superadmin/support/${id}/messages`, {
        content: newMessage,
        is_internal: isInternal,
      });
      setNewMessage("");
      // Odśwież dane
      await fetchTicketDetails();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd wysyłania odpowiedzi");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await api.put(`/superadmin/support/${id}`, { status });
      toast.success("Status zgłoszenia został zaktualizowany.");
      fetchTicketDetails();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd aktualizacji statusu");
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    try {
      await api.put(`/superadmin/support/${id}`, { priority });
      toast.success("Priorytet zgłoszenia został zaktualizowany.");
      fetchTicketDetails();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd aktualizacji priorytetu");
    }
  };

  const handleAssignToMe = async () => {
    if (!currentAdmin) return;
    try {
      await api.put(`/superadmin/support/${id}`, { assigned_to_id: currentAdmin.id });
      toast.success("Zgłoszenie zostało przypisane do Ciebie.");
      fetchTicketDetails();
    } catch (err) {
      toast.error(getErrorMessage(err) || "Błąd przypisywania zgłoszenia");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/superadmin/tickets" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm text-slate-400">Powrót do zgłoszeń</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[400px] bg-slate-900/50 rounded-xl border border-white/5 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-[200px] bg-slate-900/50 rounded-xl border border-white/5 animate-pulse" />
            <div className="h-[200px] bg-slate-900/50 rounded-xl border border-white/5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/superadmin/tickets"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót do listy zgłoszeń
        </Link>
        <Badge variant="outline" className="font-mono text-[10px] text-slate-500 bg-slate-950/40 border-white/5">
          Zgłoszenie #{ticket.id}
        </Badge>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Chat Thread & Title */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Title Card */}
          <Card className="border-white/5 bg-slate-900/40 backdrop-blur-xl">
            <CardHeader className="p-6">
              <div className="flex flex-wrap gap-2 items-center mb-2">
                <Badge variant="outline" className={`${statusLabels[ticket.status]?.className} font-semibold`}>
                  {statusLabels[ticket.status]?.label || ticket.status}
                </Badge>
                <Badge variant="outline" className={`${priorityLabels[ticket.priority]?.className} font-medium`}>
                  Priorytet: {priorityLabels[ticket.priority]?.label || ticket.priority}
                </Badge>
                <Badge variant="outline" className="bg-slate-950/50 text-slate-300 border-white/5">
                  Kategoria: {categoryLabels[ticket.category] || ticket.category}
                </Badge>
              </div>
              <CardTitle className="text-xl md:text-2xl text-slate-100 font-bold leading-tight">
                {ticket.title}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Conversation Thread */}
          <Card className="border-white/5 bg-slate-900/40 backdrop-blur-xl flex flex-col h-[500px]">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ticket.messages.map((message) => {
                const isAdminMessage = message.sender_id !== ticket.user_id;

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col max-w-[85%] rounded-2xl p-4 space-y-2 border ${
                      message.is_internal
                        ? "ml-auto bg-amber-500/10 border-amber-500/20 text-amber-100"
                        : isAdminMessage
                        ? "ml-auto bg-primary/10 border-primary/20 text-slate-100"
                        : "mr-auto bg-slate-950/40 border-white/5 text-slate-100"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1">
                        {message.is_internal ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        ) : isAdminMessage ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-[10px] font-bold text-slate-400 truncate">
                          {message.is_internal ? "Notatka wewnętrzna" : message.sender.name || message.sender.email}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500">
                        {new Date(message.created_at).toLocaleString("pl-PL")}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-white/5 bg-slate-950/20 rounded-b-xl">
              <form onSubmit={handleSendMessage} className="space-y-3">
                {/* Mode Selector Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInternal(false)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      !isInternal
                        ? "bg-primary text-white border-primary"
                        : "bg-white/5 text-slate-400 border-white/10 hover:text-slate-200"
                    }`}
                  >
                    Odpowiedź do klienta
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInternal(true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      isInternal
                        ? "bg-amber-500 text-black border-amber-500 font-bold"
                        : "bg-white/5 text-slate-400 border-white/10 hover:text-slate-200"
                    }`}
                  >
                    Notatka wewnętrzna (Admin-Only)
                  </button>
                </div>

                <div className="flex gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      isInternal
                        ? "Wpisz wewnętrzną notatkę techniczną (klient jej nie zobaczy)..."
                        : "Napisz odpowiedź do klienta..."
                    }
                    className="flex-1 min-h-[50px] max-h-[150px] rounded-xl border border-white/10 bg-slate-900 p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/50"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="self-end h-10 w-10 shrink-0"
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>

        {/* Right Column: Sidebar (Actions, Diagnostics, User info) */}
        <div className="space-y-6">
          
          {/* Action Card */}
          <Card className="border-white/5 bg-slate-900/40 backdrop-blur-xl">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Parametry Zgłoszenia
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Status Select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary/50"
                >
                  <option value="NEW">Nowe (New)</option>
                  <option value="OPEN">Otwarte (Open)</option>
                  <option value="IN_PROGRESS">W toku (In Progress)</option>
                  <option value="RESOLVED">Rozwiązane (Resolved)</option>
                  <option value="CLOSED">Zamknięte (Closed)</option>
                </select>
              </div>

              {/* Priority Select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Priorytet</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handleUpdatePriority(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-primary/50"
                >
                  <option value="LOW">Niski</option>
                  <option value="MEDIUM">Średni</option>
                  <option value="HIGH">Wysoki</option>
                  <option value="CRITICAL">Krytyczny</option>
                </select>
              </div>

              {/* Assignee Details */}
              <div className="flex flex-col gap-1 border-t border-white/5 pt-3">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Opiekun sprawy</label>
                {ticket.assigned_admin ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-white/5 bg-slate-950/20 mt-1">
                    <div className="text-xs truncate">
                      <div className="font-semibold text-slate-200 truncate">{ticket.assigned_admin.name || "Administrator"}</div>
                      <div className="text-[10px] text-slate-500 truncate">{ticket.assigned_admin.email}</div>
                    </div>
                    {ticket.assigned_admin.id !== currentAdmin?.id && (
                      <Button onClick={handleAssignToMe} variant="ghost" size="sm" className="text-[10px] h-7 px-2 shrink-0">
                        Przejmij
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <p className="text-xs text-slate-500 italic">Brak przypisanego opiekuna</p>
                    <Button onClick={handleAssignToMe} size="sm" className="w-full text-xs font-semibold h-8">
                      Przypisz do mnie
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User & Organization Details */}
          <Card className="border-white/5 bg-slate-900/40 backdrop-blur-xl">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Klient / Zgłaszający
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="text-xs">
                <span className="text-slate-500 block uppercase text-[10px] tracking-wider">Imię i nazwisko</span>
                <span className="font-medium text-slate-200">{ticket.user.name || "Brak danych"}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500 block uppercase text-[10px] tracking-wider">Adres e-mail</span>
                <span className="font-medium text-slate-200">{ticket.user.email}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500 block uppercase text-[10px] tracking-wider">ID Organizacji (Firma)</span>
                <span className="font-mono text-slate-300 font-semibold">{ticket.organization_id || "Brak"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic Metadata (Context) */}
          <Card className="border-white/5 bg-slate-900/40 backdrop-blur-xl">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Kontekst Diagnostyczny
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {ticket.url_context && (
                <div className="text-xs space-y-1">
                  <span className="text-slate-500 flex items-center gap-1 uppercase text-[9px] tracking-wider font-semibold">
                    <Globe className="h-3.5 w-3.5" /> Adres błędu (URL)
                  </span>
                  <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-primary break-all border border-white/5">
                    {ticket.url_context}
                  </div>
                </div>
              )}
              {ticket.viewport_size && (
                <div className="text-xs space-y-1">
                  <span className="text-slate-500 flex items-center gap-1 uppercase text-[9px] tracking-wider font-semibold">
                    <Monitor className="h-3.5 w-3.5" /> Rozdzielczość ekranu
                  </span>
                  <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-300 border border-white/5">
                    {ticket.viewport_size}
                  </div>
                </div>
              )}
              {ticket.user_agent && (
                <div className="text-xs space-y-1">
                  <span className="text-slate-500 flex items-center gap-1 uppercase text-[9px] tracking-wider font-semibold">
                    <FileText className="h-3.5 w-3.5" /> Przeglądarka / System
                  </span>
                  <div className="p-2 rounded bg-slate-950 font-mono text-[9px] text-slate-400 break-words border border-white/5 leading-relaxed">
                    {ticket.user_agent}
                  </div>
                </div>
              )}
              {ticket.system_metadata && Object.keys(ticket.system_metadata).length > 0 && (
                <div className="text-xs space-y-1 border-t border-white/5 pt-2">
                  <span className="text-slate-500 block uppercase text-[9px] tracking-wider font-semibold">Metadane systemowe</span>
                  <pre className="p-2 rounded bg-slate-950 font-mono text-[9px] text-slate-300 overflow-x-auto border border-white/5">
                    {JSON.stringify(ticket.system_metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
