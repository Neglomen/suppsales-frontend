"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  ShieldCheck, 
  Truck, 
  RefreshCcw, 
  Zap, 
  Settings2,
  HelpCircle,
  Link as LinkIcon
} from "lucide-react";

export default function HelpPage() {
  const sections = [
    {
      title: "Integracja z KSeF",
      icon: ShieldCheck,
      content: "Aplikacja automatycznie synchronizuje faktury z Krajowego Systemu e-Faktur. Aby rozpocząć, przejdź do Ustawień KSeF i wprowadź swój token uwierzytelniający. Synchronizacja odbywa się w czasie rzeczywistym lub w interwałach czasowych zależnie od konfiguracji.",
    },
    {
      title: "Zarządzanie Zamówieniami",
      icon: Zap,
      content: "Pobieramy zamówienia z Allegro, Erli i innych platform. Statusy są aktualizowane automatycznie. Możesz zarządzać zwrotami, wysyłać powiadomienia e-mail do klientów oraz generować faktury jednym kliknięciem.",
    },
    {
      title: "Wysyłki i Spedycja",
      icon: Truck,
      content: "Dzięki integracji z przewoźnikami (InPost, DPD, DHL), możesz generować etykiety bezpośrednio z panelu. System automatycznie wysyła numer śledzenia do platformy sprzedażowej, informując klienta o nadaniu paczki.",
    },
    {
      title: "ERP i Subiekt",
      icon: RefreshCcw,
      content: "SuppSales może współpracować z Twoim systemem ERP (np. Subiekt GT/NexO). Synchronizujemy stany magazynowe oraz przesyłamy dane do faktur, eliminując potrzebę ręcznego przepisywania dokumentów.",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full pb-20">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-2">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight premium-gradient-text">
          Centrum Pomocy SuppSales
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Wszystko, co musisz wiedzieć, aby maksymalnie wykorzystać potencjał naszej platformy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Card key={section.title} className="glass border-border/10 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                <section.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {section.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed FAQ section style */}
      <Card className="glass border-border/10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Często Zadawane Pytania
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="font-bold text-lg">Jak zacząć pracę z systemem?</h4>
            <p className="text-muted-foreground">Najpierw skonfiguruj integrację z platformą sprzedażową w zakładce Integracje. Następnie podłącz KSeF, aby automatycznie wystawiać dokumenty sprzedaży.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-lg">Czy moje dane są bezpieczne?</h4>
            <p className="text-muted-foreground">Tak, korzystamy z bezpiecznych połączeń szyfrowanych (SSL) oraz przechowujemy dane zgodnie ze standardami bezpieczeństwa i RODO. Tokeny KSeF są przechowywane w postaci zaszyfrowanej.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-lg">Jak skontaktować się ze wsparciem?</h4>
            <p className="text-muted-foreground">Możesz wysłać wiadomość bezpośrednio z panelu lub skontaktować się z dedykowanym opiekunem klienta przez nasz adres pomoc@suppsales.pl.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <div className="glass p-4 rounded-2xl flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-primary" />
          <span className="font-medium">Otwórz Ustawienia</span>
        </div>
        <div className="glass p-4 rounded-2xl flex items-center gap-3">
          <LinkIcon className="h-5 w-5 text-primary" />
          <span className="font-medium">Dokumentacja API</span>
        </div>
      </div>
    </div>
  );
}
