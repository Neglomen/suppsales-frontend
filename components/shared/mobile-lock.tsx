"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, Laptop } from "lucide-react";

interface MobileLockProps {
  title?: string;
  description?: string;
}

export function MobileLock({
  title = "Funkcja niedostępna na urządzeniach mobilnych",
  description = "Ze względów bezpieczeństwa oraz ograniczeń interfejsu, zarządzanie tą sekcją jest możliwe wyłącznie na komputerach stacjonarnych i laptopach.",
}: MobileLockProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] px-4 py-12 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-primary/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

      <div className="max-w-md w-full glass-dark p-8 rounded-3xl border border-border/30 shadow-2xl relative z-10 text-center flex flex-col items-center gap-6">
        <div className="p-4 bg-gradient-to-tr from-amber-500/20 to-primary/20 rounded-2xl border border-border/40 text-amber-500 dark:text-amber-400 shadow-inner">
          <ShieldAlert className="h-10 w-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground leading-tight">
            {title}
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        </div>

        <div className="w-full pt-2 flex flex-col gap-2">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground bg-slate-950/20 py-1.5 px-3 rounded-lg border border-border/20">
            <Laptop className="h-3.5 w-3.5" />
            <span>Zalecana rozdzielczość: min. 1024px</span>
          </div>

          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-gradient-to-r from-primary to-indigo-650 text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all cursor-pointer font-bold text-xs h-10 mt-2 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do pulpitu głównego
          </Button>
        </div>
      </div>
    </div>
  );
}
