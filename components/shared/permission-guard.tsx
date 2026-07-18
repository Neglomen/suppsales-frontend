// src/components/shared/permission-guard.tsx
"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
