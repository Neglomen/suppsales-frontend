// src/app/(dashboard)/settings/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="settings">{children}</PermissionGuard>;
}
