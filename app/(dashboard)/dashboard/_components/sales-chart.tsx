"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const data = [
  { name: "01.08", total: 1200 },
  { name: "04.08", total: 2100 },
  { name: "07.08", total: 1800 },
  { name: "10.08", total: 2800 },
  { name: "13.08", total: 2300 },
  { name: "16.08", total: 3400 },
  { name: "19.08", total: 3000 },
  { name: "22.08", total: 4100 },
  { name: "25.08", total: 3900 },
];

export function SalesChart() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Przegląd sprzedaży</CardTitle>
        <CardDescription>Sprzedaż z ostatnich 30 dni.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value} zł`}
              />
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-background)",
                  border: "1px solid var(--color-border)",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--color-primary)"
                fillOpacity={1}
                fill="url(#colorUv)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
