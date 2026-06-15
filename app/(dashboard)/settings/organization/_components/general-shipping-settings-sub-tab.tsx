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
import { Loader2, Tag } from "lucide-react";

const settingsSchema = z.object({
  default_label_format: z.nativeEnum(LabelFormat),
  default_reference_number_template: z.string().max(200).optional(),
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
    // Ustawiamy wartości domyślne na wypadek, gdyby API nie odpowiedziało
    defaultValues: {
      default_label_format: LabelFormat.PDF,
      default_reference_number_template: "",
    },
  });

  // === OSTATECZNA POPRAWKA: Używamy `reset` do aktualizacji formularza ===
  useEffect(() => {
    if (organization) {
      // `reset` to oficjalny sposób na wypełnienie formularza danymi z API.
      // Aktualizuje on wartości i resetuje stan `isDirty`.
      form.reset({
        default_label_format: organization.default_label_format,
        default_reference_number_template: organization.default_reference_number_template || "",
      });
    }
  }, [organization, form.reset]); // `form.reset` jest stabilną funkcją, ale dodajemy ją dla kompletności

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
    // `values` są teraz gwarantowane przez `react-hook-form` i `zod`
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
                      value={field.value} // Używamy kontrolowanego komponentu
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz format..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={LabelFormat.PDF}>
                          PDF (dla drukarek biurowych)
                        </SelectItem>
                        <SelectItem value={LabelFormat.ZPL}>
                          ZPL (dla drukarek termicznych)
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
