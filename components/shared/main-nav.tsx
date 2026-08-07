// src/components/shared/main-nav.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
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
  PackageCheck,
  Headphones,
  TrendingDown,
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

import { usePermissions } from "@/hooks/use-permissions";

// === ZMIANA: Split into Tools and Administration sections ===
const toolItems = [
  { href: "/dashboard", icon: Home, label: "Panel główny", adminOnly: false },
  { href: "/orders", icon: Package, label: "Zamówienia", adminOnly: false, permission: "orders" },
  { href: "/communication", icon: MessagesSquare, label: "Komunikacja", adminOnly: false, permission: "orders" },
  { href: "/shipping/fulfillment", icon: PackageCheck, label: "Nabijarka", adminOnly: false, permission: "shipping", isSpecial: true, mobileHidden: true },
  { href: "/inventory", icon: Boxes, label: "Magazyn", adminOnly: false, permission: "inventory" },
  { href: "/shipping", icon: Ship, label: "Wysyłki", adminOnly: false, permission: "shipping", mobileHidden: true },
  { href: "/dropshipping", icon: Package, label: "Dropshipping", adminOnly: false, permission: "inventory", mobileHidden: true },
  { href: "/invoices", icon: Receipt, label: "Faktury", adminOnly: false, permission: "invoices" },
  { href: "/returns", icon: Undo2, label: "Zwroty", adminOnly: false, permission: "returns" },
];

const configItems = [
  { href: "/integrations", icon: PlugZap, label: "Integracje", adminOnly: false, permission: "integrations", mobileHidden: true },
  { href: "/response-templates", icon: MessagesSquare, label: "Szablony odpowiedzi", adminOnly: false, permission: "templates" },
  { href: "/settings/organization", icon: Building, label: "Ustawienia", adminOnly: false, permission: "settings" },
  { href: "/support", icon: Headphones, label: "Zgłoszenia i pomoc", adminOnly: false },
  { href: "/help", icon: HelpCircle, label: "Instrukcja", adminOnly: false },
  { href: "/superadmin/organizations", icon: Shield, label: "Super Admin", adminOnly: true },
];

interface MainNavProps {
  forceExpand?: boolean;
}

export function MainNav({ forceExpand = false }: MainNavProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isCollapsed: storeCollapsed } = useNavStore();
  const isCollapsed = forceExpand ? false : storeCollapsed;
  const { hasPermission } = usePermissions();

  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);
  const [unreadAdminCount, setUnreadAdminCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await api.get<{ unread_count: number }>("/support/unread-count");
        setUnreadSupportCount(response.data.unread_count);
      } catch (error) {
        // Silently ignore network errors during dev restarts/polling
      }
    };

    const fetchAdminUnreadCount = async () => {
      if (!user.is_super_admin) return;
      try {
        const response = await api.get<{ unread_count: number }>("/superadmin/support/unread-count");
        setUnreadAdminCount(response.data.unread_count);
      } catch (error) {
        // Silently ignore network errors during dev restarts/polling
      }
    };

    fetchUnreadCount();
    fetchAdminUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchAdminUnreadCount();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const renderLink = ({ href, icon: Icon, label, adminOnly, permission, isSpecial, mobileHidden }: typeof toolItems[0]) => {
    if (adminOnly && !user?.is_super_admin) return null;
    if (permission && !hasPermission(permission)) return null;
    // Ukryj pozycje niedostępne na mobile gdy jesteśmy w szufladzie mobilnej (forceExpand)
    if (mobileHidden && forceExpand) return null;
    
    // Zapobiega jednoczesnemu podświetlaniu /shipping i /shipping/fulfillment
    const isActive =
      href === "/shipping"
        ? pathname === "/shipping" || (pathname.startsWith("/shipping/") && !pathname.startsWith("/shipping/fulfillment"))
        : href === "/dashboard"
        ? pathname === href
        : pathname.startsWith(href);

    const getBadgeCount = () => {
      if (href === "/support") return unreadSupportCount;
      if (href === "/superadmin/organizations") return unreadAdminCount;
      return 0;
    };
    const badgeCount = getBadgeCount();

    return isCollapsed ? (
      <Tooltip key={href}>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group border border-transparent",
              isActive
                ? "bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-[0_4px_20px_-3px_rgba(0,0,0,0.1)] shadow-primary/40 ring-1 ring-primary/30 scale-105 font-semibold"
                : isSpecial
                ? "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 hover:scale-110"
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
                className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full"
              />
            )}
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-pulse shadow-sm">
                {badgeCount}
              </span>
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
          "group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden border border-transparent",
          isActive
            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_4px_20px_-3px_rgba(0,0,0,0.1)] shadow-primary/40 ring-1 ring-primary/30 translate-x-1 font-semibold"
            : isSpecial
            ? "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20 hover:translate-x-1"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:translate-x-1 hover:border-primary/5"
        )}
      >
        <Icon className={cn(
          "h-4.5 w-4.5 transition-transform duration-300",
          !isActive && "group-hover:rotate-12"
        )} />
        <span className="flex-1">{label}</span>
        {badgeCount > 0 && (
          <span className={cn(
            "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold shadow-sm animate-pulse",
            href === "/superadmin/organizations" ? "bg-purple-600 text-white" : "bg-destructive text-destructive-foreground"
          )}>
            {badgeCount}
          </span>
        )}
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
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex-grow flex flex-col justify-between">
        {/* Top: Tools */}
        <div className="space-y-2">
          {!isCollapsed && (
            <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 select-none">
              Narzędzia
            </div>
          )}
          <nav className={cn(
            "grid items-start gap-1 text-sm font-medium transition-all duration-300",
            isCollapsed ? "px-2 lg:px-2 justify-center" : "px-2 lg:px-4"
          )}>
            {toolItems.map((item) => renderLink(item))}
          </nav>
        </div>

        {/* Bottom: Settings, Support & Admin */}
        <div className="space-y-2 mt-auto pt-6 border-t border-border/10">
          {!isCollapsed && (
            <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 select-none">
              Ustawienia i pomoc
            </div>
          )}
          <nav className={cn(
            "grid items-start gap-1 text-sm font-medium transition-all duration-300",
            isCollapsed ? "px-2 lg:px-2 justify-center" : "px-2 lg:px-4"
          )}>
            {configItems.map((item) => renderLink(item))}
          </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}
