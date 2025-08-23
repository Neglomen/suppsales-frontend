// src/store/auth.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Definicja typu User (bez zmian)
interface User {
  id: string;
  email: string;
  name: string | null;
  is_super_admin: boolean;
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

        // 2. Wyczyść localStorage (dodatkowe zabezpieczenie)
        // Jeśli nazwa Twojego storage'a jest inna, zmień ją tutaj
        localStorage.removeItem("auth-storage");

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
      storage: createJSONStorage(() => localStorage),
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
