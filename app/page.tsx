// src/app/page.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  TrendingUp,
  Layers,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  Plug,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThreeDGlobe } from "@/components/shared/three-d-globe";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { MarketingNavbar, MarketingFooter } from "@/components/shared/marketing-nav";

export default function HomePage() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  } as const;

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  } as const;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden relative selection:bg-primary selection:text-white">
      {/* 3D Particle Sphere Background */}
      <div className="absolute inset-0 h-[100vh] w-full z-0 pointer-events-none opacity-80">
        <ThreeDGlobe />
      </div>

      {/* Decorative Radial Poświaty (Glows) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[40vh] right-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Header / Navbar */}
      <MarketingNavbar />

      {/* Main Section */}
      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="w-full pt-16 pb-24 md:pt-28 md:pb-36 lg:pt-36 lg:pb-44 flex items-center">
          <div className="container mx-auto px-6 lg:px-12">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center"
            >
              {/* Left Column: Copy */}
              <div className="lg:col-span-7 space-y-8 text-left max-w-2xl">
                <motion.div variants={itemVariants}>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary-foreground text-xs font-semibold tracking-wide uppercase">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Nowa Generacja Automatyzacji
                  </span>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-100"
                >
                  Zautomatyzuj Swój <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-pink-500">
                    E-commerce
                  </span>{" "}
                  Jak Nigdy Dotąd
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="text-slate-400 text-lg md:text-xl font-normal leading-relaxed"
                >
                  Nasza platforma SaaS integruje wszystkie Twoje kanały sprzedaży,
                  automatyzuje wysyłki oraz rozliczenia i pozwala Ci skupić się na tym, co
                  najważniejsze — na rozwoju biznesu.
                </motion.p>

                <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
                  {_hasHydrated && isAuthenticated ? (
                    <Button
                      asChild
                      size="lg"
                      className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-medium rounded-xl px-8 h-12 shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all hover:scale-[1.01] active:scale-[0.99] border-none"
                    >
                      <Link href="/dashboard" className="flex items-center gap-2">
                        Przejdź do panelu <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button
                        asChild
                        size="lg"
                        className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white font-medium rounded-xl px-8 h-12 shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all hover:scale-[1.01] active:scale-[0.99] border-none"
                      >
                        <Link href="/register" className="flex items-center gap-2">
                          Wypróbuj za darmo <ArrowRight className="h-5 w-5" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="border-white/10 hover:border-white/20 text-slate-300 hover:text-slate-100 bg-slate-900/30 hover:bg-slate-900/50 backdrop-blur-sm rounded-xl px-8 h-12 transition-all"
                      >
                        <a href="#features">Zobacz funkcje</a>
                      </Button>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Right Column: Premium Mockup/3D Elements */}
              <motion.div
                variants={itemVariants}
                className="lg:col-span-5 relative flex justify-center items-center"
              >
                {/* Glow behind the mockup */}
                <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full scale-90 pointer-events-none" />

                {/* Dashboard glass mockup */}
                <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-xl p-5 shadow-2xl relative group overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/20 blur-2xl rounded-full" />
                  
                  {/* Top Bar with window control circles */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                      Live Panel
                    </span>
                  </div>

                  {/* Mockup content: stats and graph */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-semibold block">Dzisiejsza sprzedaż</span>
                        <span className="text-lg font-bold text-slate-100 block mt-0.5">zł 12 458.00</span>
                        <span className="text-[9px] text-emerald-400 font-semibold mt-1 inline-flex items-center gap-0.5">
                          +18.4% dzisiaj
                        </span>
                      </div>
                      <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-semibold block">Zlecone przesyłki</span>
                        <span className="text-lg font-bold text-slate-100 block mt-0.5">142 paczek</span>
                        <span className="text-[9px] text-primary font-semibold mt-1 inline-flex items-center gap-0.5">
                          99.2% skuteczności
                        </span>
                      </div>
                    </div>

                    {/* Stylized Integration Badges */}
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Status Integracji</span>
                        <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aktywne
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium flex items-center gap-1.5">
                          <Plug className="h-3 w-3 text-amber-500" /> Allegro
                        </span>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium flex items-center gap-1.5">
                          <Plug className="h-3 w-3 text-indigo-500" /> BaseLinker
                        </span>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-300 font-medium flex items-center gap-1.5">
                          <Plug className="h-3 w-3 text-rose-500" /> Apaczka
                        </span>
                      </div>
                    </div>

                    {/* Progress bar visualizer */}
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Automatyzacja procesów</span>
                        <span className="text-slate-100 font-bold">85%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-purple-600 h-full w-[85%] rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section id="features" className="w-full py-20 border-t border-white/5 bg-slate-950 relative">
          {/* Subtle glow effect behind features */}
          <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                Zalety platformy
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100">
                Wszystko czego potrzebujesz w jednym miejscu
              </h2>
              <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                Poznaj potężne narzędzia automatyzacji, które pomogą Ci przeskalować sprzedaż,
                zmniejszyć błędy operacyjne i zaoszczędzić godziny codziennej pracy.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="glass border-white/5 bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                    <Zap className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Pełna Automatyzacja</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Automatyczne pobieranie zamówień, aktualizacja stanów magazynowych oraz
                    wystawianie przesyłek bez konieczności klikania.
                  </p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 blur-2xl rounded-full group-hover:bg-primary/10 transition-colors" />
              </div>

              {/* Feature 2 */}
              <div className="glass border-white/5 bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Szybsza Skalowalność</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Rozwijaj swoją ofertę i wolumen sprzedaży na wielu platformach jednocześnie,
                    zarządzając wszystkim z jednego widoku.
                  </p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-purple-500/5 blur-2xl rounded-full group-hover:bg-purple-500/10 transition-colors" />
              </div>

              {/* Feature 3 */}
              <div className="glass border-white/5 bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Integracje Multichannel</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Jedno kliknięcie pozwala podpiąć konta Allegro, Empik, BaseLinker, KSeF
                    oraz czołowe firmy kurierskie.
                  </p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full group-hover:bg-blue-500/10 transition-colors" />
              </div>

              {/* Feature 4 */}
              <div className="glass border-white/5 bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform duration-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Stabilność i Bezpieczeństwo</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Zaawansowane mechanizmy synchronizacji i ciągły monitoring zapobiegają
                    opóźnieniom i błędom w wysyłkach do Twoich klientów.
                  </p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-pink-500/5 blur-2xl rounded-full group-hover:bg-pink-500/10 transition-colors" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
