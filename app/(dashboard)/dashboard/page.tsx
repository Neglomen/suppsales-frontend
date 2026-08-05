// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import ReportModal from "@/components/dashboard/report-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ArrowUpRight,
  ChevronRight,
  Clock,
  PackageCheck,
  Boxes,
  PlugZap
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Button } from "@/components/ui/button";
import { TaskSection } from "./_components/task-section";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface ChartDataPoint {
  name: string;
  sales: number;
  orders: number;
}

interface RecentOrderProduct {
  name: string;
  image_url: string | null;
}

interface RecentOrder {
  id: string;
  external_order_id: string;
  buyer_name: string;
  buyer_login: string | null;
  total_to_pay: number;
  status: string;
  payment_status: string;
  payment_type: string | null;
  purchased_at: string;
  service_integration_provider: string;
  products: RecentOrderProduct[];
}

interface DashboardStats {
  sales_30d: number;
  sales_trend: number;
  sales_trend_up: boolean;
  orders_30d: number;
  orders_trend: number;
  orders_trend_up: boolean;
  customers_30d: number;
  customers_trend: number;
  customers_trend_up: boolean;
  growth: number;
  growth_trend: number;
  growth_trend_up: boolean;
  chart_data: ChartDataPoint[];
  recent_orders: RecentOrder[];
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<"sales_summary" | "sales_by_channel" | "uninvoiced_orders" | "shipments">("sales_summary");

  const { data: statsData, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/");
      return res.data;
    }
  });

  const stats = statsData ? [
    { label: "Sprzedaż (30 dni)", value: `${statsData.sales_30d.toLocaleString("pl-PL")} PLN`, icon: DollarSign, trend: `${statsData.sales_trend_up ? "+" : "-"}${statsData.sales_trend}%`, trendUp: statsData.sales_trend_up },
    { label: "Zamówienia", value: `${statsData.orders_30d}`, icon: Package, trend: `${statsData.orders_trend_up ? "+" : "-"}${statsData.orders_trend}%`, trendUp: statsData.orders_trend_up },
    { label: "Nowi Klienci", value: `${statsData.customers_30d}`, icon: Users, trend: `${statsData.customers_trend_up ? "+" : "-"}${statsData.customers_trend}%`, trendUp: statsData.customers_trend_up },
    { label: "Wzrost", value: `${statsData.growth}%`, icon: TrendingUp, trend: `${statsData.growth_trend_up ? "+" : "-"}${statsData.growth_trend}%`, trendUp: statsData.growth_trend_up },
  ] : [
    { label: "Sprzedaż (30 dni)", value: "...", icon: DollarSign, trend: "...", trendUp: true },
    { label: "Zamówienia", value: "...", icon: Package, trend: "...", trendUp: true },
    { label: "Nowi Klienci", value: "...", icon: Users, trend: "...", trendUp: true },
    { label: "Wzrost", value: "...", icon: TrendingUp, trend: "...", trendUp: true },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-20 text-foreground">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80">
            Witaj, {user?.name?.split(" ")[0] || "Użytkowniku"}!
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Oto przegląd aktywności Twojego biznesu z ostatnich 30 dni.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button 
            className="bg-primary hover:bg-primary/95 text-white rounded-xl h-10 shadow-lg shadow-primary/20"
            onClick={() => {
              setReportModalType("sales_summary");
              setIsReportModalOpen(true);
            }}
          >
            Raport miesięczny
          </Button>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="h-4 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
          Szybki dostęp
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/orders" className="group">
            <div className="relative overflow-hidden h-full p-5 glass border-border/30 hover:bg-accent/5 backdrop-blur-xl rounded-2xl border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02] transition-all duration-300 flex items-center gap-4">
              {/* Ambient card glow */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                <Package className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 z-10">
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Zamówienia</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Przeglądaj i filtruj zamówienia</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all z-10" />
            </div>
          </Link>

          <div className="hidden sm:block">
            <Link href="/shipping/fulfillment" className="group">
              <div className="relative overflow-hidden h-full p-5 glass border-border/30 hover:bg-accent/5 backdrop-blur-xl rounded-2xl border hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5 hover:scale-[1.02] transition-all duration-300 flex items-center gap-4">
                {/* Ambient card glow */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-400 transition-colors">Nabijarka</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Pakowanie i nabijanie FV</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all z-10" />
              </div>
            </Link>
          </div>

          <Link href="/inventory" className="group">
            <div className="relative overflow-hidden h-full p-5 glass border-border/30 hover:bg-accent/5 backdrop-blur-xl rounded-2xl border hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/5 hover:scale-[1.02] transition-all duration-300 flex items-center gap-4">
              {/* Ambient card glow */}
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-200 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                <Boxes className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 z-10">
                <h3 className="font-bold text-sm text-foreground group-hover:text-indigo-400 transition-colors">Magazyn</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Stany magazynowe i mapowania</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all z-10" />
            </div>
          </Link>

          <div className="hidden sm:block">
            <Link href="/integrations" className="group">
              <div className="relative overflow-hidden h-full p-5 glass border-border/30 hover:bg-accent/5 backdrop-blur-xl rounded-2xl border hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 hover:scale-[1.02] transition-all duration-300 flex items-center gap-4">
                {/* Ambient card glow */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300">
                  <PlugZap className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-amber-400 transition-colors">Integracje</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Klucze API i status połączeń</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all z-10" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass border-border/30 hover:bg-accent/5 backdrop-blur-xl hover:scale-[1.02] hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 rounded-2xl relative overflow-hidden group">
            {/* Ambient card glows */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{stat.label}</CardTitle>
              <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</div>
              <div className={`text-xs mt-2.5 flex items-center font-medium ${stat.trendUp ? "text-emerald-400" : "text-rose-400"}`}>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg ${stat.trendUp ? "bg-emerald-500/10" : "bg-rose-500/10"} mr-1.5`}>
                  <ArrowUpRight className={`h-3 w-3 ${!stat.trendUp && "rotate-90"}`} />
                  {stat.trend}
                </span>
                <span className="text-muted-foreground/60">od zeszłego miesiąca</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <Card className="lg:col-span-2 glass border-border/30 backdrop-blur-xl rounded-2xl shadow-xl hover:border-primary/10 transition-all overflow-hidden relative group">
          {/* Ambient section glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-3xl rounded-full opacity-50 pointer-events-none" />

          <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4 z-10">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="h-4 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                Wykres Sprzedaży
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">Analiza trendów z ostatnich 30 dni</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 border animate-pulse">Live</Badge>
          </CardHeader>
          <CardContent className="h-[350px] w-full pt-6 z-10">
            <ResponsiveContainer width="100%" height="100%">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <AreaChart data={statsData?.chart_data || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="var(--primary)" floodOpacity="0.25" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as ChartDataPoint;
                        return (
                          <div className="glass border border-border/40 bg-popover/90 backdrop-blur-xl p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col gap-1.5 select-none min-w-[150px]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</div>
                            <div className="text-sm font-extrabold text-foreground flex items-center justify-between gap-4 mt-0.5">
                              <span className="text-muted-foreground font-medium">Sprzedaż:</span>
                              <span className="text-emerald-400">{(data.sales || 0).toLocaleString("pl-PL")} PLN</span>
                            </div>
                            <div className="text-xs font-semibold text-foreground/90 flex items-center justify-between gap-4">
                              <span className="text-muted-foreground font-medium">Zamówienia:</span>
                              <span className="text-primary">{(data.orders || 0)} szt.</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="var(--primary)" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    filter="url(#glow)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity / Tasks Right Column */}
        <div className="space-y-8">
          <TaskSection />
        </div>
      </div>

      {/* Latest Orders Table Overview */}
      <Card className="glass border-border/30 backdrop-blur-xl rounded-2xl shadow-xl hover:border-primary/10 transition-all">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Ostatnie Zamówienia</CardTitle>
          <Link href="/orders" className="text-xs sm:text-sm text-primary hover:text-primary/80 flex items-center font-semibold transition-colors">
            Zobacz wszystkie <ChevronRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : statsData?.recent_orders.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground text-sm">Brak ostatnich zamówień</div>
            ) : (
              statsData?.recent_orders.map((order) => {
                const mainProduct = order.products && order.products.length > 0 ? order.products[0] : null;
                const productName = mainProduct ? mainProduct.name : `Zamówienie #${order.external_order_id}`;
                const extraProductsCount = order.products && order.products.length > 1 ? order.products.length - 1 : 0;
                
                const provider = order.service_integration_provider || "INNE";
                const providerBadgeColor = 
                  provider === "ALLEGRO" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                  provider === "EMPIK" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                  provider === "BASELINKER" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                  "bg-slate-500/10 text-slate-400 border-slate-500/20";

                return (
                  <Link 
                    key={order.id} 
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl hover:bg-accent/5 cursor-pointer transition-all border border-transparent hover:border-border/30 group"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Product Image or Fallback */}
                      {mainProduct && mainProduct.image_url ? (
                        <img 
                          src={mainProduct.image_url} 
                          alt={productName} 
                          className="h-10 w-10 rounded-xl object-contain p-0.5 bg-muted/20 border border-border/40 shrink-0 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-center text-muted-foreground shrink-0 group-hover:scale-105 transition-transform">
                          <Package className="h-5 w-5" />
                        </div>
                      )}

                      {/* Product details & Buyer info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors" title={productName}>
                            {productName}
                          </p>
                          {extraProductsCount > 0 && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-border/40 text-muted-foreground shrink-0 font-medium">
                              +{extraProductsCount}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span className="text-foreground/80 font-medium truncate max-w-[280px] sm:max-w-[360px]">
                            {order.buyer_name} {order.buyer_login ? `@${order.buyer_login}` : ""}
                          </span>
                          <span className="text-muted-foreground/30 select-none">•</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {formatDistanceToNow(new Date(order.purchased_at), { addSuffix: true, locale: pl })}
                          </span>
                          <span className="text-muted-foreground/30 select-none">•</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border shrink-0 font-bold uppercase tracking-wider ${providerBadgeColor}`}>
                            {provider}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Order Total and Payment Status */}
                    <div className="text-right ml-4 shrink-0">
                      <p className="font-bold text-sm text-foreground">{(order.total_to_pay || 0).toLocaleString("pl-PL")} PLN</p>
                      {order.payment_type === "CASH_ON_DELIVERY" ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border-none h-5 px-2 text-[10px] rounded-md mt-1 font-semibold">Pobranie</Badge>
                      ) : order.payment_status === "COMPLETED" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-none h-5 px-2 text-[10px] rounded-md mt-1 font-semibold">Opłacone</Badge>
                      ) : order.payment_status === "PENDING" ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border-none h-5 px-2 text-[10px] rounded-md mt-1 font-semibold animate-pulse">Oczekuje</Badge>
                      ) : (
                        <Badge className="bg-muted/20 text-muted-foreground border-none h-5 px-2 text-[10px] rounded-md mt-1 font-semibold">Nieznany</Badge>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        defaultReportType={reportModalType}
      />
    </div>
  );
}
