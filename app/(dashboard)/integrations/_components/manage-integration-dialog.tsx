"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IntegrationUpdateSchema,
  IntegrationUpdateSchemaType,
} from "@/lib/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Loader2, Settings, MessageSquareReply } from "lucide-react";
import type { Integration } from "../page";

interface ManageIntegrationDialogProps {
  integration: Integration | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onManualSync: (integrationId: number) => void;
  onManualReturnSync: (integrationId: number) => void;
  onManualMessageSync: (integrationId: number) => void;
  onUpdate: (updatedIntegration: Integration) => void;
}

export function ManageIntegrationDialog({
  integration,
  isOpen,
  setIsOpen,
  onManualSync,
  onManualReturnSync,
  onManualMessageSync,
  onUpdate,
}: ManageIntegrationDialogProps) {
  const form = useForm<IntegrationUpdateSchemaType>({
    resolver: zodResolver(IntegrationUpdateSchema),
  });

  useEffect(() => {
    if (integration) {
      form.reset({
        name: integration.name,
        sync_orders: integration.sync_orders,
        sync_messages: !!integration.sync_messages,
        sync_returns: !!integration.sync_returns,
        autoresponder_enabled: !!integration.autoresponder_enabled,
        autoresponder_message: integration.autoresponder_message || "",
      });
    }
  }, [integration, form]);

  const onSubmit = async (values: IntegrationUpdateSchemaType) => {
    if (!integration) return;

    await toast.promise(
      api.patch<Integration>(`/integrations/${integration.id}`, values),
      {
        loading: "Zapisywanie zmian...",
        success: (response) => {
          onUpdate(response.data);
          setIsOpen(false);
          return "Zmiany zostały zapisane.";
        },
        error: (err) =>
          err.response?.data?.detail || "Nie udało się zapisać zmian.",
      }
    );
  };

  if (!integration) return null;

  const renderAllegroContent = () => (
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
        <FormField
          control={form.control}
          name="sync_orders"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Zamówienia</FormLabel>
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
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Wiadomości</FormLabel>
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
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Zwroty</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </TabsContent>
      <TabsContent value="autoresponder" className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="autoresponder_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>Włącz automatyczne odpowiedzi</FormLabel>
                <FormDescription>
                  Odpowiadaj na pierwszą wiadomość od kupującego.
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

  const renderBaseLinkerContent = () => (
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
      <h4 className="font-semibold pt-2">Dane uwierzytelniające</h4>
      <FormField
        name="api_token"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token API</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="••••••••••••••••••••"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Wypełnij tylko, jeśli chcesz zaktualizować token.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <h4 className="font-semibold pt-2">Ustawienia synchronizacji</h4>
      <FormField
        control={form.control}
        name="sync_orders"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <FormLabel>Zamówienia</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zarządzaj integracją: {integration.name}</DialogTitle>
          <DialogDescription>
            Zarządzaj ustawieniami i akcjami dla tej integracji.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            {integration.type === "ALLEGRO"
              ? renderAllegroContent()
              : renderBaseLinkerContent()}

            <Separator />
            <h4 className="font-semibold pt-2">Akcje</h4>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => onManualSync(integration.id)}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Wymuś synchronizację
                zamówień
              </Button>
              {integration.type === "ALLEGRO" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onManualMessageSync(integration.id)}
                    disabled={!integration.sync_messages}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Wymuś synchronizację
                    wiadomości
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onManualReturnSync(integration.id)}
                    disabled={!integration.sync_returns}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Wymuś synchronizację
                    zwrotów
                  </Button>
                </>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Zapisz zmiany
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
