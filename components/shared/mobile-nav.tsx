// src/components/shared/mobile-nav.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { MainNav } from "./main-nav";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sheet when pathname changes (user clicked a nav link)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden bg-slate-900/50 hover:bg-slate-900 border-border/30 rounded-xl h-9 w-9">
          <Menu className="h-4.5 w-4.5" />
          <span className="sr-only">Przełącz menu nawigacji</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" hideCloseButton className="flex flex-col p-0 border-r border-border/20 bg-background/95 backdrop-blur-xl">
        {/* SheetTitle required by Radix for screen reader accessibility — visually hidden */}
        <SheetTitle className="sr-only">Menu nawigacji</SheetTitle>
        <div className="flex h-14 items-center justify-between border-b border-border/10 px-4 shrink-0 bg-slate-950/20">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Logo />
          </Link>
          {/* Wyraźny przycisk zamknięcia */}
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
              <X className="h-4 w-4" />
              <span className="sr-only">Zamknij menu</span>
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <MainNav forceExpand={true} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
