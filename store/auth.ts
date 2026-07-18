// src/store/auth.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Definicja typu User (bez zmian)
interface OrganizationContext {
  id: string;
  name: string;
  print_hub_enabled: boolean;
  role: "OWNER" | "ADMIN" | "MEMBER";
  permissions: string[];
}

interface User {
  id: string;
  email: string;
  name: string | null;
  is_super_admin: boolean;
  organization: OrganizationContext | null;
}

// Zaktualizowany interfejs stanu
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean; // --- NOWA FLAGA ---
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setHasHydrated: (state: boolean) => void; // --- NOWA AKCJA ---
}

const ssrSafeCustomStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    const localVal = localStorage.getItem(name);
    if (localVal) return localVal;
    return sessionStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;
    const rememberMe = localStorage.getItem("auth-remember-me") === "true";
    if (rememberMe) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
    localStorage.removeItem("auth-remember-me");
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false, // Wartość początkowa
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => {
        // 1. Wyczyść stan w Zustand
        set({ user: null, token: null });

        // 2. Wyczyść storage (dodatkowe zabezpieczenie)
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-storage");
          sessionStorage.removeItem("auth-storage");
          localStorage.removeItem("auth-remember-me");
        }

        // 3. Użyj twardego przeładowania do strony logowania.
        // To jest najbezpieczniejszy sposób na wylogowanie, ponieważ
        // całkowicie czyści stan aplikacji i pamięć podręczną.
        // Zapobiega to wszelkim pętlom przekierowań.
        window.location.href = "/login";
      },
      setUser: (user) => set({ user }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => ssrSafeCustomStorage),
      // --- NOWA, KLUCZOWA OPCJA ---
      onRehydrateStorage: () => (state) => {
        // Ta funkcja jest wywoływana, gdy nawodnienie się zakończy.
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
