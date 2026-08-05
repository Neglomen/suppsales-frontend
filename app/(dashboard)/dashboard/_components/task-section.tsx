"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { 
  AlertTriangle, 
  MessageSquare, 
  Boxes, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  Warehouse,
  Clock
} from "lucide-react";

interface UnifiedMessage {
  id: string;
  author_login: string;
  author_role: string;
  text: string;
  created_at: string;
}

interface UnifiedThread {
  id: string;
  integration_id: number;
  provider_type: string;
  type: "MESSAGE_CENTER" | "DISPUTE";
  interlocutor_login: string;
  last_message_at: string;
  read: boolean;
  order_id: string | null;
  subject: string | null;
  status: string | null;
  sla_deadline: string | null;
  messages: UnifiedMessage[];
}

interface LineItem {
  id: string;
  offer: { name: string };
  quantity: number;
}

interface Order {
  id: string;
  external_order_id: string;
  status: string;
  fulfillment_status?: string | null;
  buyer_login: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  purchased_at: string;
  total_to_pay: number;
  line_items: LineItem[];
  flags: string[] | null;
}

interface PaginatedOrdersResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: Order[];
}

export function TaskSection() {
  const [activeTab, setActiveTab] = useState<"warehouse" | "messages">("warehouse");

  // Fetch unread customer threads
  const { data: threads = [], isLoading: isThreadsLoading } = useQuery<UnifiedThread[]>({
    queryKey: ["dashboardUnreadThreads"],
    queryFn: async () => {
      const res = await api.get<UnifiedThread[]>("/communication/threads");
      return res.data.filter((t) => !t.read);
    },
    refetchInterval: 30000,
  });

  // Fetch orders with missing stock
  const { data: missingStockData, isLoading: isOrdersLoading } = useQuery<PaginatedOrdersResponse>({
    queryKey: ["dashboardMissingStockOrders"],
    queryFn: async () => {
      const res = await api.get<PaginatedOrdersResponse>("/orders", {
        params: {
          flags: ["BRAK_STANU"],
          page: 1,
          size: 10,
        },
      });
      return res.data;
    },
    refetchInterval: 30000,
  });
  const missingStockOrders = missingStockData?.items || [];

  return (
    <Card className="glass border-border/30 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/20">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-primary" />
          Centrum Alertów i Wiadomości
        </CardTitle>
      </CardHeader>
      
      {/* Tabs list */}
      <div className="flex border-b border-border/20 bg-muted/10">
        <button
          onClick={() => setActiveTab("warehouse")}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2",
            activeTab === "warehouse"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Boxes className="h-4 w-4" />
          Magazyn
          {missingStockOrders.length > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 justify-center px-1 rounded-full text-[10px] font-bold">
              {missingStockOrders.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={cn(
            "flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2",
            activeTab === "messages"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Wiadomości
          {threads.length > 0 && (
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white ml-1 h-5 min-w-5 justify-center px-1 rounded-full text-[10px] font-bold">
              {threads.length}
            </Badge>
          )}
        </button>
      </div>

      <CardContent className="pt-4 max-h-[380px] overflow-y-auto custom-scrollbar">
        {activeTab === "warehouse" ? (
          isOrdersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : missingStockOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-bold text-sm text-foreground">Wszystkie stany poprawne</p>
              <p className="text-xs text-muted-foreground mt-1">Brak produktów z flagą BRAK STANU.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {missingStockOrders.map((order) => {
                const totalItems = order.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-start justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/10 hover:border-border/30 transition-all group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary">
                          #{order.external_order_id.split("-").pop() || order.external_order_id}
                        </span>
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] uppercase tracking-wider font-extrabold h-4 px-1 shrink-0">
                          Brak stanu
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold text-foreground/90 mt-1.5 truncate">
                        {order.line_items?.[0]?.offer?.name || "Brak nazwy towaru"}
                        {order.line_items?.length > 1 && ` (+${order.line_items.length - 1} poz.)`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                        <span>{order.buyer_login || "Klient"}</span>
                        <span>•</span>
                        <span>{totalItems} szt.</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 self-center ml-2" />
                  </Link>
                );
              })}
            </div>
          )
        ) : isThreadsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="font-bold text-sm text-foreground">Wiadomości odczytane</p>
            <p className="text-xs text-muted-foreground mt-1">Brak nowych wiadomości od klientów.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => {
              const lastMsg = thread.messages && thread.messages.length > 0 
                ? thread.messages[thread.messages.length - 1] 
                : null;
              const isDispute = thread.type === "DISPUTE";
              
              const provider = thread.provider_type || "INNE";
              const providerColor = 
                provider === "ALLEGRO" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                provider === "EMPIK" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                "bg-slate-500/10 text-slate-400 border-slate-500/20";

              return (
                <Link
                  key={thread.id}
                  href={`/communication?threadId=${thread.id}`}
                  className="flex items-start justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/10 hover:border-border/30 transition-all group cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-foreground">
                        {thread.interlocutor_login}
                      </span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 h-4 font-bold uppercase tracking-wide border ${providerColor}`}>
                        {provider}
                      </Badge>
                      {isDispute && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] uppercase tracking-wider font-extrabold h-4 px-1 animate-pulse">
                          Dyskusja
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/90 mt-1.5 line-clamp-2 italic break-words">
                      "{lastMsg?.text || thread.subject || "Nowa wiadomość"}"
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/60 font-mono">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>
                        {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true, locale: pl })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 self-center ml-2" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
