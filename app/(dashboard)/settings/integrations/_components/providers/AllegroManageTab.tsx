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
import { Settings, MessageSquareReply, FileText, Clock, Zap } from "lucide-react";
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
      <TabsList className="grid w-full grid-cols-3 bg-card/50">
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" /> Ustawienia
        </TabsTrigger>
        <TabsTrigger value="autoresponder">
          <MessageSquareReply className="mr-2 h-4 w-4" /> Autoresponder
        </TabsTrigger>
        <TabsTrigger value="invoices">
          <FileText className="mr-2 h-4 w-4" /> Faktury
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

      <TabsContent value="autoresponder" className="space-y-4 pt-4">
        <SyncSwitch
          name={{ control: form.control, name: "autoresponder_enabled" }}
          label="Włącz autoresponder"
        />
        <FormField
          control={form.control}
          name="autoresponder_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treść wiadomości</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="np. Dziękujemy za zakup! Twoje zamówienie jest w realizacji."
                  rows={4}
                  className="bg-background/80 border-border/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
    </Tabs>
  );
};
