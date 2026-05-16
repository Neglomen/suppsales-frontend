// suppsales_frontend/src/store/print-hub.ts
import { safeSessionStorage } from "@/lib/safe-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // <-- Dodaj persist i createJSONStorage

type PrintHubStatus = "disconnected" | "connecting" | "connected" | "error";

// Typ drukarki - dla spójności
export interface PrinterDevice {
  deviceId: string;
  name: string;
}

interface PrintHubState {
  status: PrintHubStatus;
  printers: PrinterDevice[];
  _hasHydrated: boolean; // <-- NOWA FLAGA
  setStatus: (status: PrintHubStatus) => void;
  setPrinters: (printers: PrinterDevice[]) => void;
  setHasHydrated: (state: boolean) => void; // <-- NOWA AKCJA
}

export const usePrintHubStore = create<PrintHubState>()(
  persist(
    // <-- Opakowujemy w `persist`
    (set) => ({
      status: "disconnected", // Zaczynamy od 'disconnected', a nie 'connecting'
      printers: [],
      _hasHydrated: false,
      setStatus: (status) => set({ status }),
      setPrinters: (printers) => set({ printers }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "printhub-storage", // Nazwa dla localStorage
      storage: createJSONStorage(() => safeSessionStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
