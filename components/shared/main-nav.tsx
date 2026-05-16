// src/components/shared/main-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// === ZMIANA: Dodajemy nową ikonę ===
import {
  Home,
  Package,
  Users,
  Shield,
  PlugZap,
  Undo2,
  MessagesSquare,
  Building,
  Ship,
  Receipt,
  HelpCircle,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useNavStore } from "@/store/nav";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// === ZMIANA: Dodajemy nowy element nawigacji ===
const navItems = [
  { href: "/dashboard", icon: Home, label: "Panel główny", adminOnly: false },
  {
    href: "/inventory",
    icon: Boxes,
    label: "Magazyn",
    adminOnly: false,
  },
  {
    href: "/integrations",
    icon: PlugZap,
    label: "Integracje",
    adminOnly: false,
  },
  {
    href: "/shipping",
    icon: Ship,
    label: "Wysyłki",
    adminOnly: false,
  },
  {
    href: "/dropshipping",
    icon: Package,
    label: "Dropshipping",
    adminOnly: false,
  },
  {
    href: "/invoices",
    icon: Receipt,
    label: "Faktury",
    adminOnly: false,
  },
  { href: "/orders", icon: Package, label: "Zamówienia", adminOnly: false },
  { href: "/returns", icon: Undo2, label: "Zwroty", adminOnly: false },
  // Nowy link do szablonów odpowiedzi
  {
    href: "/response-templates",
    icon: MessagesSquare,
    label: "Szablony odpowiedzi",
    adminOnly: false,
  },
  {
    href: "/settings/organization",
    icon: Building,
    label: "Ustawienia",
    adminOnly: false,
  },
  {
    href: "/help",
    icon: HelpCircle,
    label: "Instrukcja",
    adminOnly: false,
  },
  {
    href: "/superadmin/organizations",
    icon: Shield,
    label: "Super Admin",
    adminOnly: true,
  },
];
// Zmieniłem kolejność, aby "Użytkownicy" byli bliżej ustawień, a "Super Admin" na końcu.

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isCollapsed } = useNavStore();

  if (!user) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <nav className={cn(
        "grid items-start text-sm font-medium transition-all duration-300",
        isCollapsed ? "px-2 lg:px-2 justify-center" : "px-2 lg:px-4"
      )}>
        {navItems.map(({ href, icon: Icon, label, adminOnly }) => {
          if (adminOnly && !user?.is_super_admin) return null;
          const isActive =
            href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href);

          return isCollapsed ? (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group",
                    isActive
                      ? "bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-[0_4px_20px_-3px_rgba(0,0,0,0.1)] shadow-primary/40 ring-1 ring-primary/30 scale-105"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:scale-110"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    !isActive && "group-hover:rotate-12"
                  )} />
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-dot"
                      className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full"
                    />
                  )}
                  <span className="sr-only">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="glass font-medium">{label}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_4px_20px_-3px_rgba(0,0,0,0.1)] shadow-primary/40 ring-1 ring-primary/30 translate-x-1"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:translate-x-1"
              )}
            >
              <Icon className={cn(
                "h-4.5 w-4.5 transition-transform duration-300",
                !isActive && "group-hover:rotate-12"
              )} />
              {label}
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute left-0 w-1 h-6 bg-primary-foreground/50 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
