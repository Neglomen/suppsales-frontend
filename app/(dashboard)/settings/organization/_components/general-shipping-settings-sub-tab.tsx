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
import { Loader2 } from "lucide-react";

const settingsSchema = z.object({
  default_label_format: z.nativeEnum(LabelFormat),
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
    },
  });

  // === OSTATECZNA POPRAWKA: Używamy `reset` do aktualizacji formularza ===
  useEffect(() => {
    if (organization) {
      // `reset` to oficjalny sposób na wypełnienie formularza danymi z API.
      // Aktualizuje on wartości i resetuje stan `isDirty`.
      form.reset({
        default_label_format: organization.default_label_format,
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
