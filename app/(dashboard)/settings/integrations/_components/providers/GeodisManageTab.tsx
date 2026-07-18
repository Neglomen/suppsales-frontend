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

export const GeodisManageTab = () => {
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
        Dane logowania Geodis API
      </h4>
      <FormField
        control={form.control}
        name="geodis_client_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client ID</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geodis_client_secret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client Secret</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wprowadź nowy, aby zmienić"
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
        name="geodis_customer_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer ID</FormLabel>
            <FormControl>
              <Input placeholder="Identyfikator klienta Geodis" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geodis_warehouse_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Warehouse ID</FormLabel>
            <FormControl>
              <Input placeholder="Identyfikator magazynu" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="geodis_is_test"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Środowisko testowe (Sandbox)</FormLabel>
              <FormDescription>
                Włącz, aby wysyłać zlecenia w trybie testowym.
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
