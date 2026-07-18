"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export function MarketingNavbar() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/65 backdrop-blur-md px-6 lg:px-12 h-16 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 group">
        <Logo textClassName="text-slate-100 text-xl" iconClassName="h-8 w-8" />
      </Link>
      <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
        <Link href="/#features" className="hover:text-primary transition-colors">
          Funkcje
        </Link>
        <Link href="/integracje" className="hover:text-primary transition-colors">
          Integracje
        </Link>
        <Link href="/o-nas" className="hover:text-primary transition-colors">
          O nas
        </Link>
        <Link href="/academy" className="hover:text-primary transition-colors flex items-center gap-1">
          Akademia <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        {_hasHydrated && isAuthenticated ? (
          <Button
            asChild
            className="bg-primary hover:bg-primary/95 text-white font-medium rounded-xl px-5 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] border-none"
          >
            <Link href="/dashboard">Przejdź do panelu</Link>
          </Button>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
            >
              Zaloguj się
            </Link>
            <Button
              asChild
              className="bg-primary hover:bg-primary/95 text-white font-medium rounded-xl px-5 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] border-none"
            >
              <Link href="/register">Zacznij teraz</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-slate-950 py-12 px-6 lg:px-12 relative z-10">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm max-w-5xl">
        <Link href="/" className="flex items-center gap-2">
          <Logo textClassName="text-slate-100 text-lg" iconClassName="h-6 w-6" />
        </Link>
        <p className="text-slate-500 text-xs md:text-sm">
          © {new Date().getFullYear()} SuppSales. Wszelkie prawa zastrzeżone.
        </p>
        <div className="flex flex-wrap gap-6 text-slate-400 text-xs sm:text-sm justify-center md:justify-end">
          <Link href="/integracje" className="hover:text-slate-100 transition-colors">
            Integracje
          </Link>
          <Link href="/o-nas" className="hover:text-slate-100 transition-colors">
            O nas
          </Link>
          <Link href="/academy" className="hover:text-slate-100 transition-colors">
            Akademia
          </Link>
          <Link href="/terms" className="hover:text-slate-100 transition-colors border-l border-white/10 pl-6 hidden sm:inline">
            Regulamin
          </Link>
          <Link href="/privacy" className="hover:text-slate-100 transition-colors">
            Polityka prywatności
          </Link>
        </div>
      </div>
    </footer>
  );
}
