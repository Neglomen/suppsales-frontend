"use client";

import { useFormContext } from "react-hook-form";
import { IntegrationUpdateSchemaType } from "@/lib/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, MessageSquareReply, FileText, Clock, Zap, ShieldCheck, Bot, BrainCircuit, Sparkles } from "lucide-react";
import { StatusMappingConfig } from "../StatusMappingConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SyncSwitch = ({
  name,
  label,
  description,
}: {
  name: any;
  label: string;
  description?: string;
}) => (
  <FormField
    control={name.control}
    name={name.name}
    render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50 border-border/10">
        <div className="space-y-0.5">
          <FormLabel className="text-sm">{label}</FormLabel>
          {description && (
            <FormDescription className="text-xs">{description}</FormDescription>
          )}
        </div>
        <FormControl>
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        </FormControl>
      </FormItem>
    )}
  />
);

interface AllegroManageTabProps {
  integrationId: number;
}

export const AllegroManageTab = ({ integrationId }: AllegroManageTabProps) => {
  const form = useFormContext<IntegrationUpdateSchemaType>();
  const autoSyncEnabled = form.watch("sync_config.invoice_auto_sync_enabled");

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-4 bg-card/50">
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" /> Ustawienia
        </TabsTrigger>
        <TabsTrigger value="autoresponder">
          <MessageSquareReply className="mr-2 h-4 w-4" /> Autoresponder
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <FileText className="mr-2 h-4 w-4" /> Faktury
        </TabsTrigger>
        <TabsTrigger value="livecheck">
          <ShieldCheck className="mr-2 h-4 w-4" /> Live Check
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings" className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa własna</FormLabel>
              <FormControl>
                <Input {...field} className="bg-background/80 border-border/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <h4 className="text-sm font-medium text-muted-foreground pt-2">
          Ustawienia synchronizacji
        </h4>
        <div className="space-y-3">
          <div className="space-y-2">
            <SyncSwitch
              name={{ control: form.control, name: "sync_orders" }}
              label="Zamówienia"
            />
            {form.watch("sync_orders") && (
              <FormField
                control={form.control}
                name="sync_config.sync_orders_interval"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between pl-6 pr-3 py-1.5 rounded-lg border border-dashed border-border/10 bg-background/30">
                    <FormLabel className="text-xs font-semibold">Częstotliwość synchronizacji zamówień</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      value={field.value?.toString() || "5"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-40 h-8 bg-background/50 border-border/10 text-xs">
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Co minutę</SelectItem>
                        <SelectItem value="2">Co 2 minuty</SelectItem>
                        <SelectItem value="5">Co 5 minut</SelectItem>
                        <SelectItem value="10">Co 10 minut</SelectItem>
                        <SelectItem value="15">Co 15 minut</SelectItem>
                        <SelectItem value="30">Co 30 minut</SelectItem>
                        <SelectItem value="60">Co godzinę</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="space-y-2">
            <SyncSwitch
              name={{ control: form.control, name: "sync_messages" }}
              label="Wiadomości"
            />
            {form.watch("sync_messages") && (
              <FormField
                control={form.control}
                name="sync_config.sync_messages_interval"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between pl-6 pr-3 py-1.5 rounded-lg border border-dashed border-border/10 bg-background/30">
                    <FormLabel className="text-xs font-semibold">Częstotliwość synchronizacji wiadomości</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      value={field.value?.toString() || "10"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-40 h-8 bg-background/50 border-border/10 text-xs">
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Co minutę</SelectItem>
                        <SelectItem value="2">Co 2 minuty</SelectItem>
                        <SelectItem value="5">Co 5 minut</SelectItem>
                        <SelectItem value="10">Co 10 minut</SelectItem>
                        <SelectItem value="15">Co 15 minut</SelectItem>
                        <SelectItem value="30">Co 30 minut</SelectItem>
                        <SelectItem value="60">Co godzinę</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="space-y-2">
            <SyncSwitch
              name={{ control: form.control, name: "sync_returns" }}
              label="Zwroty"
            />
            {form.watch("sync_returns") && (
              <FormField
                control={form.control}
                name="sync_config.sync_returns_interval"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between pl-6 pr-3 py-1.5 rounded-lg border border-dashed border-border/10 bg-background/30">
                    <FormLabel className="text-xs font-semibold">Częstotliwość synchronizacji zwrotów</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      value={field.value?.toString() || "60"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-40 h-8 bg-background/50 border-border/10 text-xs">
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">Co 5 minut</SelectItem>
                        <SelectItem value="15">Co 15 minut</SelectItem>
                        <SelectItem value="30">Co 30 minut</SelectItem>
                        <SelectItem value="60">Co godzinę</SelectItem>
                        <SelectItem value="120">Co 2 godziny</SelectItem>
                        <SelectItem value="240">Co 4 godziny</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>
        <StatusMappingConfig integrationId={integrationId} />
      </TabsContent>

      <TabsContent value="autoresponder" className="space-y-6 pt-6">
        {/* Główny przełącznik autorespondera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-950/80 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              Automatyczne Odpowiedzi
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
              Włącz asystenta, który będzie automatycznie odpowiadał na wiadomości od kupujących, redukując Twój czas obsługi.
            </p>
          </div>
          <div className="relative z-10 sm:scale-110 sm:mr-4">
            <SyncSwitch
              name={{ control: form.control, name: "autoresponder_enabled" }}
              label=""
            />
          </div>
        </div>

        {/* Sekcja konfiguracji - widoczna gdy włączony */}
        {form.watch("autoresponder_enabled") && (
          <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-top-4 duration-500">
            
            {/* Lewa kolumna - Tryb i Zasięg */}
            <div className="space-y-5 p-5 rounded-2xl border border-white/5 bg-slate-950/40 shadow-inner">
              <FormField
                control={form.control}
                name="autoresponder_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold flex items-center gap-2 text-slate-200">
                      Tryb Asystenta
                      {field.value === "AI" && (
                        <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-indigo-500 text-[9px] px-1.5 py-0 border-0 h-4">AI BETA</Badge>
                      )}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "STATIC"}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900/60 border-white/10 h-14 rounded-xl hover:bg-slate-900 transition-colors">
                          <SelectValue placeholder="Wybierz tryb generowania" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                        <SelectItem value="STATIC" className="py-3">
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-sm text-slate-200">Własny szablon tekstu</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">Zawsze ta sama, stała wiadomość</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="AI" className="py-3 focus:bg-indigo-500/10 focus:text-indigo-200">
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-sm text-indigo-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Inteligentny Asystent Gemini
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">Analizuje status i odpowiada kontekstowo</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoresponder_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-200">Zasady odpowiadania</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "first_message"}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-900/60 border-white/10 h-11 rounded-xl hover:bg-slate-900 transition-colors">
                          <SelectValue placeholder="Wybierz zasady" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-950 border-white/10 text-white rounded-xl">
                        <SelectItem value="first_message">Tylko na pierwszą wiadomość w wątku</SelectItem>
                        <SelectItem value="all_messages">Na każdą wiadomość od kupującego</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Prawa kolumna - Konfiguracja wiadomości */}
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 shadow-inner flex flex-col justify-center min-h-[220px]">
              {form.watch("autoresponder_type") === "AI" ? (
                <div className="text-center space-y-4 px-4 py-6 animate-in zoom-in-95 duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                    <BrainCircuit className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h4 className="font-bold text-sm text-indigo-300">Pełna automatyzacja z AI</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nasz system sztucznej inteligencji sam odnajdzie zamówienie klienta, zweryfikuje numer paczki i sformułuje uprzejmą odpowiedź opartą na aktualnym statusie.
                  </p>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="autoresponder_message"
                  render={({ field }) => (
                    <FormItem className="h-full flex flex-col animate-in fade-in duration-300">
                      <FormLabel className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                        Szablon wiadomości statycznej
                      </FormLabel>
                      <FormControl className="flex-1 mt-3">
                        <Textarea
                          {...field}
                          placeholder="np. Dzień dobry, dziękujemy za zakup! Twoje zamówienie jest w realizacji."
                          className="bg-slate-900/60 border-white/10 hover:border-white/20 focus:border-indigo-500/30 transition-colors rounded-xl min-h-[140px] resize-none text-sm leading-relaxed text-slate-200 shadow-inner"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

          </div>
        )}
      </TabsContent>

      <TabsContent value="invoices" className="space-y-6 pt-4">

        {/* ── Ręczne akcje FV (upload + email) ── */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 pb-1 border-b border-border/20">
            <FileText className="h-3.5 w-3.5 text-primary/60" />
            Akcje po wygenerowaniu FV
          </p>
          <p className="text-[11px] text-muted-foreground/60 mb-2">
            Działają zarówno przy ręcznym, jak i cyklicznym pobieraniu FV.
          </p>
          <div className="space-y-3">
            <SyncSwitch
              name={{ control: form.control, name: "sync_config.invoice_upload_enabled" }}
              label="Przesyłaj faktury do Allegro"
              description="Automatycznie wgrywa fakturę PDF do zamówienia na Allegro po wygenerowaniu jej w Subiekcie."
            />
            <SyncSwitch
              name={{ control: form.control, name: "sync_config.invoice_email_enabled" }}
              label="Wysyłaj faktury na e-mail klienta"
              description="Automatycznie wysyła e-mail z załącznikiem PDF po wygenerowaniu faktury."
            />
          </div>
        </div>

        {/* ── Treść e-maila ── */}
        <FormField
          control={form.control}
          name="sync_config.invoice_email_subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temat wiadomości e-mail</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="np. Faktura do Twojego zamówienia {order.external_order_id}"
                  className="bg-background/80 border-border/20"
                />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Dostępne zmienne szablonu: {"{order.external_order_id}"}, {"{buyer.first_name}"}, {"{buyer.last_name}"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sync_config.invoice_email_body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treść wiadomości e-mail (HTML)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Wpisz treść maila..."
                  rows={6}
                  className="bg-background/80 border-border/20 font-mono text-xs"
                />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                Możesz używać tagów HTML oraz zmiennych Jinja2. Np. Dzień dobry {"{{ buyer.first_name }}"}, w załączniku przesyłamy fakturę do zamówienia {"{{ order.external_order_id }}"}.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── SEKCJA CYKLICZNEGO POBIERANIA FV ── */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Cykliczne pobieranie FV</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                System automatycznie wyszukuje co 30 minut zamówienia z uzupełnionym numerem dokumentu ERP
                i wysyła fakturę do Allegro / na e-mail klienta bez żadnej ręcznej interwencji.
              </p>
            </div>
          </div>

          <SyncSwitch
            name={{ control: form.control, name: "sync_config.invoice_auto_sync_enabled" }}
            label="Włącz automatyczną synchronizację FV"
            description="Cyklicznie pobiera wszystkie zamówienia z numerem ERP i przetwarza FV."
          />

          {autoSyncEnabled && (
            <div className="space-y-4 mt-2 border-t border-border/10 pt-4">
              <FormField
                control={form.control}
                name="sync_config.invoice_sync_interval"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-semibold">Częstotliwość pobierania</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      value={field.value?.toString() || "30"}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-border/10">
                          <SelectValue placeholder="Wybierz częstotliwość" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">Co 15 minut</SelectItem>
                        <SelectItem value="30">Co 30 minut</SelectItem>
                        <SelectItem value="60">Co godzinę</SelectItem>
                        <SelectItem value="120">Co 2 godziny</SelectItem>
                        <SelectItem value="240">Co 4 godziny</SelectItem>
                        <SelectItem value="720">Co 12 godzin</SelectItem>
                        <SelectItem value="1440">Co 24 godziny</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="mt-1 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400/90">
                  <span className="font-bold">Aktywna automatyczna synchronizacja.</span>{" "}
                  System będzie cyklicznie sprawdzać zamówienia z numerem dokumentu ERP.
                  Upewnij się, że powyżej włączony jest upload do Allegro i/lub wysyłka e-mail.
                </p>
              </div>
            </div>
          )}
        </div>

      </TabsContent>

      {/* ─── Live Check Tab ─── */}
      <TabsContent value="livecheck" className="space-y-5 pt-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Live Check zamówień w nabijarce</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gdy paczker otworzy zamówienie Allegro w nabijarce, system automatycznie
                pobierze aktualne dane (status, adres, dane kupującego) i zaktualizuje je
                bez żadnej akcji ze strony użytkownika. Zamówienie zostanie ustawione
                w status &quot;W realizacji&quot;, co blokuje kupującemu możliwość zmiany danych.
              </p>
            </div>
          </div>

          <SyncSwitch
            name={{ control: form.control, name: "sync_config.live_check_enabled" }}
            label="Włącz Live Check w nabijarce"
            description="Automatycznie weryfikuje i aktualizuje dane przy otwarciu zamówienia."
          />
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground/80">Jak to działa:</p>
          <ul className="space-y-1.5 list-none">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">1.</span>
              <span>Otwarcie zamówienia w nabijarce → system odczekuje 0,8s (aby uniknąć zbędnych wywołań przy szybkim przeskakiwaniu)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">2.</span>
              <span>Pobranie aktualnych danych z API Allegro (1 zapytanie na zamówienie w sesji)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">3.</span>
              <span><strong>Status krytyczny</strong> (anulowane/zwrócone/spór) → czerwony alert blokujący w UI i wpis w historii</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">4.</span>
              <span>Zmiany danych → automatyczna aktualizacja + wpis w historii zamówienia</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">5.</span>
              <span>Zamówienie ustawiane jest w status &quot;W realizacji&quot; w Allegro (blokuje kupującemu edycję)</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-border/20 bg-muted/20 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
          <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/60" />
          <p>
            <span className="font-semibold">Optymalizacja:</span> Każde zamówienie jest sprawdzane maksymalnie raz na sesję przeglądarki. 
            Błędy połączenia z Allegro są ignorowane — nabijarka działa normalnie.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};
