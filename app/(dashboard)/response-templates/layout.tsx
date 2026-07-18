// src/app/(dashboard)/response-templates/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ResponseTemplatesLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="templates">{children}</PermissionGuard>;
}
