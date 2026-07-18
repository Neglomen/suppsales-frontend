"use client";

import { useFormContext } from "react-hook-form";
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

export function InPostBuyFormFields() {
  const { control } = useFormContext();

  return (
    <div className="space-y-4 pt-4 border-t">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa integracji</FormLabel>
            <FormControl>
              <Input placeholder="np. InPost Buy (Główne konto)" {...field} />
            </FormControl>
            <FormDescription>
              Pomoże Ci zidentyfikować to połączenie w systemie.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="inpost_buy_client_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client ID</FormLabel>
            <FormControl>
              <Input
                placeholder="Wpisz Client ID z panelu sprzedawcy InPost"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="inpost_buy_client_secret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client Secret</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wpisz Client Secret z panelu sprzedawcy InPost"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="inpost_buy_organization_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identyfikator organizacji (Organization ID / UUID)</FormLabel>
            <FormControl>
              <Input
                placeholder="np. d7be4b78-7bfa-4c47-9b2f-762bc1c518b0"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormDescription>
              Identyfikator UUID organizacji w systemach InPost (np. z zakładki API w panelu paczek).
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="inpost_buy_sandbox"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Środowisko testowe (Sandbox)</FormLabel>
              <FormDescription>
                Włącz, jeśli chcesz połączyć się z serwerem testowym InPost Buy Sandbox.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value === true}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
