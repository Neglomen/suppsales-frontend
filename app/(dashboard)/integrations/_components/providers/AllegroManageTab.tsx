"use client";

import { useFormContext } from "react-hook-form";
import { IntegrationUpdateSchemaType } from "@/lib/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageSquareReply } from "lucide-react";
import { StatusMappingConfig } from "../StatusMappingConfig";

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
      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
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

interface AllegroManageTabProps {
  integrationId: number;
}

export const AllegroManageTab = ({ integrationId }: AllegroManageTabProps) => {
  const form = useFormContext<IntegrationUpdateSchemaType>();
  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-card/50">
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" /> Ustawienia
        </TabsTrigger>
        <TabsTrigger value="autoresponder">
          <MessageSquareReply className="mr-2 h-4 w-4" /> Autoresponder
        </TabsTrigger>
      </TabsList>
      <TabsContent value="settings" className="space-y-4 pt-4">
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
          Ustawienia synchronizacji
        </h4>
        <div className="space-y-3">
          <SyncSwitch
            name={{ control: form.control, name: "sync_orders" }}
            label="Zamówienia"
          />
          <SyncSwitch
            name={{ control: form.control, name: "sync_messages" }}
            label="Wiadomości"
          />
          <SyncSwitch
            name={{ control: form.control, name: "sync_returns" }}
            label="Zwroty"
          />
        </div>
        <StatusMappingConfig integrationId={integrationId} />
      </TabsContent>
      <TabsContent value="autoresponder" className="space-y-4 pt-4">
        <SyncSwitch
          name={{ control: form.control, name: "autoresponder_enabled" }}
          label="Włącz automatyczne odpowiedzi"
          description="Odpowiadaj na pierwszą wiadomość od kupującego."
        />
        <FormField
          control={form.control}
          name="autoresponder_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treść automatycznej odpowiedzi</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Np. Dziękujemy za wiadomość..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Ta wiadomość zostanie wysłana do klienta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>
    </Tabs>
  );
};
