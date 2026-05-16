"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, PlugZap, Building, ShieldCheck, HelpCircle } from "lucide-react";
import Link from "next/link";

const shortcuts = [
  { label: "Integracje", href: "/integrations", icon: PlugZap, desc: "Zarządzaj Allegro, Erli..." },
  { label: "Ustawienia Firmy", href: "/settings/organization", icon: Building, desc: "Dane firmy i faktur" },
  { label: "Ustawienia KSeF", href: "/settings/ksef", icon: ShieldCheck, desc: "Tokeny i klucze" },
  { label: "Pomoc i Instrukcja", href: "/help", icon: HelpCircle, desc: "Jak korzystać z aplikacji" },
];

export function ConfigSection() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Szybka Konfiguracja
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 transition-all border border-transparent hover:border-primary/10">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
