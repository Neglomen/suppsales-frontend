"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const GeisFormFields = () => (
  <>
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input placeholder="Kurier Geis" {...field} />
          </FormControl>
          <FormDescription>
            Pomoże Ci zidentyfikować tę integrację.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="geis_customer_code"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Kod klienta (Customer Code)</FormLabel>
          <FormControl>
            <Input placeholder="Twój kod klienta (np. 12345_001)" {...field} />
          </FormControl>
          <FormDescription>
            Kod adresu klienta / oddziału firmy z systemu Geis.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="geis_password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Hasło API</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••••••••" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="geis_iban"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Numer konta bankowego (IBAN) dla COD</FormLabel>
          <FormControl>
            <Input placeholder="PL00000000000000000000000000" {...field} />
          </FormControl>
          <FormDescription>
            Wymagany do zwrotu pobrań (COD). Wpisz z prefiksem kraju bez spacji.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
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
              checked={field.value !== false} // Domyślnie włączone (true)
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  </>
);
