"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, ServerCrash } from "lucide-react";
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

export function SyncLogsCard({ productId }: { productId: string }) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
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
    if (productId) {
      fetchLogs();
    }
    
    // Auto odświeżanie co 30 sekund
    const interval = setInterval(() => {
      fetchLogs();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [productId]);

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
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Zakończono</Badge>;
      case "FAILED":
        return <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10">Błąd</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">Przetwarzanie...</Badge>;
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
    <Card className="mt-4 shadow-md border-border/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Historia Synchronizacji</CardTitle>
          <CardDescription>Ostatnie zdarzenia magazynowe i cennikowe wysłane do kanałów sprzedaży.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
          Odśwież
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && logs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Ładowanie historii...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
            Brak zarejestrowanych zdarzeń synchronizacji.
          </div>
        ) : (
          <div className="h-[400px] w-full rounded-md border overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Akcja</TableHead>
                  <TableHead>Wartość</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Wiadomość / Błąd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="group transition-colors">
                    <TableCell className="font-medium whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: pl })}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{getActionLabel(log.action_type)}</span>
                    </TableCell>
                    <TableCell>
                      {log.new_value !== null ? (
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs border">
                          {log.new_value}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {log.message ? (
                        <div className="text-xs text-destructive truncate group-hover:whitespace-normal group-hover:break-words transition-all" title={log.message}>
                          {log.message}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Brak uwag</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
