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
      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/10 p-3 shadow-sm bg-background/50">
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

interface EmpikManageTabProps {
  integrationId: number;
}

export function EmpikManageTab({ integrationId }: EmpikManageTabProps) {
  const form = useFormContext<IntegrationUpdateSchemaType>();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa własna</FormLabel>
              <FormControl>
                <Input {...field} placeholder="np. Empik Główne" className="bg-background/80 border-border/20" />
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
              <FormLabel>Token API Empik (Mirakl)</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Wprowadź, aby zmienić"
                  className="bg-background/80 border-border/20"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Pozostaw puste, aby nie zmieniać istniejącego tokenu.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
          Ustawienia synchronizacji
        </h4>
        <SyncSwitch
          name={{ control: form.control, name: "sync_orders" }}
          label="Synchronizuj zamówienia"
        />
      </div>

      <StatusMappingConfig integrationId={integrationId} />
    </div>
  );
}
