"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingBag, Users } from "lucide-react";

const kpiData = [
  {
    title: "Sprzedaż dzisiaj",
    value: "4,892.30 zł",
    change: "+12.1% od wczoraj",
    icon: DollarSign,
  },
  {
    title: "Nowe zamówienia",
    value: "+32",
    change: "+5.8% w tym tygodniu",
    icon: ShoppingBag,
  },
  {
    title: "Wysyłki do realizacji",
    value: "16",
    change: "2 oczekują na etykietę",
    icon: Package,
  },
  {
    title: "Nowi klienci",
    value: "+8",
    change: "w tym miesiącu",
    icon: Users,
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((item, index) => (
        <Card key={index} className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
