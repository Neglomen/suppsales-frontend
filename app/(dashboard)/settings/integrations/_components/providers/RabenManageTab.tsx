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

export const RabenManageTab = () => {
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
        Dane logowania Raben TMS API
      </h4>
      <FormField
        control={form.control}
        name="raben_username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa użytkownika API</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="raben_password"
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
      
      <h4 className="text-sm font-medium text-muted-foreground pt-2">
        Konfiguracja EDI i rozliczeń
      </h4>
      <FormField
        control={form.control}
        name="raben_edi_sender"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identyfikator nadawcy EDI (Sender ID)</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="raben_edi_receiver"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identyfikator odbiorcy EDI (Receiver ID)</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="raben_department"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Numer oddziału (Department ID)</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="raben_payer_identifier"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identyfikator płatnika (Payer ID)</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="raben_product_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domyślny typ produktu (Usługi)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || "PROD02"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz typ produktu" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="PROD02">Cargo Premium (Drobnicowy standardowy)</SelectItem>
                <SelectItem value="PROD01">Cargo Standard</SelectItem>
                <SelectItem value="PROD03">Cargo Express</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="raben_is_test"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Środowisko testowe (Sandbox)</FormLabel>
              <FormDescription>
                Włącz, aby wysyłać zlecenia testowe do piaskownicy Raben Group.
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
    </div>
  );
};
