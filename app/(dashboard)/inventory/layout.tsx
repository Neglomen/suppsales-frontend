// src/app/(dashboard)/inventory/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="inventory">{children}</PermissionGuard>;
}
