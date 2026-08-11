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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText } from "lucide-react";
import { StatusMappingConfig } from "../StatusMappingConfig";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SyncSwitch = ({
  name,
  label,
  description,
}: {
  name: any;
  label: string;
  description?: string;
}) => (
  <FormField
    control={name.control}
    name={name.name}
    render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/10 p-3 shadow-sm bg-background/50">
        <div className="space-y-0.5">
          <FormLabel className="text-sm">{label}</FormLabel>
          {description && (
            <FormDescription className="text-xs">{description}</FormDescription>
          )}
        </div>
        <FormControl>
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        </FormControl>
      </FormItem>
    )}
  />
);

interface WooCommerceManageTabProps {
  integrationId: number;
}

export function WooCommerceManageTab({ integrationId }: WooCommerceManageTabProps) {
  const form = useFormContext<IntegrationUpdateSchemaType>();

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-card/50">
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" /> Ustawienia
        </TabsTrigger>
        <TabsTrigger value="mapping">
          <FileText className="mr-2 h-4 w-4" /> Mapowanie Statusów
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6 pt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwa własna</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="np. WooCommerce Sklep" className="bg-background/80 border-border/20" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="woocommerce_shop_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adres URL sklepu</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="np. https://mojsklep.pl" value={field.value || ""} className="bg-background/80 border-border/20" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="woocommerce_consumer_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consumer Key</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Wprowadź, aby zmienić"
                    className="bg-background/80 border-border/20"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="woocommerce_consumer_secret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consumer Secret</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Wprowadź, aby zmienić"
                    className="bg-background/80 border-border/20"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            Ustawienia synchronizacji
          </h4>
          
          <div className="space-y-2">
            <SyncSwitch
              name={{ control: form.control, name: "sync_orders" }}
              label="Synchronizuj zamówienia"
              description="Włącza cykliczne pobieranie zamówień ze sklepu WooCommerce."
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
      </TabsContent>

      <TabsContent value="mapping" className="pt-4">
        <StatusMappingConfig integrationId={integrationId} />
      </TabsContent>
    </Tabs>
  );
}
