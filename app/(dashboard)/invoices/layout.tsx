// src/app/(dashboard)/invoices/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="invoices">{children}</PermissionGuard>;
}
