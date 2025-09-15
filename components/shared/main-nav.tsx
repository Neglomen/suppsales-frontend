"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Shield,
  PlugZap,
  Undo2,
  MessagesSquare,
  Building,
  Ship,
  Truck,
  ChevronDown,
  Link as LinkIcon,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

// ### START POPRAWKI: Definiujemy typy dla nawigacji ###
type NavLink = {
  href: string;
  icon: ForwardRefExoticComponent<
    Omit<SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>
  >;
  label: string;
  adminOnly?: boolean;
  subItems?: never; // Jawnie mówimy, że NavLink nie może mieć subItems
};

type NavAccordion = {
  href?: never; // NavAccordion nie ma głównego linku
  icon: ForwardRefExoticComponent<
    Omit<SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>
  >;
  label: string;
  adminOnly?: boolean;
  subItems: NavLink[]; // subItems to tablica NavLink
};

type NavItem = NavLink | NavAccordion;
// ### KONIEC POPRAWKI ###

const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Panel główny" },
  { href: "/shipping", icon: Ship, label: "Centrum Wysyłek" },
  { href: "/dropshipping", icon: Truck, label: "Dropshipping" },
  { href: "/orders", icon: Package, label: "Zamówienia" },
  { href: "/returns", icon: Undo2, label: "Zwroty" },
  {
    href: "/response-templates",
    icon: MessagesSquare,
    label: "Szablony odpowiedzi",
  },
  // ### START POPRAWKI: Zagnieżdżona struktura ###
  {
    icon: Building,
    label: "Ustawienia",
    subItems: [
      { href: "/settings/organization", icon: Building, label: "Organizacja" },
      { href: "/settings/integrations", icon: PlugZap, label: "Integracje" },
      {
        href: "/settings/product-mappings",
        icon: LinkIcon,
        label: "Mapowania Produktów",
      },
    ],
  },
  // ### KONIEC POPRAWKI ###
  {
    href: "/superadmin/organizations",
    icon: Shield,
    label: "Super Admin",
    adminOnly: true,
  },
];

export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isCollapsed } = useNavStore();

  if (!user) return null;

  // Logika dla zwiniętego menu musi być inna
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems
            .flatMap((item) => (item.subItems ? item.subItems : [item]))
            .map(({ href, icon: Icon, label, adminOnly }) => {
              if (adminOnly && !user?.is_super_admin) return null;
              const isActive = pathname === href;
              return (
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
              );
            })}
        </nav>
      </TooltipProvider>
    );
  }

  // Logika dla rozwiniętego menu
  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={["Ustawienia"]}
      >
        {navItems.map(({ href, icon: Icon, label, adminOnly, subItems }) => {
          if (adminOnly && !user?.is_super_admin) return null;

          if (subItems) {
            return (
              <AccordionItem key={label} value={label} className="border-b-0">
                <AccordionTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline [&[data-state=open]>svg:last-child]:rotate-180">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 ml-auto" />
                </AccordionTrigger>
                <AccordionContent className="pl-8 pt-1 pb-0">
                  <nav className="grid gap-1">
                    {subItems.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                          pathname === sub.href && "bg-muted text-primary"
                        )}
                      >
                        <sub.icon className="h-4 w-4" />
                        {sub.label}
                      </Link>
                    ))}
                  </nav>
                </AccordionContent>
              </AccordionItem>
            );
          }

          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href!}
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
      </Accordion>
    </nav>
  );
}
