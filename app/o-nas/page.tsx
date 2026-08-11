"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Sparkles,
  Users,
  Shield,
  Zap,
  TrendingUp,
  Cpu,
  Clock,
  Heart,
  ArrowRight
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { AnimatedBackground } from "@/components/shared/grid-background";
import { motion } from "framer-motion";
import { MarketingNavbar, MarketingFooter } from "@/components/shared/marketing-nav";

interface ValueCard {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const VALUES: ValueCard[] = [
  {
    icon: Zap,
    title: "Maksymalna Automatyzacja",
    description: "Eliminujemy powtarzalne, nudne zadania manualne. Wierzymy, że czas ludzi jest zbyt cenny, aby marnować go na ręczne przepisywanie danych."
  },
  {
    icon: Shield,
    title: "Maksymalne Bezpieczeństwo",
    description: "Klucze API i połączenia z KSeF są w SuppSales w pełni bezpieczne. Szyfrujemy kluczowe dane algorytmami AES-256, gwarantując pełną prywatność."
  },
  {
    icon: Cpu,
    title: "Stabilność i Technologia",
    description: "Nasz stack opiera się na mikrousługach i szybkich bazach danych. Monitorujemy połączenia w trybie ciągłym, zapobiegając utracie jakichkolwiek transakcji."
  },
  {
    icon: Heart,
    title: "Partnerstwo i Słuchanie",
    description: "Projektujemy aplikację w oparciu o sugestie i potrzeby naszych użytkowników. Twoja opinia bezpośrednio kształtuje kierunek naszego rozwoju."
  }
];

export default function AboutUsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground dark:text-slate-100 overflow-x-hidden relative selection:bg-primary selection:text-white transition-colors duration-500">
      {/* Decorative Radial Glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/5 dark:bg-purple-600/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <MarketingNavbar />

      {/* Main Content */}
      <main className="flex-1 relative z-10 py-16">
        <div className="container mx-auto px-6 lg:px-12 max-w-5xl space-y-20">
          
          {/* Hero Section */}
          <div className="text-center space-y-5 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary dark:text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-primary/5">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Nasza Misja
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight text-foreground">
              E-commerce Bez <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-500">
                Ręcznej Pracy
              </span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Jesteśmy zespołem sprzedawców i inżynierów, którzy połączyli siły, by stworzyć najwygodniejsze, nowoczesne oprogramowanie automatyzujące procesy sprzedażowe.
            </p>
          </div>

          {/* Stats section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl glass border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-slate-900/10 backdrop-blur-sm shadow-sm">
              <span className="text-3xl sm:text-4xl font-extrabold text-foreground block">10M+</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider block mt-2">Zleconych Paczek</span>
            </div>
            <div className="p-6 rounded-2xl glass border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-slate-900/10 backdrop-blur-sm shadow-sm">
              <span className="text-3xl sm:text-4xl font-extrabold text-primary block">99.9%</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider block mt-2">Uptime serwera</span>
            </div>
            <div className="p-6 rounded-2xl glass border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-slate-900/10 backdrop-blur-sm shadow-sm">
              <span className="text-3xl sm:text-4xl font-extrabold text-foreground block">15 tys.</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider block mt-2">Zaoszczędzonych godzin</span>
            </div>
            <div className="p-6 rounded-2xl glass border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-slate-900/10 backdrop-blur-sm shadow-sm">
              <span className="text-3xl sm:text-4xl font-extrabold text-purple-600 dark:text-purple-400 block">&lt; 3s</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider block mt-2">Czas synchronizacji</span>
            </div>
          </div>

          {/* Story / Mission split section */}
          <div className="grid md:grid-cols-12 gap-8 items-center pt-6">
            <div className="md:col-span-7 space-y-5">
              <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Jak powstał SuppSales?
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Pomysł na platformę SuppSales narodził się w magazynie e-commerce. Jako aktywni sprzedawcy na Allegro i Empiku, spędzaliśmy codziennie długie godziny na przepisywaniu adresów do systemów spedycyjnych, wystawianiu faktur w zewnętrznych programach i ręcznym sprawdzaniu stanów magazynowych na ERP.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Zdaliśmy sobie sprawę, że dostępne na rynku narzędzia są albo przestarzałe i trudne w obsłudze, albo wymagają ogromnych budżetów wdrożeniowych. Postanowiliśmy to zmienić i stworzyć intuicyjny, stabilny system SaaS, który integruje się z systemami w kilka kliknięć i robi wszystko za sprzedawcę w ułamku sekundy.
              </p>
            </div>
            <div className="md:col-span-5 relative">
              <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full scale-90 pointer-events-none" />
              <div className="glass border-slate-200/65 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl shadow-2xl space-y-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Nasza Wizja:</h4>
                <blockquote className="text-foreground/80 dark:text-slate-300 italic text-sm leading-relaxed">
                  &quot;Chcemy umożliwić każdemu sklepowi internetowemu – od małych, rodzinnych biznesów po duże korporacje – pełne zautomatyzowanie logistyki i rozliczeń, uwalniając ich od biurokracji i rutyny.&quot;
                </blockquote>
              </div>
            </div>
          </div>

          {/* Values Grid */}
          <div className="space-y-8 pt-6">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Nasze Wartości</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Zasady, którymi kierujemy się każdego dnia przy budowie aplikacji i wsparciu naszych klientów.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {VALUES.map((val, idx) => {
                const Icon = val.icon;
                return (
                  <Card key={idx} className="glass border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-slate-900/20 backdrop-blur-xl rounded-2xl overflow-hidden hover:border-primary/20 hover:shadow-lg transition-all duration-300 group">
                    <CardContent className="p-6 flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-extrabold text-base text-foreground">{val.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{val.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md p-8 md:p-12 text-center space-y-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-primary/5 dark:bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">Zautomatyzuj swój e-commerce dzisiaj</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Dołącz do setek sprzedawców, którzy oszczędzają czas i pieniądze z SuppSales.
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
      <MarketingFooter />
    </div>
  );
}
