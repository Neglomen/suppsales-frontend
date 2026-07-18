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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const SuusManageTab = () => {
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
        Dane logowania WebAPI
      </h4>
      <FormField
        control={form.control}
        name="suus_login"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Login SUUS</FormLabel>
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
        name="suus_password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hasło SUUS</FormLabel>
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
      <FormField
        control={form.control}
        name="suus_order_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Domyślny typ zlecenia (orderType)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || "B2B"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz domyślny typ zlecenia" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="B2B">B2B (Krajowe i zagraniczne)</SelectItem>
                <SelectItem value="B2C">B2C (Tylko krajowe)</SelectItem>
                <SelectItem value="DYNAMIC">Automatyczny (B2B dla firm, inaczej B2C)</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              SUUS wymaga B2B dla zleceń międzynarodowych.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

