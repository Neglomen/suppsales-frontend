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

export const GeodisFormFields = () => (
  <>
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input placeholder="Geodis WMS" {...field} />
          </FormControl>
          <FormDescription>
            Pomoże Ci zidentyfikować tę integrację.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="geodis_client_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Client ID</FormLabel>
          <FormControl>
            <Input placeholder="Twój Client ID z portalu Geodis" {...field} />
          </FormControl>
          <FormDescription>
            Identyfikator aplikacji OAuth2 nadany przez Geodis.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="geodis_client_secret"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Client Secret</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••••••••" {...field} />
          </FormControl>
          <FormDescription>
            Tajny klucz aplikacji OAuth2.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="geodis_customer_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Customer ID</FormLabel>
          <FormControl>
            <Input placeholder="Identyfikator klienta Geodis" {...field} />
          </FormControl>
          <FormDescription>
            Numer klienta w systemie Geodis WMS.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="geodis_warehouse_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Warehouse ID</FormLabel>
          <FormControl>
            <Input placeholder="Identyfikator magazynu" {...field} />
          </FormControl>
          <FormDescription>
            Identyfikator magazynu Geodis, z którego nadajesz przesyłki.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
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
  </>
);
