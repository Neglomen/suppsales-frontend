// src/store/nav.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface NavState {
  isCollapsed: boolean;
  isPinned: boolean;
  setIsCollapsed: (collapsed: boolean) => void; // Nowa, jawna akcja
  setPinned: (isPinned: boolean) => void;
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      isCollapsed: true, // Domyślnie menu jest zwinięte
      isPinned: false,
      setIsCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      setPinned: (isPinned) =>
        set((state) => {
          // Jeśli przypinamy, zawsze rozwijamy. Jeśli odpinamy, zawsze zwijamy.
          const newCollapsedState = !isPinned;
          return { isPinned, isCollapsed: newCollapsedState };
        }),
    }),
    {
      name: "nav-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
