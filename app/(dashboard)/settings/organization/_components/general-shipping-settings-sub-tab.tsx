"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import api from "@/lib/api";
import { Organization, LabelFormat } from "@/types/organization";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Tag } from "lucide-react";

const settingsSchema = z.object({
  default_label_format: z.nativeEnum(LabelFormat),
  default_reference_number_template: z.string().max(200).optional(),
  warn_invoice_exists: z.boolean(),
  warn_waybill_exists: z.boolean(),
  warn_cod_mismatch: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const fetchOrganization = async (): Promise<Organization> => {
  const { data } = await api.get("/organization");
  return data;
};

export function GeneralShippingSettingsSubTab() {
  const queryClient = useQueryClient();

  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: fetchOrganization,
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_label_format: LabelFormat.PDF,
      default_reference_number_template: "",
      warn_invoice_exists: true,
      warn_waybill_exists: true,
      warn_cod_mismatch: true,
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        default_label_format: organization.default_label_format,
        default_reference_number_template: organization.default_reference_number_template || "",
        warn_invoice_exists: organization.warn_invoice_exists ?? true,
        warn_waybill_exists: organization.warn_waybill_exists ?? true,
        warn_cod_mismatch: organization.warn_cod_mismatch ?? true,
      });
    }
  }, [organization, form.reset]);

  const mutation = useMutation({
    mutationFn: (values: SettingsFormValues) => {
      console.log("Wysyłanie do API:", values);
      return api.patch("/organization", values);
    },
    onSuccess: () => {
      toast.success("Ustawienia zostały zaktualizowane.");
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || "Nie udało się zapisać zmian."
      );
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    mutation.mutate(values);
  };

  const handleInsertTag = (tag: string) => {
    const currentVal = form.getValues("default_reference_number_template") || "";
    const newVal = currentVal ? `${currentVal} ${tag}` : tag;
    form.setValue("default_reference_number_template", newVal, { shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ogólne Ustawienia Wysyłek</CardTitle>
        <CardDescription>
          Skonfiguruj domyślne zachowania dla modułu Centrum Wysyłek.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isOrgLoading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ładowanie ustawień...
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="default_label_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domyślny format etykiety</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz format..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={LabelFormat.PDF}>
                          PDF — A4 (drukarka biurowa)
                        </SelectItem>
                        <SelectItem value={LabelFormat.ZPL}>
                          Termiczny A6 — Godex / Zebra (10×15 cm)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Wybierz <strong>Termiczny A6</strong> jeśli drukujesz etykiety na drukarce
                      termicznej (Godex, Zebra). Etykiety z Apaczki będą pobierane w rozmiarze
                      10×15 cm, dopasowanym do rolki etykiet.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_reference_number_template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domyślny szablon numeru referencyjnego</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="{product_names}"
                        {...field}
                      />
                    </FormControl>
                    <CardDescription className="text-xs text-muted-foreground mt-1.5 space-y-2">
                      <span>
                        Zdefiniuj wzorzec, który będzie wpisywany do numeru referencyjnego na etykiecie kurierskiej. Kliknij tag, aby go wstawić:
                      </span>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { tag: "{order_id}", desc: "ID zamówienia" },
                          { tag: "{login}", desc: "Login kupującego" },
                          { tag: "{name}", desc: "Pełna nazwa odbiorcy" },
                          { tag: "{products}", desc: "Nazwy produktów" },
                          { tag: "{erp_symbols}", desc: "Symbole ERP" },
                          { tag: "{source}", desc: "Nazwa źródła (sklepu)" },
                        ].map(({ tag, desc }) => (
                          <div key={tag} className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
                              onClick={() => handleInsertTag(tag)}
                              title={`Kliknij, aby wstawić ${tag}`}
                            >
                              <Tag className="h-3 w-3 mr-1 text-primary" />
                              {tag}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">{desc}</span>
                          </div>
                        ))}
                      </div>
                      <span className="block mt-1 italic">
                        Np. `Zam. {`{order_id}`} - {`{login}`}` lub `{`{erp_symbols}`}`. Puste pole oznacza domyślne użycie nazw produktów.
                      </span>
                    </CardDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === SEKCDA: OSTRZEŻENIA (NEW) === */}
              <div className="border-t pt-6 space-y-4">
                <h4 className="text-sm font-semibold">Komunikaty i ostrzeżenia</h4>
                <p className="text-xs text-muted-foreground">
                  Włącz lub wyłącz ostrzeżenia wyświetlane podczas pracy na zamówieniach.
                </p>

                <FormField
                  control={form.control}
                  name="warn_invoice_exists"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-sm">Ostrzeżenie o istniejącej fakturze</FormLabel>
                        <FormDescription className="text-xs text-muted-foreground">
                          Ostrzegaj przy nabijaniu lub wysyłkach, jeśli zamówienie posiada już powiązany dokument sprzedaży (fakturę).
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

                <FormField
                  control={form.control}
                  name="warn_waybill_exists"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-sm">Ostrzeżenie o istniejącej wysyłce</FormLabel>
                        <FormDescription className="text-xs text-muted-foreground">
                          Ostrzegaj, jeśli dla wybranego zamówienia wygenerowano już list przewozowy/etykietę kurierską.
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

                <FormField
                  control={form.control}
                  name="warn_cod_mismatch"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-sm">Ostrzeżenie o kwocie pobrania (COD)</FormLabel>
                        <FormDescription className="text-xs text-muted-foreground">
                          Pokazuj ostrzeżenie, gdy kwota pobrania nie zgadza się z wartością zamówienia do zapłaty (lub gdy wybrano pobranie dla opłaconego zamówienia).
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
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={mutation.isPending || !form.formState.isDirty}
                >
                  {mutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Zapisz zmiany
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
