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

export const ABManageTab = () => {
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
        Dane logowania
      </h4>
      <FormField
        control={form.control}
        name="ab_client_code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Kod klienta AB</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormDescription>Pozostaw puste, aby nie zmieniać.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ab_login"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Login do systemu AB</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź, aby zmienić" {...field} />
            </FormControl>
            <FormDescription>Pozostaw puste, aby nie zmieniać.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ab_password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hasło do systemu AB</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wprowadź, aby zmienić"
                {...field}
              />
            </FormControl>
            <FormDescription>Pozostaw puste, aby nie zmieniać.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
