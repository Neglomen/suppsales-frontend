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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useNavStore } from "@/store/nav";
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
    href: "/integrations",
    icon: PlugZap,
    label: "Integracje",
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
    label: "Organizacja",
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
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
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
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="sr-only">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive && "bg-muted text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
