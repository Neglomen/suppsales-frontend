// src/types/thread.ts

export interface Message {
  id: string;
  author_login: string;
  text: string;
  created_at: string; // ISO date string
}

export interface Thread {
  id: string;
  order_id: string | null;
  last_message_at: string; // ISO date string
  messages: Message[];
  // Dodajmy te pola, które mogą być przydatne
  interlocutor_login: string;
  read: boolean;
}
