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
import { AllegroManageTab } from "@/app/(dashboard)/integrations/_components/providers/AllegroManageTab";
import { SubiektManageTab } from "./providers/SubiektManageTab";
import { BaselinkerManageTab } from "@/app/(dashboard)/integrations/_components/providers/BaselinkerManageTab";
import { SuusManageTab } from "./providers/SuusManageTab";
import { ABManageTab } from "./providers/ABManageTab";
import { ApaczkaManageTab } from "./providers/ApaczkaManageTab";
import { EmpikManageTab } from "@/app/(dashboard)/integrations/_components/providers/EmpikManageTab";
import { GeisManageTab } from "./providers/GeisManageTab";
import { GeodisManageTab } from "./providers/GeodisManageTab";
import { RabenManageTab } from "./providers/RabenManageTab";
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
      autoresponder_type: "STATIC",
      autoresponder_message: "",
      autoresponder_mode: "first_message",
      api_token: "",
      suus_login: "",
      suus_password: "",
      suus_order_type: "B2B",
      ab_client_code: "",
      ab_login: "",
      ab_password: "",
      subiekt_agent_url: "",
      subiekt_api_key: "",
      subiekt_erp_sales_reference_template: "",
      nip: "",
      environment: "test",
      ksef_token: "",
      ksef_auto_sync_enabled: false,
      ksef_sync_interval: 30,
      apaczka_app_id: "",
      apaczka_app_secret: "",
      apaczka_bank_account: "",
      geis_customer_code: "",
      geis_password: "",
      geis_is_test: true,
      geis_iban: "",
      geis_pdf_format: "PDFO",
      geodis_client_id: "",
      geodis_client_secret: "",
      geodis_customer_id: "",
      geodis_warehouse_id: "",
      geodis_is_test: true,
      raben_username: "",
      raben_password: "",
      raben_edi_sender: "",
      raben_edi_receiver: "",
      raben_department: "",
      raben_payer_identifier: "",
      raben_is_test: true,
      raben_product_type: "PROD02",
      raben_service_level: "",
      empik_token: "",
      sync_config: {},
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
        autoresponder_type: integration.autoresponder_type || "STATIC",
        autoresponder_message: integration.autoresponder_message || "",
        autoresponder_mode: integration.autoresponder_mode || "first_message",
        api_token: integration.api_config?.api_token || "",
        suus_login: integration.api_config?.login || "",
        suus_password: integration.api_config?.password || "",
        suus_order_type: integration.api_config?.order_type || "B2B",
        ab_client_code: integration.api_config?.client_code || "",
        ab_login: integration.api_config?.login || "",
        ab_password: integration.api_config?.password || "",
        subiekt_agent_url: integration.api_config?.agent_url || "",
        subiekt_api_key: integration.api_config?.api_key || "",
        subiekt_erp_sales_reference_template: integration.sync_config?.erp_sales_reference_template || "",
        // KSeF
        nip: integration.sync_config?.nip || "",
        environment: integration.sync_config?.environment || "test",
        ksef_token: integration.api_config?.token || "",
        ksef_auto_sync_enabled: !!integration.sync_config?.ksef_auto_sync_enabled,
        ksef_sync_interval: integration.sync_config?.ksef_sync_interval || 30,
        // Apaczka
        apaczka_app_id: integration.api_config?.app_id || "",
        apaczka_app_secret: integration.api_config?.app_secret || "",
        apaczka_bank_account: integration.api_config?.bank_account || "",
        // Geis
        geis_customer_code: integration.api_config?.customer_code || "",
        geis_password: integration.api_config?.password || "",
        geis_is_test: integration.api_config?.is_test !== false,
        geis_iban: integration.api_config?.iban || "",
        geis_pdf_format: integration.api_config?.pdf_format || "PDFO",
        // Geodis
        geodis_client_id: integration.api_config?.client_id || "",
        geodis_client_secret: integration.api_config?.client_secret || "",
        geodis_customer_id: integration.api_config?.customer_id || "",
        geodis_warehouse_id: integration.api_config?.warehouse_id || "",
        geodis_is_test: integration.api_config?.is_test !== false,
        empik_token: integration.api_config?.api_token || "",
        raben_username: integration.api_config?.username || "",
        raben_password: integration.api_config?.password || "",
        raben_edi_sender: integration.api_config?.edi_sender || "",
        raben_edi_receiver: integration.api_config?.edi_receiver || "",
        raben_department: integration.api_config?.raben_department || "",
        raben_payer_identifier: integration.api_config?.payer_identifier || "",
        raben_is_test: integration.api_config?.is_test !== false,
        raben_product_type: integration.api_config?.product_type || "PROD02",
        raben_service_level: integration.api_config?.service_level || "",
        sync_config: integration.sync_config || {},
      });
    }
  }, [integration, formMethods]);

  const onSubmit = async (values: IntegrationUpdateSchemaType) => {
    if (!integration) return;

    const {
      api_token,
      suus_login,
      suus_password,
      suus_order_type,
      ab_client_code,
      ab_login,
      ab_password,
      subiekt_agent_url,
      subiekt_api_key,
      subiekt_erp_sales_reference_template,
      nip,
      environment,
      ksef_token,
      ksef_auto_sync_enabled,
      ksef_sync_interval,
      apaczka_app_id,
      apaczka_app_secret,
      apaczka_bank_account,
      geis_customer_code,
      geis_password,
      geis_is_test,
      geis_iban,
      geis_pdf_format,
      geodis_client_id,
      geodis_client_secret,
      geodis_customer_id,
      geodis_warehouse_id,
      geodis_is_test,
      empik_token,
      raben_username,
      raben_password,
      raben_edi_sender,
      raben_edi_receiver,
      raben_department,
      raben_payer_identifier,
      raben_is_test,
      raben_product_type,
      raben_service_level,
      sync_config,
      ...baseValues
    } = values;

    const payload: Record<string, any> = { ...baseValues, api_config: {} };

    if (["ALLEGRO", "BASELINKER", "EMPIK", "GEIS", "GEODIS", "RABEN"].includes(integration.provider_type)) {
      payload.sync_config = sync_config || {};
    }

    switch (integration.provider_type) {
      case "BASELINKER":
        if (api_token) payload.api_config.api_token = api_token;
        break;
      case "EMPIK":
        if (empik_token) payload.api_config.api_token = empik_token;
        break;
      case "SUUS":
        if (suus_login) payload.api_config.login = suus_login;
        if (suus_password) payload.api_config.password = suus_password;
        if (suus_order_type) payload.api_config.order_type = suus_order_type;
        break;
      case "GEIS":
        if (geis_customer_code) payload.api_config.customer_code = geis_customer_code;
        if (geis_password) payload.api_config.password = geis_password;
        if (geis_is_test !== undefined) payload.api_config.is_test = geis_is_test;
        if (geis_iban !== undefined) payload.api_config.iban = geis_iban;
        if (geis_pdf_format) payload.api_config.pdf_format = geis_pdf_format;
        break;
      case "GEODIS":
        if (geodis_client_id) payload.api_config.client_id = geodis_client_id;
        if (geodis_client_secret) payload.api_config.client_secret = geodis_client_secret;
        if (geodis_customer_id) payload.api_config.customer_id = geodis_customer_id;
        if (geodis_warehouse_id) payload.api_config.warehouse_id = geodis_warehouse_id;
        if (geodis_is_test !== undefined) payload.api_config.is_test = geodis_is_test;
        break;
      case "RABEN":
        if (raben_username) payload.api_config.username = raben_username;
        if (raben_password) payload.api_config.password = raben_password;
        if (raben_edi_sender) payload.api_config.edi_sender = raben_edi_sender;
        if (raben_edi_receiver) payload.api_config.edi_receiver = raben_edi_receiver;
        if (raben_department) payload.api_config.raben_department = raben_department;
        if (raben_payer_identifier) payload.api_config.payer_identifier = raben_payer_identifier;
        if (raben_is_test !== undefined) payload.api_config.is_test = raben_is_test;
        if (raben_product_type) payload.api_config.product_type = raben_product_type;
        if (raben_service_level !== undefined) payload.api_config.service_level = raben_service_level;
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
        if (subiekt_erp_sales_reference_template !== undefined) {
          payload.sync_config = {
            ...integration.sync_config,
            erp_sales_reference_template: subiekt_erp_sales_reference_template,
          };
        }
        break;
      case "KSEF":
        if (ksef_token) payload.api_config.token = ksef_token;
        payload.sync_config = { 
          ...integration.sync_config, // Preserve other possible config
          nip, 
          environment,
          ksef_auto_sync_enabled: !!ksef_auto_sync_enabled,
          ksef_sync_interval: parseInt(ksef_sync_interval as any) || 30
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
        return <AllegroManageTab integrationId={integration.id} />;
      case "SUBIEKT_GT":
        return <SubiektManageTab integrationId={integration.id} />;
      case "BASELINKER":
        return <BaselinkerManageTab integrationId={integration.id} />;
      case "EMPIK":
        return <EmpikManageTab integrationId={integration.id} />;
      case "SUUS":
        return <SuusManageTab />;
      case "AB":
        return <ABManageTab />;
      case "APACZKA":
        return <ApaczkaManageTab />;
      case "KSEF":
        return <KsefFormFields />;
      case "GEIS":
        return <GeisManageTab />;
      case "GEODIS":
        return <GeodisManageTab />;
      case "RABEN":
        return <RabenManageTab />;
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
