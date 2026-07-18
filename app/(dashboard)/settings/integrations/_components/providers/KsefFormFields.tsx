import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, Zap } from "lucide-react";

export const KsefFormFields = () => {
  const { control, watch } = useFormContext();
  const ksefAutoSyncEnabled = watch("ksef_auto_sync_enabled");

  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa integracji</FormLabel>
            <FormControl>
              <Input placeholder="Np. Moja Firma KSeF" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="nip"
        render={({ field }) => (
          <FormItem>
            <FormLabel>NIP</FormLabel>
            <FormControl>
              <Input placeholder="1234567890" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="ksef_token"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token autoryzacyjny</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Token z aplikacji KSeF" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="environment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Środowisko</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz środowisko" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="test">Testowe (Demo)</SelectItem>
                <SelectItem value="prod">Produkcyjne</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ── SEKCJA CYKLICZNEGO POBIERANIA FV KSEF ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 mt-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Cykliczne pobieranie FV z KSeF</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              System będzie automatycznie pobierać najnowsze faktury zakupowe z bramki KSeF Ministerstwa Finansów do bazy danych.
            </p>
          </div>
        </div>

        <FormField
          control={control}
          name="ksef_auto_sync_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/10 p-3 shadow-sm bg-background/50">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">Włącz automatyczną synchronizację</FormLabel>
                <FormDescription className="text-xs">
                  Cyklicznie pobiera faktury przyrostowo.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {ksefAutoSyncEnabled && (
          <div className="space-y-4 mt-2 border-t border-border/10 pt-4">
            <FormField
              control={control}
              name="ksef_sync_interval"
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
                <span className="font-bold">Aktywna automatyczna synchronizacja.</span> Harmonogram cyklicznie sprawdza czy na serwerach MF pojawiły się nowe faktury i importuje je do systemu.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
