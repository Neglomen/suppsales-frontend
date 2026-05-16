// suppsales_frontend/src/lib/safe-storage.ts
import { StateStorage } from "zustand/middleware";

// "Pusty" storage, który nic nie robi. Używany po stronie serwera.
const dummyStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const safeSessionStorage: StateStorage =
  typeof window !== "undefined" ? sessionStorage : dummyStorage;
