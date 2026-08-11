"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { Sparkles, Sun, Moon } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors shrink-0"
    >
      {theme === "dark" ? (
        <Sun className="h-4.5 w-4.5" />
      ) : (
        <Moon className="h-4.5 w-4.5" />
      )}
      <span className="sr-only">Przełącz motyw</span>
    </Button>
  );
}

export function MarketingNavbar() {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/65 backdrop-blur-md px-6 lg:px-12 h-16 flex items-center justify-between transition-colors duration-300">
      <Link href="/" className="flex items-center gap-2 group">
        <Logo textClassName="text-foreground text-xl" iconClassName="h-8 w-8" />
      </Link>
      <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground dark:text-slate-300">
        <Link href="/#features" className="hover:text-foreground dark:hover:text-white transition-colors">
          Funkcje
        </Link>
        <Link href="/integracje" className="hover:text-foreground dark:hover:text-white transition-colors">
          Integracje
        </Link>
        <Link href="/o-nas" className="hover:text-foreground dark:hover:text-white transition-colors">
          O nas
        </Link>
        <Link href="/academy" className="hover:text-foreground dark:hover:text-white transition-colors flex items-center gap-1">
          Akademia <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        </Link>
      </nav>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        
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
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
    <footer className="border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 py-12 px-6 lg:px-12 relative z-10 transition-colors duration-300">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm max-w-5xl">
        <Link href="/" className="flex items-center gap-2">
          <Logo textClassName="text-foreground text-lg" iconClassName="h-6 w-6" />
        </Link>
        <p className="text-muted-foreground text-xs md:text-sm">
          © {new Date().getFullYear()} SuppSales. Wszelkie prawa zastrzeżone.
        </p>
        <div className="flex flex-wrap gap-6 text-muted-foreground text-xs sm:text-sm justify-center md:justify-end">
          <Link href="/integracje" className="hover:text-foreground transition-colors">
            Integracje
          </Link>
          <Link href="/o-nas" className="hover:text-foreground transition-colors">
            O nas
          </Link>
          <Link href="/academy" className="hover:text-foreground transition-colors">
            Akademia
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors border-l border-slate-200 dark:border-white/10 pl-6 hidden sm:inline">
            Regulamin
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Polityka prywatności
          </Link>
        </div>
      </div>
    </footer>
  );
}
