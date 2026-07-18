// app/(superadmin)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { Logo } from "@/components/shared/logo";
import { UserNav } from "@/components/shared/user-nav";
import { Loader2, ShieldCheck, LayoutDashboard, Building2, Settings2, MessageSquare, HelpCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/superadmin", label: "Pulpit", icon: LayoutDashboard },
  { href: "/superadmin/organizations", label: "Organizacje", icon: Building2 },
  { href: "/superadmin/tickets", label: "Zgłoszenia", icon: MessageSquare },
  { href: "/superadmin/config", label: "Konfiguracja", icon: Settings2 },
  { href: "/superadmin/help", label: "Poradniki wideo", icon: HelpCircle },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (!user?.is_super_admin) { router.replace("/dashboard"); }
  }, [_hasHydrated, isAuthenticated, user, router]);

  useEffect(() => {
    if (!user?.is_super_admin) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await api.get<{ unread_count: number }>("/superadmin/support/unread-count");
        setUnreadCount(response.data.unread_count);
      } catch (error) {
        console.error("Failed to fetch admin unread support count", error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (!_hasHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_super_admin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Premium ambient background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.04),transparent_50%)] pointer-events-none -z-10" />

      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-6 px-6 max-w-screen-2xl mx-auto">
          <Logo showText />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Panel Wsparcia</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 ml-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/superadmin"
                ? pathname === "/superadmin"
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.href === "/superadmin/tickets" && unreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground animate-pulse shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <UserNav showLabel />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

