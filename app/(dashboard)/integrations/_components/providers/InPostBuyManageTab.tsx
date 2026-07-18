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
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background/50">
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

interface InPostBuyManageTabProps {
  integrationId: number;
}

export function InPostBuyManageTab({ integrationId }: InPostBuyManageTabProps) {
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
              <Input {...field} className="bg-background/80 border-border/20" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="inpost_buy_client_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client ID</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ""} className="bg-background/80 border-border/20" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="inpost_buy_client_secret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client Secret</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wprowadź, aby zmienić"
                {...field}
                value={field.value || ""}
                className="bg-background/80 border-border/20"
              />
            </FormControl>
            <FormDescription>
              Pozostaw puste, aby zachować dotychczasowy Client Secret.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="inpost_buy_organization_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identyfikator organizacji (Organization ID / UUID)</FormLabel>
            <FormControl>
              <Input
                placeholder="np. d7be4b78-7bfa-4c47-9b2f-762bc1c518b0"
                {...field}
                value={field.value || ""}
                className="bg-background/80 border-border/20"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="inpost_buy_sandbox"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/50">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Środowisko testowe (Sandbox)</FormLabel>
              <FormDescription>
                Połączenie z serwerem testowym InPost Buy Sandbox.
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

      <h4 className="text-sm font-medium text-muted-foreground pt-2">
        Ustawienia synchronizacji
      </h4>
      <div className="space-y-3">
        <div className="space-y-2">
          <SyncSwitch
            name={{ control: form.control, name: "sync_orders" }}
            label="Synchronizuj zamówienia"
          />
          {form.watch("sync_orders") && (
            <FormField
              control={form.control}
              name="sync_config.sync_orders_interval"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between pl-6 pr-3 py-1.5 rounded-lg border border-dashed border-border/10 bg-background/30">
                  <FormLabel className="text-xs font-semibold">Częstotliwość synchronizacji</FormLabel>
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
}
