// src/app/(dashboard)/orders/[id]/_components/communication-history-timeline.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { CommunicationLog } from "@/types/communication-log";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  ServerCrash,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CommunicationHistoryTimelineProps {
  orderId: string;
}

// Mapowanie statusów na kolory i ikony dla spójności
const statusConfig = {
  SENT: {
    variant: "default" as const,
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    label: "Wysłano",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  FAILED: {
    variant: "destructive" as const,
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
    label: "Błąd wysyłki",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export function CommunicationHistoryTimeline({
  orderId,
}: CommunicationHistoryTimelineProps) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!orderId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<CommunicationLog[]>(
          `/orders/${orderId}/communication-logs`
        );
        setLogs(response.data);
      } catch (err) {
        setError("Nie udało się załadować historii komunikacji.");
        toast.error("Nie udało się załadować historii komunikacji.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <ServerCrash className="h-4 w-4" />
        <AlertTitle>Błąd</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>Brak historii wysłanych wiadomości e-mail dla tego zamówienia.</p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {logs.map((log) => {
        const config = statusConfig[log.status];
        return (
          <AccordionItem value={log.id} key={log.id}>
            <AccordionTrigger className="hover:no-underline p-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full text-left gap-2">
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-primary truncate">
                    {log.subject}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Do: {log.recipient_email}
                  </p>
                </div>
                <div className="flex flex-col md:items-end text-sm text-muted-foreground space-y-1 w-full md:w-auto">
                  <Badge variant={config.variant} className={config.className}>
                    {config.label}
                  </Badge>
                  <span className="flex items-center gap-2 pt-1">
                    <User className="h-4 w-4" /> {log.author?.name || "Automat"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />{" "}
                    {new Date(log.sent_at).toLocaleString("pl-PL")}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 border-t bg-muted/50">
              {log.status === "FAILED" && log.error_message && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Szczegóły błędu</AlertTitle>
                  <AlertDescription className="font-mono text-xs">
                    {log.error_message}
                  </AlertDescription>
                </Alert>
              )}
              {/* Używamy prose do stylowania treści HTML */}
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: log.content }}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
