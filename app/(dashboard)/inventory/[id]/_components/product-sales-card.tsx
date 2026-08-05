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
import { DollarSign, ExternalLink, RefreshCw, ShoppingCart, User, Receipt, Info, Calendar, TrendingUp, Coins } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ProductSale {
  order_id: string;
  external_order_id: string;
  purchased_at: string;
  quantity: number;
  buyer_login: string | null;
  total_to_pay: number;
  payment_status: string | null;
  fulfillment_status: string | null;
  erp_document: string | null;
  integration_name: string | null;
}

export function ProductSalesCard({ productId }: { productId: string }) {
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [stats, setStats] = useState<any>({
    total_sold: 0,
    sold_last_30_days: 0,
    sold_last_7_days: 0,
    total_revenue: 0.0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/inventory/${productId}/sales`);
      setSales(res.data.sales || []);
      setStats(res.data.stats || {
        total_sold: 0,
        sold_last_30_days: 0,
        sold_last_7_days: 0,
        total_revenue: 0.0
      });
    } catch (error) {
      console.error("Failed to fetch product sales history", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchSales();
    }

    const interval = setInterval(() => {
      fetchSales();
    }, 30000);

    return () => clearInterval(interval);
  }, [productId]);

  return (
    <Card className="mt-4 shadow-md border-border/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-amber-500" />
            Ruch na Towarze (Rezerwacje & Sprzedaż)
          </CardTitle>
          <CardDescription className="text-xs">
            Lista ostatnich sprzedaży wpływających na stan wirtualny lub już rozliczonych w ERP.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSales} disabled={isLoading} className="h-8">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Odśwież
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Stats Grid */}
        {!isLoading && sales.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/10 flex flex-col gap-0.5 shadow-sm">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold flex items-center gap-1">
                <ShoppingCart className="h-3 w-3 text-amber-500" /> Sprzedano
              </span>
              <span className="font-mono text-base font-bold text-foreground mt-0.5">
                {stats.total_sold} szt.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/10 flex flex-col gap-0.5 shadow-sm">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-500" /> Ost. 30 dni
              </span>
              <span className="font-mono text-base font-bold text-foreground mt-0.5">
                {stats.sold_last_30_days} szt.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/10 flex flex-col gap-0.5 shadow-sm">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> Ost. 7 dni
              </span>
              <span className="font-mono text-base font-bold text-foreground mt-0.5">
                {stats.sold_last_7_days} szt.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/10 flex flex-col gap-0.5 shadow-sm">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold flex items-center gap-1">
                <Coins className="h-3 w-3 text-yellow-500" /> Obrót (30 dni)
              </span>
              <span className="font-mono text-base font-bold text-foreground mt-0.5 truncate" title={`${stats.total_revenue} zł`}>
                {stats.total_revenue.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł
              </span>
            </div>
          </div>
        )}
        {isLoading && sales.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <LoaderIcon className="h-5 w-5 animate-spin text-primary" />
            Ładowanie historii sprzedaży...
          </div>
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg flex flex-col items-center justify-center p-6 bg-muted/5">
            <Info className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="font-semibold text-sm">Brak zarejestrowanego ruchu na towarze</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm">
              Zamówienia z Allegro / Empik, które zawierają ten produkt, pojawią się tutaj natychmiast po ich pobraniu.
            </p>
          </div>
        ) : (
          <div className="h-[400px] w-full rounded-lg border overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Zamówienie / Źródło</TableHead>
                  <TableHead className="text-xs">Klient</TableHead>
                  <TableHead className="text-xs text-center">Ilość</TableHead>
                  <TableHead className="text-xs">Status Rezerwacji Stanu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const isReservation = !sale.erp_document && 
                    ["NEW", "PROCESSING", "READY_FOR_SHIPMENT"].includes(sale.fulfillment_status || "");
                  const isSentWithoutFv = !sale.erp_document && sale.fulfillment_status === "SENT";
                  
                  return (
                    <TableRow key={sale.order_id} className="hover:bg-muted/30 transition-colors">
                      {/* Data */}
                      <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(sale.purchased_at), "dd.MM.yyyy, HH:mm", { locale: pl })}
                      </TableCell>

                      {/* Zamówienie & Źródło */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Link 
                            href={`/orders/${sale.order_id}`}
                            className="font-bold text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1 w-fit group"
                          >
                            <span>#{sale.external_order_id.split("-").pop() || sale.external_order_id}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          {sale.integration_name && (
                            <span className="text-[10px] text-muted-foreground">
                              {sale.integration_name}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Klient */}
                      <TableCell className="text-xs max-w-[120px] truncate" title={sale.buyer_login || "Brak loginu"}>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className="truncate">{sale.buyer_login || "Brak loginu"}</span>
                        </div>
                      </TableCell>

                      {/* Ilość */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs font-bold px-2.5 py-0.5 bg-muted/50 rounded-lg">
                          x{sale.quantity}
                        </Badge>
                      </TableCell>

                      {/* Status Rezerwacji */}
                      <TableCell>
                        {isReservation ? (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge 
                              variant="outline" 
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold"
                            >
                              Odejmuje Stan (-{sale.quantity})
                            </Badge>
                            <span className="text-[9px] text-muted-foreground/80 leading-none">
                              Aktywna rezerwacja (do realizacji)
                            </span>
                          </div>
                        ) : sale.erp_document ? (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge 
                              variant="outline" 
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Receipt className="h-3 w-3" />
                              Zaksięgowane w ERP
                            </Badge>
                            <span className="text-[9px] text-muted-foreground/80 leading-none truncate max-w-[160px]" title={sale.erp_document}>
                              Dokument: {sale.erp_document}
                            </span>
                          </div>
                        ) : isSentWithoutFv ? (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge 
                              variant="outline" 
                              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold"
                            >
                              Wysłane (brak FV)
                            </Badge>
                            <span className="text-[9px] text-muted-foreground/80 leading-none">
                              Zakończone, nie rezerwuje stanu
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge 
                              variant="outline" 
                              className="bg-slate-500/10 text-slate-500 border-slate-500/30 text-[10px] font-bold"
                            >
                              Brak rezerwacji
                            </Badge>
                            <span className="text-[9px] text-muted-foreground/80 leading-none">
                              Status: {sale.fulfillment_status || "Zakończone"}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
