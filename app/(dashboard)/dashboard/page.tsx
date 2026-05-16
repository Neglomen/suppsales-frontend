// src/app/(dashboard)/dashboard/page.tsx
"use client";

import { useAuthStore } from "@/store/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ArrowUpRight,
  ChevronRight,
  Clock
} from "lucide-react";
import { 
  LineChart, 
  Line, 
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
import { ConfigSection } from "./_components/config-section";
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

interface RecentOrder {
  id: string;
  external_order_id: string;
  buyer_name: string;
  total_to_pay: number;
  status: string;
  payment_status: string;
  purchased_at: string;
  service_integration_provider: string;
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
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight premium-gradient-text">
            Witaj, {user?.name?.split(" ")[0] || "Użytkowniku"}!
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Oto przegląd aktywności Twojego biznesu z ostatnich 30 dni.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="glass">Raport miesięczny</Button>
          <Button>Eksportuj dane</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/5 bg-background/40 hover:scale-[1.02] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs mt-1 flex items-center ${stat.trendUp ? "text-emerald-500" : "text-rose-500"}`}>
                <ArrowUpRight className={`h-3 w-3 mr-1 ${!stat.trendUp && "rotate-90"}`} />
                {stat.trend} od ostatniego miesiąca
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Section */}
        <Card className="lg:col-span-2 glass border-border/10 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Wykres Sprzedaży</CardTitle>
              <p className="text-sm text-muted-foreground">Analiza trendów tygodniowych</p>
            </div>
            <Badge variant="secondary" className="bg-primary/5 text-primary">Live</Badge>
          </CardHeader>
          <CardContent className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <AreaChart data={statsData?.chart_data || []}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="var(--primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity / Tasks Right Column */}
        <div className="space-y-8">
          <TaskSection />
          <ConfigSection />
        </div>
      </div>

      {/* Latest Orders Table Overview */}
      <Card className="glass border-border/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">Ostatnie Zamówienia</CardTitle>
          <Link href="/orders" className="text-sm text-primary hover:underline flex items-center font-medium">
            Zobacz wszystkie <ChevronRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : statsData?.recent_orders.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground text-sm">Brak ostatnich zamówień</div>
            ) : (
              statsData?.recent_orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/10">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs uppercase">
                      {(order.service_integration_provider || "XX").substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{order.service_integration_provider} #{order.external_order_id}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(order.purchased_at), { addSuffix: true, locale: pl })} • {order.buyer_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{order.total_to_pay.toLocaleString("pl-PL")} PLN</p>
                    {order.payment_status === "COMPLETED" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none h-5 px-2 text-[10px]">Opłacone</Badge>
                    ) : order.payment_status === "PENDING" ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-none h-5 px-2 text-[10px]">Oczekuje</Badge>
                    ) : (
                      <Badge className="bg-muted/50 text-muted-foreground border-none h-5 px-2 text-[10px]">Nieznany ({order.payment_status})</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
