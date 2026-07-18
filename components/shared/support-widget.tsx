"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, X, Loader2, Send, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import api, { getErrorMessage } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("QUESTION");
  const [priority, setPriority] = useState("MEDIUM");
  const [content, setContent] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Proszę wypełnić temat i opis zgłoszenia.");
      return;
    }

    setIsLoading(true);
    try {
      // Automatyczne zbieranie metadanych diagnostycznych
      const urlContext = typeof window !== "undefined" ? window.location.pathname : "";
      const userAgent = typeof window !== "undefined" ? navigator.userAgent : "";
      const viewportSize =
        typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "";

      const response = await api.post("/support/", {
        title,
        category,
        priority,
        content,
        url_context: urlContext,
        user_agent: userAgent,
        viewport_size: viewportSize,
        system_metadata: {},
      });

      toast.success("Zgłoszenie zostało wysłane pomyślnie!");
      setIsOpen(false);
      
      // Reset formularza
      setTitle("");
      setContent("");
      setCategory("QUESTION");
      setPriority("MEDIUM");

      // Przekierowanie do widoku nowego zgłoszenia
      const newTicket = response.data;
      if (newTicket && newTicket.id) {
        router.push(`/support/${newTicket.id}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err) || "Wystąpił błąd podczas wysyłania zgłoszenia.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Pływający przycisk widgetu */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-primary/20 hover:shadow-xl transition-all duration-300 ring-2 ring-primary/20"
            size="icon"
          >
            <Headphones className="h-5.5 w-5.5" />
          </Button>
        </motion.div>
      </div>

      {/* Modal formularza zgłoszenia */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] glass border-border/10">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Pomoc techniczna & Kontakt
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                  Zgłoś błąd, zadaj pytanie lub zaproponuj funkcjonalność.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Temat</label>
              <Input
                placeholder="np. Błąd z synchronizacją zamówień Allegro"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                className="bg-background/50 border-border/10 focus:border-primary/50 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Kategoria</label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-background/50 border-border/10 focus:border-primary/50 rounded-xl">
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent className="glass border-border/10">
                    <SelectItem value="BUG">Zgłoszenie błędu</SelectItem>
                    <SelectItem value="FEATURE_REQUEST">Sugestia / Pomysł</SelectItem>
                    <SelectItem value="BILLING">Płatności & Konto</SelectItem>
                    <SelectItem value="QUESTION">Pytanie</SelectItem>
                    <SelectItem value="OTHER">Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Priorytet (sugestia)</label>
                <Select
                  value={priority}
                  onValueChange={setPriority}
                  disabled={isLoading}
                >
                  <SelectTrigger className="bg-background/50 border-border/10 focus:border-primary/50 rounded-xl">
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent className="glass border-border/10">
                    <SelectItem value="LOW">Niski</SelectItem>
                    <SelectItem value="MEDIUM">Średni</SelectItem>
                    <SelectItem value="HIGH">Wysoki</SelectItem>
                    <SelectItem value="CRITICAL">Krytyczny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Opis zgłoszenia</label>
              <Textarea
                placeholder="Opisz swój problem lub pytanie. Jeśli zgłaszasz błąd, napisz co robisz krok po kroku oraz co się dzieje."
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isLoading}
                className="bg-background/50 border-border/10 focus:border-primary/50 rounded-xl resize-none"
              />
            </div>

            {/* Stopka z informacją o auto-diagnostyce */}
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-500/80 rounded-xl text-[10px] leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Automatyczna diagnostyka:</strong> Wybranie tej opcji dołączy do zgłoszenia dane systemowe (URL: <code>{typeof window !== "undefined" ? window.location.pathname : ""}</code>, przeglądarka), abyśmy mogli szybciej pomóc.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="rounded-xl hover:bg-muted/10"
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-tr from-primary to-primary/80 hover:from-primary/95 hover:to-primary/75 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Wyślij zgłoszenie
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
