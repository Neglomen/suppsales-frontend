// src/store/smtp.ts
import { create } from "zustand";
import api from "@/lib/api";

// Typ konta SMTP, który będziemy przechowywać
export interface SmtpAccount {
  id: string;
  name: string;
  is_default: boolean;
  user: string;
}

interface SmtpStore {
  accounts: SmtpAccount[];
  isLoading: boolean;
  fetchAccounts: () => Promise<void>;
  // Możemy tu dodać więcej akcji w przyszłości, np. addAccount, removeAccount
}

export const useSmtpStore = create<SmtpStore>((set, get) => ({
  accounts: [],
  isLoading: false,
  fetchAccounts: async () => {
    // Nie pobieraj danych ponownie, jeśli już są
    if (get().accounts.length > 0) {
      return;
    }
    set({ isLoading: true });
    try {
      const response = await api.get<SmtpAccount[]>("/smtp-accounts");
      set({ accounts: response.data, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch SMTP accounts", error);
      set({ isLoading: false });
    }
  },
}));
