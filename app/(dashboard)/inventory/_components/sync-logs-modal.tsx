"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncLog {
  id: string;
  action_type: string;
  previous_value: string | null;
  new_value: string | null;
  status: string;
  message: string | null;
  created_at: string;
}

interface SyncLogsModalProps {
  productId: string | null;
  productName?: string;
  sku?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncLogsModal({
  productId,
  productName,
  sku,
  open,
  onOpenChange,
}: SyncLogsModalProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    if (!productId) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/inventory/${productId}/sync-logs`);
      setLogs(res.data);
    } catch (error) {
      console.error("Failed to fetch sync logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && productId) {
      fetchLogs();
    }
  }, [open, productId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "FAILED":
        return <ServerCrash className="h-4 w-4 text-destructive" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
            Zakończono
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10">
            Błąd
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">
            Przetwarzanie...
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "STOCK_CHANGE":
        return "Zmiana Ilości";
      case "PRICE_CHANGE":
        return "Zmiana Ceny";
      case "SYNC_CHECK":
        return "Weryfikacja Stanu";
      case "RESERVATION":
        return "Rezerwacja (Sprzedaż)";
      case "ERROR":
        return "Błąd Systemowy";
      default:
        return action;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                Dziennik Zdarzeń Synchronizacji
              </DialogTitle>
              <DialogDescription className="mt-1">
                {productName ? `${productName} ` : ""}
                {sku ? <code className="bg-muted px-1.5 py-0.5 rounded text-xs">SKU: {sku}</code> : ""}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="mr-6"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Odśwież
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-lg p-2 bg-card">
          {isLoading && logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Ładowanie logów...</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border border-dashed rounded-lg">
              Brak zarejestrowanych zdarzeń synchronizacji dla tego produktu.
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Data zdarzenia</TableHead>
                  <TableHead>Typ akcji</TableHead>
                  <TableHead>Wartość</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[40%]">Szczegóły / Komunikat błędu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: pl })}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {getActionLabel(log.action_type)}
                    </TableCell>
                    <TableCell>
                      {log.new_value !== null ? (
                        <span className="font-mono bg-muted px-2 py-1 rounded text-xs border">
                          {log.new_value}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.message ? (
                        <div
                          className="p-2 rounded bg-destructive/10 text-destructive border border-destructive/20 break-words font-sans max-h-24 overflow-y-auto"
                          title={log.message}
                        >
                          {log.message}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">OK</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
