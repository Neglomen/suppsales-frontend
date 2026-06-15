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
import { StatusMappingConfig } from "../StatusMappingConfig";

const SyncSwitch = ({ name, label }: { name: any; label: string }) => (
  <FormField
    control={name.control}
    name={name.name}
    render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
        <div className="space-y-0.5">
          <FormLabel className="text-sm">{label}</FormLabel>
        </div>
        <FormControl>
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        </FormControl>
      </FormItem>
    )}
  />
);

interface BaselinkerManageTabProps {
  integrationId: number;
}

export const BaselinkerManageTab = ({ integrationId }: BaselinkerManageTabProps) => {
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
      <FormField
        control={form.control}
        name="api_token"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token API BaseLinker</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wprowadź, aby zmienić"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Pozostaw puste, aby nie zmieniać istniejącego tokena.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <h4 className="text-sm font-medium text-muted-foreground pt-2">
        Ustawienia synchronizacji
      </h4>
      <div className="space-y-3">
        <SyncSwitch
          name={{ control: form.control, name: "sync_orders" }}
          label="Zamówienia"
        />
      </div>
      <StatusMappingConfig integrationId={integrationId} />
    </div>
  );
};
