// src/app/(dashboard)/shipping/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="shipping">{children}</PermissionGuard>;
}
