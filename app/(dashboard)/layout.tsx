// src/app/(dashboard)/layout.tsx
"use client";

import Link from "next/link";
import { AuthCheck } from "@/components/shared/auth-check";
import { UserNav } from "@/components/shared/user-nav";
import { MainNav } from "@/components/shared/main-nav";
import { MobileNav } from "@/components/shared/mobile-nav";
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
          className="hidden border-r bg-muted/40 md:block"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Używamy `relative` na kontenerze, aby pozycjonować pinezkę */}
          <div className="flex h-full max-h-screen flex-col gap-2 relative">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-4 justify-start">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-primary flex-shrink-0"
                >
                  <path d="M15 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" />
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <motion.span
                  className="overflow-hidden whitespace-nowrap"
                  animate={{
                    opacity: isCollapsed ? 0 : 1,
                    width: isCollapsed ? 0 : "auto",
                    marginLeft: isCollapsed ? 0 : "0.5rem",
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  SaaS E-commerce
                </motion.span>
              </Link>
            </div>

            {/* --- PRZYCISK PINECZKI PRZENIESIONY TUTAJ --- */}
            <motion.div
              className="absolute top-4 right-2"
              animate={{ opacity: isCollapsed ? 0 : 1 }}
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

            <div className="flex-1 overflow-y-auto pt-4">
              <MainNav />
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <MobileNav />
            <div className="w-full flex-1"></div>
            <UserNav />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthCheck>
  );
}
