// src/components/shared/user-nav.tsx
"use client";

import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface UserNavProps {
  showLabel?: boolean;
}

export function UserNav({ showLabel }: UserNavProps) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("");
    }
    return user?.email?.[0].toUpperCase() || "U";
  };

  return (
    <div className={cn("flex items-center gap-3", showLabel ? "w-full" : "justify-center")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn(
            "relative h-10 w-10 rounded-xl transition-all hover:scale-105 active:scale-95 group p-0",
            showLabel && "h-12 w-12"
          )}>
            <Avatar className={cn("h-10 w-10 rounded-xl", showLabel && "h-12 w-12")}>
              <AvatarImage src="/avatars/01.png" alt="@shadcn" />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-primary/20 blur-lg rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 glass" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none premium-gradient-text">
                {user?.name || "Użytkownik"}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings/organization")} className="rounded-lg">
            Ustawienia
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg"
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Zmień motyw
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg font-medium">
            Wyloguj się
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showLabel && (
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-sm font-bold truncate premium-gradient-text">
            {user?.name || "Twoje Konto"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>
      )}
    </div>
  );
}
