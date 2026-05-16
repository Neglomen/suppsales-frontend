"use client";

import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IntegrationUpdateSchema,
  IntegrationUpdateSchemaType,
} from "@/lib/zod";
import api, { getErrorMessage } from "@/lib/api";
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
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Loader2, Trash2, Link as LinkIcon } from "lucide-react";
import { ServiceIntegration } from "@/types/service-integration";

// Importy dedykowanych komponentów
import { AllegroManageTab } from "./providers/AllegroManageTab";
import { SubiektManageTab } from "./providers/SubiektManageTab";
import { BaselinkerManageTab } from "./providers/BaselinkerManageTab";
import { SuusManageTab } from "./providers/SuusManageTab";
import { ABManageTab } from "./providers/ABManageTab";
import { ApaczkaManageTab } from "./providers/ApaczkaManageTab";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Import KsefFormFields
import { KsefFormFields } from "./providers/KsefFormFields";

interface ManageIntegrationDialogProps {
  integration: ServiceIntegration | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onManualSync: (id: number) => void;
  onManualReturnSync: (id: number) => void;
  onManualMessageSync: (id: number) => void;
  onUpdate: (integration: ServiceIntegration) => void;
  onDelete: (id: number) => void;
  onReconnect: (id: number) => void;
}

export function ManageIntegrationDialog({
  integration,
  isOpen,
  setIsOpen,
  onManualSync,
  onManualReturnSync,
  onManualMessageSync,
  onUpdate,
  onDelete,
  onReconnect,
}: ManageIntegrationDialogProps) {
  const formMethods = useForm<IntegrationUpdateSchemaType>({
    resolver: zodResolver(IntegrationUpdateSchema),
    defaultValues: {
      name: "",
      sync_orders: false,
      sync_messages: false,
      sync_returns: false,
      autoresponder_enabled: false,
      autoresponder_message: "",
      api_token: "",
      suus_login: "",
      suus_password: "",
      ab_client_code: "",
      ab_login: "",
      ab_password: "",
      subiekt_agent_url: "",
      subiekt_api_key: "",
      nip: "",
      environment: "test",
      ksef_token: "",
      apaczka_app_id: "",
      apaczka_app_secret: "",
      apaczka_bank_account: "",
    }
  });

  useEffect(() => {
    if (integration) {
      formMethods.reset({
        name: integration.name,
        sync_orders: integration.sync_orders,
        sync_messages: !!integration.sync_messages,
        sync_returns: !!integration.sync_returns,
        autoresponder_enabled: !!integration.autoresponder_enabled,
        autoresponder_message: integration.autoresponder_message || "",
        api_token: "",
        suus_login: integration.api_config?.login || "",
        suus_password: "",
        ab_client_code: integration.api_config?.client_code || "",
        ab_login: integration.api_config?.login || "",
        ab_password: "",
        subiekt_agent_url: integration.api_config?.agent_url || "",
        subiekt_api_key: "",
        // KSeF
        nip: integration.sync_config?.nip || "",
        environment: integration.sync_config?.environment || "test",
        ksef_token: "",
        // Apaczka
        apaczka_app_id: integration.api_config?.app_id || "",
        apaczka_app_secret: "",
        apaczka_bank_account: integration.api_config?.bank_account || "",
      });
    }
  }, [integration, formMethods]);

  const onSubmit = async (values: IntegrationUpdateSchemaType) => {
    if (!integration) return;

    const {
      api_token,
      suus_login,
      suus_password,
      ab_client_code,
      ab_login,
      ab_password,
      subiekt_agent_url,
      subiekt_api_key,
      nip,
      environment,
      ksef_token,
      apaczka_app_id,
      apaczka_app_secret,
      apaczka_bank_account,
      ...baseValues
    } = values;

    const payload: Record<string, any> = { ...baseValues, api_config: {} };

    switch (integration.provider_type) {
      case "BASELINKER":
        if (api_token) payload.api_config.api_token = api_token;
        break;
      case "SUUS":
        if (suus_login) payload.api_config.login = suus_login;
        if (suus_password) payload.api_config.password = suus_password;
        break;
      case "AB":
        if (ab_client_code) payload.api_config.client_code = ab_client_code;
        if (ab_login) payload.api_config.login = ab_login;
        if (ab_password) payload.api_config.password = ab_password;
        break;
      case "APACZKA":
        if (apaczka_app_id) payload.api_config.app_id = apaczka_app_id;
        if (apaczka_app_secret) payload.api_config.app_secret = apaczka_app_secret;
        if (apaczka_bank_account) payload.api_config.bank_account = apaczka_bank_account;
        break;
      case "SUBIEKT_GT":
        if (subiekt_agent_url) payload.api_config.agent_url = subiekt_agent_url;
        if (subiekt_api_key) payload.api_config.api_key = subiekt_api_key;
        break;
      case "KSEF":
        if (ksef_token) payload.api_config.token = ksef_token;
        payload.sync_config = { 
          ...integration.sync_config, // Preserve other possible config
          nip, 
          environment 
        };
        break;
    }

    if (Object.keys(payload.api_config).length === 0) {
      delete payload.api_config;
    }

    await toast.promise(
      api.patch<ServiceIntegration>(
        `/service-integrations/${integration.id}`,
        payload
      ),
      {
        loading: "Zapisywanie zmian...",
        success: (response) => {
          onUpdate(response.data);
          setIsOpen(false);
          return "Zmiany zostały zapisane.";
        },
        error: (err) => getErrorMessage(err),
      }
    );
  };

  if (!integration) return null;

  const renderProviderSpecificContent = () => {
    switch (integration.provider_type) {
      case "ALLEGRO":
        return <AllegroManageTab />;
      case "SUBIEKT_GT":
        return <SubiektManageTab integrationId={integration.id} />;
      case "BASELINKER":
        return <BaselinkerManageTab />;
      case "SUUS":
        return <SuusManageTab />;
      case "AB":
        return <ABManageTab />;
      case "APACZKA":
        return <ApaczkaManageTab />;
      case "KSEF":
        return <KsefFormFields />;
      default:
        // Removed useFormContext() call, passing control directly isn't needed here 
        // if we just render standarized fields for unknown provider.
        // But to be safe and match previous logic (rendering 'name' field):
        return (
          <FormField
            control={formMethods.control} 
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
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] max-w-4xl flex flex-col">
        <DialogHeader>
          <DialogTitle>Zarządzaj integracją: {integration.name}</DialogTitle>
          <DialogDescription>
            Zarządzaj ustawieniami i akcjami dla tej integracji.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-4 space-y-6">
          <FormProvider {...formMethods}>
            <form
              id="manage-integration-form"
              onSubmit={formMethods.handleSubmit(onSubmit)}
            >
              {renderProviderSpecificContent()}
            </form>
          </FormProvider>

          <section className="space-y-4">
            <Separator />
            <div>
              <h3 className="font-semibold">Akcje</h3>
              <p className="text-sm text-muted-foreground">
                Zarządzaj połączeniem i synchronizacją.
              </p>
            </div>
            <div className="space-y-2">
              {integration.provider_type === "ALLEGRO" && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onReconnect(integration.id)}
                >
                  <LinkIcon className="mr-2 h-4 w-4" /> Połącz ponownie /
                  Odśwież uprawnienia
                </Button>
              )}
              {integration.category === "MARKETPLACE" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onManualSync(integration.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Wymuś synchronizację
                    zamówień
                  </Button>
                  {integration.provider_type === "ALLEGRO" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => onManualMessageSync(integration.id)}
                        disabled={!integration.sync_messages}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Wymuś
                        synchronizację wiadomości
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => onManualReturnSync(integration.id)}
                        disabled={!integration.sync_returns}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Wymuś
                        synchronizację zwrotów
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <Separator />
            <div>
              <h3 className="font-semibold text-destructive">
                Strefa niebezpieczna
              </h3>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full justify-start"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Usuń integrację
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Czy na pewno chcesz usunąć tę integrację?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Tej operacji nie można cofnąć. Spowoduje to trwałe usunięcie
                    integracji
                    <span className="font-semibold text-foreground">
                      {" "}
                      {integration.name}
                    </span>
                    .
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(integration.id)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Tak, usuń
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            form="manage-integration-form"
            disabled={formMethods.formState.isSubmitting}
          >
            {formMethods.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Zapisz zmiany
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
