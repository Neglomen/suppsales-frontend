"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plug,
  Search,
  ArrowLeft,
  Sparkles,
  ShoppingBag,
  Database,
  Truck,
  FileText,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { AnimatedBackground } from "@/components/shared/grid-background";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MarketingNavbar, MarketingFooter } from "@/components/shared/marketing-nav";

interface IntegrationItem {
  id: string;
  name: string;
  category: "marketplace" | "erp" | "courier" | "invoices";
  description: string;
  features: string[];
  status: "active" | "coming_soon";
  badgeText?: string;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: "allegro",
    name: "Allegro",
    category: "marketplace",
    description: "Największy marketplace w Polsce. Pełna synchronizacja zamówień, płatności, cenników i stanów magazynowych w czasie rzeczywistym.",
    features: ["Pobieranie zamówień w < 1 min", "Dwukierunkowa synchronizacja cen", "Obsługa sporów i dyskusji", "Automatyczne aktualizacje statusów"],
    status: "active",
    badgeText: "Popularne"
  },
  {
    id: "baselinker",
    name: "BaseLinker",
    category: "marketplace",
    description: "Integracja z najpopularniejszym managerem sprzedaży multichannel. Pozwala na bezproblemowe łączenie setek sklepów internetowych.",
    features: ["Masowy import zamówień", "Synchronizacja statusów", "Przekazywanie numerów przesyłek", "Mapowanie statusów w tle"],
    status: "active"
  },
  {
    id: "empik",
    name: "Empik Place",
    category: "marketplace",
    description: "Szybko rozwijający się polski marketplace. Pobieranie zamówień i aktualizacja statusów realizacji bezpośrednio z Twojego panelu.",
    features: ["Import zamówień Empik", "Aktualizacja stanów magazynowych", "Przesyłanie numerów listów przewozowych"],
    status: "active"
  },
  {
    id: "erli",
    name: "Erli",
    category: "marketplace",
    description: "Dynamiczna platforma sprzedażowa o niskich prowizjach. Automatyczna wymiana danych o zamówieniach, przesyłkach i stanach magazynowych.",
    features: ["Automatyczny pobór zamówień", "Aktualizacja cen i magazynu", "Synchronizacja wysyłek"],
    status: "active"
  },
  {
    id: "subiekt-gt",
    name: "Subiekt GT",
    category: "erp",
    description: "Najpopularniejszy system ERP dla małych i średnich firm od InsERT. Synchronizacja stanów magazynowych, cenników oraz kartotek produktów.",
    features: ["Synchronizacja stanów 24/7", "Wystawianie faktur (FS) i paragonów", "Rejestracja kartotek produktów", "Automatyczna rezerwacja towarów"],
    status: "active",
    badgeText: "Polecane"
  },
  {
    id: "subiekt-nexo",
    name: "Subiekt nexo PRO",
    category: "erp",
    description: "Nowoczesny system ERP dla wymagających przedsiębiorstw. Bezproblemowa integracja dokumentów sprzedaży i automatyzacja rezerwacji magazynowych.",
    features: ["Wystawianie dokumentów w Nexo", "Automatyczna synchronizacja cen", "Zaawansowana obsługa wielu magazynów"],
    status: "active"
  },
  {
    id: "inpost",
    name: "InPost Shipments",
    category: "courier",
    description: "Bezpośrednie nadawanie paczek w Paczkomatach i przesyłek kurierskich. Generowanie etykiet bezpośrednio z widoku realizacji zamówienia.",
    features: ["Generowanie etykiet PDF", "Automatyczne zlecenie odbiorów", "Wysyłanie numerów śledzenia do Allegro", "Obsługa gabarytów A, B, C"],
    status: "active",
    badgeText: "Najlepszy wybór"
  },
  {
    id: "apaczka",
    name: "Apaczka",
    category: "courier",
    description: "Integrator usług kurierskich. Porównuj oferty wielu przewoźników (DPD, DHL, UPS, FedEx) i nadawaj paczki najtaniej.",
    features: ["Porównywanie cen kurierów", "Generowanie etykiet wielu firm", "Automatyczne powiadomienia klientów"],
    status: "active"
  },
  {
    id: "ksef",
    name: "Krajowy System e-Faktur (KSeF)",
    category: "invoices",
    description: "Pełna zgodność z polskimi przepisami podatkowymi. Automatyczne przesyłanie wystawionych faktur bezpośrednio do rządowego systemu KSeF.",
    features: ["Automatyczny pobór UPO", "Szyfrowane połączenie tokenem", "Walidacja schemy XML", "Generowanie faktur ustrukturyzowanych"],
    status: "active"
  },
  {
    id: "furgonetka",
    name: "Furgonetka",
    category: "courier",
    description: "Wygodny integrator przesyłek kurierskich. Nadawaj paczki u kilkunastu przewoźników bez podpisywania osobnych umów.",
    features: ["Szybki wyceny", "Nadawanie DPD, GLS, Poczta Polska", "Zbiorcze generowanie etykiet"],
    status: "coming_soon"
  },
  {
    id: "wforma",
    name: "wFirma / iFirma",
    category: "invoices",
    description: "Integracja z czołowymi systemami do samodzielnej księgowości online. Przesyłaj automatycznie dane sprzedaży z zamówień do programów księgowych.",
    features: ["Eksport faktur do księgowości", "Synchronizacja kontrahentów", "Automatyczne księgowanie przychodów"],
    status: "coming_soon"
  }
];

const CATEGORIES = [
  { value: "all", label: "Wszystkie", icon: Plug },
  { value: "marketplace", label: "Sklepy i Marketplace", icon: ShoppingBag },
  { value: "erp", label: "Systemy ERP", icon: Database },
  { value: "courier", label: "Kurierzy i Wysyłki", icon: Truck },
  { value: "invoices", label: "KSeF i Faktury", icon: FileText }
];

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIntegrations = useMemo(() => {
    return INTEGRATIONS.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden relative selection:bg-primary selection:text-white">
      {/* Glow background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <MarketingNavbar />

      {/* Main Content */}
      <main className="flex-1 relative z-10 py-16">
        <div className="container mx-auto px-6 lg:px-12 max-w-5xl space-y-12">
          
          {/* Hero Section */}
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Ekosystem SuppSales
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight text-slate-100">
              Wszystkie Integracje <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-500">
                w Jednym Miejscu
              </span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Łączymy najpopularniejsze platformy sprzedażowe, systemy magazynowe ERP oraz spedycje, by w pełni zautomatyzować Twój e-commerce.
            </p>

            {/* Search Input */}
            <div className="relative max-w-md mx-auto pt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj integracji (np. Allegro, Subiekt)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass border-white/10 bg-slate-950/60 text-slate-100 placeholder-slate-500 focus:border-primary/50 shadow-inner h-11"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 border-b border-white/5 pb-6">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.value}
                  variant="ghost"
                  onClick={() => setActiveCategory(cat.value)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all h-9 border flex items-center gap-2",
                    activeCategory === cat.value
                      ? "bg-primary/15 text-primary border-primary/25 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 bg-white/[0.02] border-transparent hover:bg-white/5"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </Button>
              );
            })}
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {filteredIntegrations.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "glass border-white/5 bg-slate-900/20 backdrop-blur-xl rounded-2xl overflow-hidden hover:scale-[1.01] hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full border group",
                  item.status === "active" ? "hover:border-primary/30 hover:shadow-primary/5" : "opacity-75"
                )}
              >
                <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                          <Plug className="h-5 w-5" />
                        </div>
                        <h3 className="font-extrabold text-base text-slate-100">{item.name}</h3>
                      </div>
                      
                      {item.badgeText && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 border text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                          {item.badgeText}
                        </Badge>
                      )}

                      {item.status === "coming_soon" && (
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-slate-700 text-slate-500 bg-slate-950/20 rounded-md">
                          Wkrótce
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {item.features.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Możliwości:</span>
                      <ul className="space-y-1.5">
                        {item.features.map((feat, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-center gap-2 font-medium">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom Call to Action */}
          <div className="rounded-3xl border border-white/5 bg-slate-900/30 backdrop-blur-md p-8 md:p-12 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100">Chcesz zintegrować swój sklep?</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Zarejestruj się za darmo i przetestuj możliwości pełnej automatyzacji Allegro, Subiekta i spedycji przez 14 dni bez zobowiązań.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                asChild
                className="bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl px-6 h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] border-none"
              >
                <Link href="/register" className="flex items-center gap-2">
                  Zacznij za darmo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
