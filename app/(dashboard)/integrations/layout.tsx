// src/app/(dashboard)/integrations/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="integrations">{children}</PermissionGuard>;
}
