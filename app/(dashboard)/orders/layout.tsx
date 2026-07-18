// src/app/(dashboard)/orders/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="orders">{children}</PermissionGuard>;
}
