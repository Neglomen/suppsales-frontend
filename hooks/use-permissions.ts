// src/hooks/use-permissions.ts
import { useAuthStore } from "@/store/auth";

export function usePermissions() {
  const { user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Super admin ma pełny dostęp do wszystkiego w systemie
    if (user.is_super_admin) return true;
    
    // Właściciel i administrator mają pełny dostęp w swojej organizacji
    if (user.organization?.role === "OWNER" || user.organization?.role === "ADMIN") {
      return true;
    }
    
    // Zwykły członek potrzebuje jawnego wpisu w tablicy permissions
    return user.organization?.permissions?.includes(permission) || false;
  };

  const isOwnerOrAdmin = (): boolean => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return user.organization?.role === "OWNER" || user.organization?.role === "ADMIN";
  };

  return { hasPermission, isOwnerOrAdmin, role: user?.organization?.role || null };
}
