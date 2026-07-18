// src/app/(dashboard)/returns/layout.tsx
"use client";

import { PermissionGuard } from "@/components/shared/permission-guard";

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permission="returns">{children}</PermissionGuard>;
}
