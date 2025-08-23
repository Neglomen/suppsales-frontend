// src/app/(dashboard)/response-templates/_components/all-communication-logs-tab.tsx
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
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Ten sam config statusu co poprzednio
const statusConfig = {
  SENT: {
    variant: "default" as const,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    label: "Wysłano",
  },
  FAILED: {
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    label: "Błąd wysyłki",
  },
};

interface PaginatedLogsResponse {
  items: CommunicationLog[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export function AllCommunicationLogsTab() {
  const [data, setData] = useState<PaginatedLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<PaginatedLogsResponse>(
          "/communication-logs",
          {
            params: { page: currentPage, size: PAGE_SIZE },
          }
        );
        setData(response.data);
      } catch (err) {
        setError("Nie udało się załadować historii komunikacji.");
        toast.error("Nie udało się załadować historii komunikacji.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [currentPage]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center p-8 h-96">
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

  if (!data || data.items.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <p>Brak historii wysłanych wiadomości e-mail w tej organizacji.</p>
      </div>
    );
  }

  const { items, total, page, pages } = data;

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full border rounded-md">
        {items.map((log) => {
          const config = statusConfig[log.status];
          return (
            <AccordionItem
              value={log.id}
              key={log.id}
              className="border-b last:border-b-0"
            >
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
                    <Badge
                      variant={config.variant}
                      className={config.className}
                    >
                      {config.label}
                    </Badge>
                    <span className="flex items-center gap-2 pt-1">
                      <User className="h-4 w-4" />{" "}
                      {log.author?.name || "Automat"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />{" "}
                      {new Date(log.sent_at).toLocaleString("pl-PL")}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 border-t bg-muted/50">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: log.content }}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Strona {page} z {pages} (Łącznie: {total} rekordów)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={page <= 1}
          >
            Poprzednia
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={page >= pages}
          >
            Następna
          </Button>
        </div>
      </div>
    </div>
  );
}
