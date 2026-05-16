import { UseFormReturn } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, MessageSquareReply } from "lucide-react";

export function AllegroManageForm({
  form,
}: {
  form: UseFormReturn<IntegrationUpdateSchemaType>;
}) {
  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" /> Ustawienia Główne
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
        <h4 className="font-semibold pt-2">Ustawienia synchronizacji</h4>
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="sync_orders"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                <div>
                  <FormLabel className="text-base font-medium text-foreground">Zamówienia</FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">Pobieraj zamówienia z konta Allegro</p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sync_messages"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                <div>
                  <FormLabel className="text-base font-medium text-foreground">Wiadomości</FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">Pobieraj dyskusje i wiadomości od kupujących</p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sync_returns"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                <div>
                  <FormLabel className="text-base font-medium text-foreground">Zwroty</FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">Śledź zgłoszone opcje zwrotu i reklamacje</p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </TabsContent>
      <TabsContent value="autoresponder" className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="autoresponder_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
              <div>
                <FormLabel className="text-base">Włącz automatyczne odpowiedzi</FormLabel>
                <FormDescription>
                  Odpowiadaj na pierwszą wiadomość od kupującego zmniejszając średni czas reakcji.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="autoresponder_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treść automatycznej odpowiedzi</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Np. Dziękujemy za wiadomość, odpowiemy najszybciej jak to możliwe."
                  className="min-h-[120px] resize-y"
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
}
