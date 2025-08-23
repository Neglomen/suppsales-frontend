// src/hooks/use-auth-guard.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export const useAuthGuard = () => {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Sprawdzamy, czy stan został już "nawodniony" z localStorage
    const hasChecked = useAuthStore.persist.hasHydrated();

    if (hasChecked && !token) {
      router.push("/login");
    }
  }, [user, token, router]);
};
