import { usePrintHubStore } from "@/store/print-hub";
import toast from "react-hot-toast";

const PRINT_HUB_URL = "ws://localhost:31337";

class PrintHubService {
  private static instance: PrintHubService;
  private ws: WebSocket | null = null;
  private isInitialized = false;

  // Zmienne do inteligentnego ponownego łączenia
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 3000; // Zaczynamy od 3 sekund
  private maxReconnectDelay = 60000; // Maksymalnie 1 minuta

  // Konstruktor jest teraz pusty - nie łączymy się automatycznie
  private constructor() {}

  public static getInstance(): PrintHubService {
    if (!PrintHubService.instance) {
      PrintHubService.instance = new PrintHubService();
    }
    return PrintHubService.instance;
  }

  // Nowa metoda do "obudzenia" serwisu, wywoływana z hooka
  public initialize() {
    if (
      this.isInitialized ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }
    this.isInitialized = true;
    this.connect();
  }

  private connect() {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      // Zapobiegaj tworzeniu wielu połączeń
      return;
    }

    usePrintHubStore.getState().setStatus("connecting");
    console.log(
      `[PrintHubService] Próba połączenia (próba #${
        this.reconnectAttempts + 1
      })...`
    );

    this.ws = new WebSocket(PRINT_HUB_URL);

    this.ws.onopen = () => {
      console.log("[PrintHubService] Połączono z WebSocket.");
      usePrintHubStore.getState().setStatus("connected");
      this.reconnectAttempts = 0; // Resetujemy licznik po sukcesie
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.sendMessage({ type: "GET_PRINTERS" });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "PRINTER_LIST") {
          usePrintHubStore.getState().setPrinters(data.payload);
          console.log(
            "[PrintHubService] Otrzymano listę drukarek:",
            data.payload
          );
        }
      } catch (error) {
        console.error("[PrintHubService] Błąd parsowania wiadomości:", error);
      }
    };

    this.ws.onerror = (error) => {
      // Ten handler jest celowo minimalistyczny. Błąd `ECONNREFUSED` jest normalny,
      // a główna logika ponownego łączenia znajduje się w `onclose`.
    };

    this.ws.onclose = () => {
      // Inteligentna logika ponownego łączenia (Exponential Backoff)
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        usePrintHubStore.getState().setStatus("error");

        const jitter = Math.random() * 0.4 + 0.8; // Losowość 80%-120%
        const delay =
          Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
          ) * jitter;

        console.log(
          `[PrintHubService] Rozłączono. Następna próba za ${(
            delay / 1000
          ).toFixed(1)}s.`
        );

        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      } else {
        console.warn(
          `[PrintHubService] Osiągnięto maksymalną liczbę prób ponownego połączenia. Zatrzymuję.`
        );
        usePrintHubStore.getState().setStatus("error");
      }
    };
  }

  private sendMessage(message: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(
        "[PrintHubService] Nie można wysłać wiadomości: WebSocket nie jest połączony."
      );
      toast.error(
        "Połączenie z aplikacją drukowania (Print Hub) zostało zerwane."
      );
    }
  }

  public printPdf(
    pdfBase64: string,
    documentName: string,
    options?: { printerName?: string }
  ) {
    this.sendMessage({
      type: "PRINT_PDF",
      payload: pdfBase64,
      documentName,
      options: {
        printer: options?.printerName,
      },
    });
  }

  public printRaw(
    base64Data: string,
    documentName: string,
    options?: { printerName?: string }
  ) {
    this.sendMessage({
      type: "PRINT_RAW",
      payload: base64Data,
      documentName,
      options: {
        printer: options?.printerName,
      },
    });
  }
}

// Inicjalizujemy serwis jako singleton, ale nie łączymy się od razu
export const printHubService = PrintHubService.getInstance();
