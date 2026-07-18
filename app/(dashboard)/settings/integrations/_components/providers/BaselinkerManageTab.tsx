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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <div className="space-y-2">
          <SyncSwitch
            name={{ control: form.control, name: "sync_orders" }}
            label="Zamówienia"
          />
          {form.watch("sync_orders") && (
            <FormField
              control={form.control}
              name="sync_config.sync_orders_interval"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between pl-6 pr-3 py-1.5 rounded-lg border border-dashed border-border/10 bg-background/30">
                  <FormLabel className="text-xs font-semibold">Częstotliwość synchronizacji zamówień</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseInt(val))} 
                    value={field.value?.toString() || "5"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-40 h-8 bg-background/50 border-border/10 text-xs">
                        <SelectValue placeholder="Wybierz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Co minutę</SelectItem>
                      <SelectItem value="2">Co 2 minuty</SelectItem>
                      <SelectItem value="5">Co 5 minut</SelectItem>
                      <SelectItem value="10">Co 10 minut</SelectItem>
                      <SelectItem value="15">Co 15 minut</SelectItem>
                      <SelectItem value="30">Co 30 minut</SelectItem>
                      <SelectItem value="60">Co godzinę</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
        </div>
      </div>
      <StatusMappingConfig integrationId={integrationId} />
    </div>
  );
};
