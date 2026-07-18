"use client";

import { useFormContext } from "react-hook-form";
import { IntegrationUpdateSchemaType } from "@/lib/zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const GeisManageTab = () => {
  const form = useFormContext<IntegrationUpdateSchemaType>();
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa własna</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <h4 className="text-sm font-medium text-muted-foreground pt-2">
        Dane logowania Geis GService API
      </h4>
      <FormField
        control={form.control}
        name="geis_customer_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Kod klienta (Customer Code)</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geis_password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hasło API</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wprowadź nowe, aby zmienić"
                {...field}
              />
            </FormControl>
            <FormDescription>Pozostaw puste, aby nie zmieniać.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geis_iban"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Numer konta bankowego (IBAN) dla COD</FormLabel>
            <FormControl>
              <Input placeholder="PL00000000000000000000000000" {...field} />
            </FormControl>
            <FormDescription>Pozostaw puste, aby nie zmieniać.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geis_is_test"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Środowisko testowe (Sandbox)</FormLabel>
              <FormDescription>
                Włącz, aby wysyłać przesyłki w trybie testowym na gservicetest.geis.pl.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value !== false}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geis_pdf_format"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Format wydruku PDF (Rozmiar i orientacja)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || "PDFO"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz format PDF" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="PDFO">10x15 cm (Dedykowany dla drukarek termicznych - pionowo/krótki bok)</SelectItem>
                <SelectItem value="PDF">A4 (Standardowy - 4 etykiety na stronę A4)</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Wybierz 10x15 cm, aby etykiety drukowały się na rolce termicznej bez obracania i zmniejszania.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
