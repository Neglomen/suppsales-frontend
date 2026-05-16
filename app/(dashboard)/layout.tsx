// src/app/(dashboard)/layout.tsx
"use client";

import Link from "next/link";
import { AuthCheck } from "@/components/shared/auth-check";
import { UserNav } from "@/components/shared/user-nav";
import { MainNav } from "@/components/shared/main-nav";
import { MobileNav } from "@/components/shared/mobile-nav";
import { PrintHubIndicator } from "@/components/shared/print-hub-indicator";
import { useNavStore } from "@/store/nav";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"; // Import Button
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip
import { Pin, PinOff } from "lucide-react"; // Import ikon

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed, isPinned, setIsCollapsed, setPinned } = useNavStore();

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsCollapsed(true);
    }
  };

  return (
    <AuthCheck>
      <div
        className={cn(
          "grid min-h-screen w-full transition-[grid-template-columns] duration-300 ease-in-out",
          isCollapsed ? "md:grid-cols-[56px_1fr]" : "md:grid-cols-[280px_1fr]"
        )}
      >
        <div
          className="hidden glass sticky top-0 h-screen z-40 md:block transition-all duration-300"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Używamy `flex flex-col h-full` aby UserNav był na dole kontenera o wysokości ekranu */}
          <div className="flex h-full flex-col relative overflow-hidden">
            <div className={cn(
              "flex h-14 items-center border-b border-border/10 transition-all duration-300 lg:h-[60px]",
              isCollapsed ? "justify-center" : "px-4 lg:px-4 justify-start"
            )}>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 group"
              >
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 text-primary transition-transform duration-500 group-hover:rotate-[360deg]"
                  >
                    <path d="M15 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                  <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <motion.span
                  className="font-bold tracking-tight premium-gradient-text text-lg overflow-hidden whitespace-nowrap"
                  animate={{
                    opacity: isCollapsed ? 0 : 1,
                    width: isCollapsed ? 0 : "auto",
                    marginLeft: isCollapsed ? 0 : "0.5rem",
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  SuppSales
                </motion.span>
              </Link>
            </div>

            {/* --- PRZYCISK PINECZKI PRZENIESIONY TUTAJ --- */}
            <motion.div
              className="absolute top-4 right-0"
              animate={{ opacity: isCollapsed ? 0 : 1, pointerEvents: isCollapsed ? 'none' : 'auto' }}
              transition={{ duration: 0.2 }}
            >
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPinned(!isPinned)}
                    >
                      {isPinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {isPinned ? "Odepnij menu" : "Przypnij menu"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>

            <div className="flex-1 overflow-y-auto pt-4 scrollbar-none">
              <MainNav />
            </div>

            {/* Stopka panelu bocznego z UserNav i statusem PrintHub */}
            <div className={cn(
              "mt-auto border-t border-border/10 transition-all duration-300 flex flex-col items-center overflow-hidden",
              isCollapsed ? "p-2 gap-2" : "p-4 gap-4"
            )}>
              <PrintHubIndicator isCollapsed={isCollapsed} />
              <div className={cn(
                "transition-all duration-300 w-full",
                isCollapsed ? "flex justify-center" : "flex items-center gap-3"
              )}>
                <UserNav showLabel={!isCollapsed} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col relative z-30 min-w-0">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8 max-w-screen-2xl mx-auto w-full">
            {/* Przycisk menu mobilnego na górze strony (tylko na mobile) */}
            <div className="md:hidden flex items-center justify-between mb-4 glass p-2 rounded-xl">
              <MobileNav />
              <div className="font-bold premium-gradient-text">SuppSales</div>
              <UserNav />
            </div>
            {children}
          </main>
          {/* Efekt tła grid */}
          <div className="fixed inset-0 bg-grid-premium -z-10 pointer-events-none opacity-50" />
        </div>
      </div>
    </AuthCheck>
  );
}
