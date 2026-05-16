"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { Organization } from "@/types/organization";
import { usePrintHub } from "@/hooks/use-print-hub";
import { useAuthStore } from "@/store/auth";

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
  const updateOrganizationSettings = useAuthStore(
    (state) => state.updateOrganizationSettings
  );

  const form = useForm<PrintHubSettingsValues>({
    resolver: zodResolver(printHubSettingsSchema),
    defaultValues: {
      print_hub_enabled: (organization as any).print_hub_enabled || false,
      print_hub_default_invoice_printer: (organization as any).print_hub_default_invoice_printer || "",
      print_hub_default_label_printer: (organization as any).print_hub_default_label_printer || "",
    },
  });

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: (values: PrintHubSettingsValues) =>
      api.patch("/organization/settings", values),
    onSuccess: (response) => {
      toast.success("Ustawienia Print Hub zostały zaktualizowane.");
      queryClient.setQueryData(["organization"], response.data);
      updateOrganizationSettings({
        printHubEnabled: response.data.print_hub_enabled,
      });
      form.reset({ print_hub_enabled: response.data.print_hub_enabled });
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
                  Wybierz domyślne drukarki dla poszczególnych rodzajów dokumentów. Pozostaw puste, aby wybierać drukarkę za każdym razem lub drukować na domyślnej w systemie.
                </FormDescription>
                
                <FormField
                  control={form.control}
                  name="print_hub_default_invoice_printer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domyślna drukarka dla faktur</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz drukarkę docelową" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">-- Brak (wybór ręczny) --</SelectItem>
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

                <FormField
                  control={form.control}
                  name="print_hub_default_label_printer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domyślna drukarka dla etykiet (np. Godex, Zebra)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz drukarkę docelową" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">-- Brak (wybór ręczny) --</SelectItem>
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
