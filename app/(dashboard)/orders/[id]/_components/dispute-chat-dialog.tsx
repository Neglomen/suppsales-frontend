"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Dispute, DisputeMessage } from "@/types/order";
import { cn } from "@/lib/utils";

interface DisputeChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: Dispute;
  onDisputeUpdated: () => void;
}

export function translateDisputeSubject(subject: string): string {
  const translations: Record<string, string> = {
    ITEM_NOT_RECEIVED: "Przedmiot nie dotarł",
    DELAYED_SHIPMENT: "Opóźniona wysyłka",
    DEFECTIVE_PRODUCT: "Wadliwy produkt",
    NO_REFUND_AFTER_RETURNING_PRODUCT: "Brak zwrotu środków po zwrocie towaru",
    WRONG_PRODUCT: "Otrzymano inny produkt",
    INCOMPLETE_PRODUCT: "Niekompletny produkt",
    PRODUCT_DAMAGED_IN_TRANSPORT: "Uszkodzenie w transporcie",
    PRODUCT_NOT_COMPATIBLE_WITH_DESCRIPTION: "Produkt niezgodny z opisem",
    OTHER: "Inny problem transakcyjny",
  };
  return translations[subject] || subject;
}

export function DisputeChatDialog({
  isOpen,
  onClose,
  dispute,
  onDisputeUpdated,
}: DisputeChatDialogProps) {
  const [messages, setMessages] = useState<DisputeMessage[]>(dispute.messages || []);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Sync messages when dispute changes (e.g. if refreshed from parent)
  useEffect(() => {
    if (dispute) {
      setMessages(dispute.messages || []);
    }
  }, [dispute]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      const response = await api.post<DisputeMessage>(
        `/disputes/${dispute.id}/messages`,
        { text: replyText }
      );
      toast.success("Odpowiedź została wysłana do Allegro.");
      setMessages((prev) => [...prev, response.data]);
      setReplyText("");
      onDisputeUpdated(); // trigger refetch in parent to sync state
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || "Nie udało się wysłać odpowiedzi.";
      toast.error(errMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col bg-[#0a0c16]/95 border border-border/40 text-white rounded-2xl backdrop-blur-lg">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn(
              "h-5 w-5",
              dispute.status === "ONGOING" ? "text-red-500 animate-pulse" : "text-emerald-500"
            )} />
            <DialogTitle className="text-lg font-bold font-mono uppercase tracking-wide">
              {translateDisputeSubject(dispute.subject)}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground/80 mt-1">
            Typ: <span className="font-semibold text-white/80">{dispute.type}</span> | 
            Status: <span className={cn(
              "font-bold uppercase",
              dispute.status === "ONGOING" ? "text-red-400" : "text-emerald-400"
            )}>{dispute.status === "ONGOING" ? "W toku" : "Rozwiązana/Zamknięta"}</span> | 
            Kupujący: <span className="font-semibold text-white/80 font-mono">{dispute.buyer_login}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 select-text">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10 italic">Brak wiadomości w tym sporze.</p>
          ) : (
            messages
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((msg) => {
                const isSeller = msg.author_role === "SELLER";
                const isBuyer = msg.author_role === "BUYER";
                const isAdmin = msg.author_role === "ADMIN";
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[80%] rounded-xl p-3.5 text-xs relative border transition-all duration-300",
                      isSeller 
                        ? "ml-auto bg-primary/20 border-primary/30 text-white rounded-tr-none shadow-md shadow-primary/5" 
                        : isBuyer
                          ? "bg-slate-900/40 border-border/30 text-white/90 rounded-tl-none"
                          : "mx-auto bg-amber-500/10 border-amber-500/20 text-amber-300 rounded-none w-full"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5 opacity-60 font-semibold text-[9px] uppercase tracking-wider">
                      <span>{msg.author_login} ({isSeller ? "Sprzedawca" : isBuyer ? "Kupujący" : "Allegro"})</span>
                      <span>{new Date(msg.created_at).toLocaleString("pl-PL")}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed select-text">{msg.text}</p>
                  </div>
                );
              })
          )}
        </div>

        {/* Reply form */}
        <form onSubmit={handleSendMessage} className="border-t border-white/10 p-4 bg-slate-950/20 flex gap-2 items-end">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={dispute.status === "ONGOING" ? "Napisz oficjalną odpowiedź w sporze..." : "Ta dyskusja została zamknięta."}
            disabled={isSending || dispute.status !== "ONGOING"}
            rows={2}
            className="flex-1 bg-slate-950/60 border-border/30 focus:border-primary/50 text-white rounded-xl resize-none text-xs focus:ring-0 focus:ring-offset-0 placeholder:text-muted-foreground/50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isSending || !replyText.trim() || dispute.status !== "ONGOING"}
            className="rounded-xl h-9 w-9 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
