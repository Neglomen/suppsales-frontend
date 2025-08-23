// src/types/communication-log.ts

interface Author {
  id: string;
  name: string | null;
  email: string;
}

interface SmtpAccount {
  id: string;
  name: string;
}

export interface CommunicationLog {
  id: string;
  sent_at: string; // ISO date string
  recipient_email: string;
  subject: string;
  content: string; // HTML content
  status: "SENT" | "FAILED";
  error_message: string | null;
  author: Author | null;
  smtp_account: SmtpAccount | null;
}
