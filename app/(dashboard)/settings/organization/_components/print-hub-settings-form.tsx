"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { Organization } from "@/types/organization";
import { usePrintHub } from "@/hooks/use-print-hub";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const printHubSettingsSchema = z.object({
  print_hub_enabled: z.boolean(),
  print_hub_default_invoice_printer: z.string().optional().nullable(),
  print_hub_default_label_printer: z.string().optional().nullable(),
  print_erp_symbol_on_label: z.boolean(),
  label_items_per_page: z.number().int().min(1).max(5),
});
type PrintHubSettingsValues = z.infer<typeof printHubSettingsSchema>;

interface PrintHubSettingsFormProps {
  organization: Organization;
}

export function PrintHubSettingsForm({
  organization,
}: PrintHubSettingsFormProps) {
  const queryClient = useQueryClient();
  const { status: printHubStatus, printers } = usePrintHub();

  const form = useForm<PrintHubSettingsValues>({
    resolver: zodResolver(printHubSettingsSchema),
    defaultValues: {
      print_hub_enabled: (organization as any).print_hub_enabled || false,
      print_hub_default_invoice_printer: (organization as any).print_hub_default_invoice_printer || "__none__",
      print_hub_default_label_printer: (organization as any).print_hub_default_label_printer || "__none__",
      print_erp_symbol_on_label: (organization as any).print_erp_symbol_on_label || false,
      label_items_per_page: (organization as any).label_items_per_page || 3,
    },
  });

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: (values: PrintHubSettingsValues) => {
      // Konwertuj sentinel __none__ z powrotem na null przed wysłaniem do API
      const payload = {
        ...values,
        print_hub_default_invoice_printer:
          values.print_hub_default_invoice_printer === "__none__" ? null : values.print_hub_default_invoice_printer,
        print_hub_default_label_printer:
          values.print_hub_default_label_printer === "__none__" ? null : values.print_hub_default_label_printer,
      };
      return api.patch("/organization/settings", payload);
    },
    onSuccess: (response) => {
      toast.success("Ustawienia Print Hub zostały zaktualizowane.");
      queryClient.setQueryData(["organization"], response.data);
      form.reset({
        print_hub_enabled: response.data.print_hub_enabled,
        print_hub_default_invoice_printer: response.data.print_hub_default_invoice_printer || "__none__",
        print_hub_default_label_printer: response.data.print_hub_default_label_printer || "__none__",
        print_erp_symbol_on_label: response.data.print_erp_symbol_on_label || false,
        label_items_per_page: response.data.label_items_per_page || 3,
      });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSubmit = (values: PrintHubSettingsValues) => {
    updateSettings(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ustawienia Drukowania (SuppSales Print Hub)</CardTitle>
        <CardDescription>
          Włącz integrację z aplikacją desktopową, aby drukować faktury i
          etykiety bezpośrednio na swoich drukarkach.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="print_hub_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Włącz integrację z Print Hub
                    </FormLabel>
                    <FormDescription>
                      Status połączenia:
                      <span
                        className={`font-bold ml-1 ${
                          printHubStatus === "connected"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {printHubStatus === "connected"
                          ? "Połączono"
                          : "Brak połączenia"}
                      </span>
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("print_hub_enabled") && printHubStatus === "connected" && (
              <div className="space-y-4 pt-4 border-t">
                <FormDescription>
                  Wybierz domyślne drukarki dla poszczególnych rodzajów dokumentów. Pozostaw
                  puste, aby wybierać drukarkę za każdym razem lub drukować na domyślnej w systemie.
                </FormDescription>

                {/* ─── Drukarka faktur ─── */}
                <FormField
                  control={form.control}
                  name="print_hub_default_invoice_printer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domyślna drukarka dla faktur</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz drukarkę docelową" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">-- Brak (wybór ręczny) --</SelectItem>
                          {printers.map((printer) => (
                            <SelectItem key={printer.name} value={printer.name}>
                              {printer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* ─── Drukarka etykiet ─── */}
                <FormField
                  control={form.control}
                  name="print_hub_default_label_printer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domyślna drukarka dla etykiet (np. Godex, Zebra)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz drukarkę docelową" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">-- Brak (wybór ręczny) --</SelectItem>
                          {printers.map((printer) => (
                            <SelectItem key={printer.name} value={printer.name}>
                              {printer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Drukarka etykiet (typu Godex) powinna obsługiwać format RAW. Zalecamy instalację sterowników Seagull.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* ─── SEKCJA: Etykieta zawartości paczki (ERP) ─── */}
                <div className="pt-4 border-t space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Etykieta zawartości paczki (symbole ERP)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Po wydrukowaniu etykiety kurierskiej, etykieciarka automatycznie wydrukuje
                      dodatkową naklejkę z listą produktów i symbolami ERP z Subiekt GT.
                      Etykieta kurierska (z kodami kreskowymi) pozostaje bez zmian.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="print_erp_symbol_on_label"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Drukuj symbole ERP na etykiecie paczki
                          </FormLabel>
                          <FormDescription>
                            Osobna naklejka (symbol ERP + nazwa + ilość) wydrukuje się zaraz
                            po etykiecie kurierskiej.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("print_erp_symbol_on_label") && (
                    <FormField
                      control={form.control}
                      name="label_items_per_page"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maks. pozycji na jednej naklejce</FormLabel>
                          <FormDescription>
                            Jeśli liczba produktów przekroczy ten limit, automatycznie zostaną
                            wydrukowane kolejne naklejki (1–5 pozycji).
                          </FormDescription>
                          <Select
                            onValueChange={(val) => field.onChange(parseInt(val))}
                            value={String(field.value)}
                          >
                            <FormControl>
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                  {n} {n === 1 ? "pozycja" : n < 5 ? "pozycje" : "pozycji"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending || !form.formState.isDirty}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz ustawienia drukowania
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
