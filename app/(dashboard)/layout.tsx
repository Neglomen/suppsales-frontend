// src/app/(dashboard)/layout.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthCheck } from "@/components/shared/auth-check";
import { UserNav } from "@/components/shared/user-nav";
import { MainNav } from "@/components/shared/main-nav";
import { MobileNav } from "@/components/shared/mobile-nav";
import { PrintHubIndicator } from "@/components/shared/print-hub-indicator";
import { ErpStatusIndicator } from "@/components/shared/erp-status-indicator";
import { useNavStore } from "@/store/nav";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"; // Import Button
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip
import { Pin, PinOff, ShieldAlert } from "lucide-react"; // Import ikon
import { Logo } from "@/components/shared/logo";
import { SupportWidget } from "@/components/shared/support-widget";
import { GlobalSearch } from "@/components/shared/global-search";
import { TasksBubble } from "@/components/shared/tasks-bubble";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonateEmail, setImpersonateEmail] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalAdmin = localStorage.getItem("original_admin_auth");
      if (originalAdmin) {
        setIsImpersonating(true);
        if (user) {
          setImpersonateEmail(user.email);
        }
      }
    }
  }, [user]);

  const handleStopImpersonation = () => {
    const originalAdmin = localStorage.getItem("original_admin_auth");
    if (originalAdmin) {
      const { token, user: adminUser } = JSON.parse(originalAdmin);
      useAuthStore.setState({ token, user: adminUser, isAuthenticated: true });
      localStorage.removeItem("original_admin_auth");
      window.location.href = "/superadmin/organizations";
    }
  };
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
      <div className="flex min-h-screen w-full">
        <div
          className={cn(
            "hidden glass fixed left-0 top-0 h-screen z-50 md:block transition-all duration-300 border-r border-border/10",
            isCollapsed ? "w-[56px]" : "w-[280px]",
            !isPinned && !isCollapsed ? "shadow-2xl shadow-indigo-500/10" : ""
          )}
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
                <Logo showText={!isCollapsed} />
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

            <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-none flex flex-col">
              <MainNav />
            </div>

            {/* Stopka panelu bocznego z UserNav i statusem PrintHub */}
            <div className={cn(
              "mt-auto border-t border-border/10 transition-all duration-300 flex flex-col items-center overflow-hidden shrink-0",
              isCollapsed ? "p-2 gap-2" : "p-3.5 gap-3 lg:gap-4"
            )}>
              {/* Grupowanie indykatorów w wiersz przy niskiej wysokości ekranu */}
              <div className={cn(
                "w-full flex gap-2 transition-all duration-300",
                isCollapsed ? "flex-col items-center" : "flex-col sidebar-indicators-row"
              )}>
                <div className="flex-1 min-w-0 w-full">
                  <ErpStatusIndicator isCollapsed={isCollapsed} />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <PrintHubIndicator isCollapsed={isCollapsed} />
                </div>
              </div>

              <div className={cn(
                "transition-all duration-300 w-full",
                isCollapsed ? "flex justify-center" : "flex items-center gap-3"
              )}>
                <UserNav showLabel={!isCollapsed} />
              </div>
            </div>
          </div>
        </div>

        <div className={cn(
          "flex flex-col relative z-30 min-w-0 w-full transition-[margin] duration-300 ease-in-out",
          isPinned ? "md:ml-[280px]" : "md:ml-[56px]"
        )}>
          {/* Floating Search dla Desktopu - Maksymalnie po prawej */}
          <div className="hidden md:flex absolute top-4 right-4 lg:top-6 lg:right-6 z-50 items-center gap-3">
            <SupportWidget inline={true} />
            <GlobalSearch />
          </div>

          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 xl:gap-8 xl:p-8 max-w-screen-2xl mx-auto w-full">
            {/* Przycisk menu mobilnego na górze strony (tylko na mobile) */}
            <div className="md:hidden flex items-center justify-between mb-4 glass p-2 rounded-xl gap-2 min-w-0 overflow-visible">
              <div className="shrink-0">
                <MobileNav />
              </div>
              <div className="font-bold premium-gradient-text flex-1 text-center truncate text-sm min-w-0">SuppSales</div>
              <div className="shrink-0">
                <UserNav />
              </div>
            </div>

            {/* Mobile search bar */}
            <div className="md:hidden mb-4">
              <GlobalSearch />
            </div>
            {isImpersonating && (
              <div className="mb-4 flex items-center justify-between gap-4 p-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl shadow-lg border border-amber-500/20">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>Tryb impersonacji: pracujesz jako <strong className="underline">{impersonateEmail}</strong> (Super Admin)</span>
                </div>
                <Button 
                  onClick={handleStopImpersonation}
                  size="sm"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-lg whitespace-nowrap text-xs h-8"
                >
                  Zakończ i wróć
                </Button>
              </div>
            )}
            {children}
          </main>
          {/* Wewnętrzny Dymek Zadań (TaskBubble) */}
          <TasksBubble />
          {/* Premium Ambient Background */}
          <div className="fixed inset-0 bg-background -z-30 pointer-events-none" />
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_50%)] -z-20 pointer-events-none" />
          <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.04),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.06),transparent_50%)] -z-20 pointer-events-none" />
          <div className="fixed inset-0 bg-grid-premium -z-10 pointer-events-none opacity-[0.15] dark:opacity-[0.25]" />
        </div>
      </div>
    </AuthCheck>
  );
}
