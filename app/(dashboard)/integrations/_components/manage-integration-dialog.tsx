"use client";

import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IntegrationUpdateSchema,
  IntegrationUpdateSchemaType,
} from "@/lib/zod";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
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
import { RefreshCw, Loader2, Trash2, Link as LinkIcon, History } from "lucide-react";
import { ServiceIntegration } from "@/types/service-integration";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

// Importy dedykowanych komponentów
import { AllegroManageTab } from "./providers/AllegroManageTab";
import { SubiektManageTab } from "./providers/SubiektManageTab";
import { BaselinkerManageTab } from "./providers/BaselinkerManageTab";
import { SuusManageTab } from "./providers/SuusManageTab";
import { ABManageTab } from "./providers/ABManageTab";
import { ApaczkaManageTab } from "./providers/ApaczkaManageTab";
import { EmpikManageTab } from "./providers/EmpikManageTab";
import { WooCommerceManageTab } from "./providers/WooCommerceManageTab";
import { GeisManageTab } from "./providers/GeisManageTab";
import { GeodisManageTab } from "./providers/GeodisManageTab";
import { InPostBuyManageTab } from "./providers/InPostBuyManageTab";
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
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState("config");

  const loadLogs = async () => {
    if (!integration) return;
    setLoadingLogs(true);
    try {
      const response = await api.get(`/service-integrations/${integration.id}/logs`);
      setLogs(response.data);
    } catch {
      toast.error("Nie udało się pobrać logów.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs" && isOpen && integration) {
      loadLogs();
    }
  }, [activeTab, isOpen, integration]);

  const formMethods = useForm<IntegrationUpdateSchemaType>({
    resolver: zodResolver(IntegrationUpdateSchema),
    defaultValues: {
      name: "",
      is_active: true,
      sync_orders: false,
      sync_messages: false,
      sync_returns: false,
      autoresponder_enabled: false,
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
    }
  });

  useEffect(() => {
    if (integration) {
      formMethods.reset({
        name: integration.name,
        is_active: integration.is_active,
        sync_orders: integration.sync_orders,
        sync_messages: !!integration.sync_messages,
        sync_returns: !!integration.sync_returns,
        autoresponder_enabled: !!integration.autoresponder_enabled,
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
        woocommerce_shop_url: integration.api_config?.shop_url || "",
        woocommerce_consumer_key: integration.api_config?.consumer_key || "",
        woocommerce_consumer_secret: integration.api_config?.consumer_secret || "",
        inpost_buy_client_id: integration.api_config?.client_id || "",
        inpost_buy_client_secret: integration.api_config?.client_secret || "",
        inpost_buy_organization_id: integration.api_config?.organization_id || "",
        inpost_buy_sandbox: integration.api_config?.sandbox === true,
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
      woocommerce_shop_url,
      woocommerce_consumer_key,
      woocommerce_consumer_secret,
      inpost_buy_client_id,
      inpost_buy_client_secret,
      inpost_buy_organization_id,
      inpost_buy_sandbox,
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

    if (["ALLEGRO", "BASELINKER", "EMPIK", "INPOST_BUY", "WOOCOMMERCE"].includes(integration.provider_type)) {
      payload.sync_config = sync_config || {};
    }

    switch (integration.provider_type) {
      case "BASELINKER":
        if (api_token) payload.api_config.api_token = api_token;
        break;
      case "EMPIK":
        if (empik_token) payload.api_config.api_token = empik_token;
        break;
      case "WOOCOMMERCE":
        if (woocommerce_shop_url) payload.api_config.shop_url = woocommerce_shop_url;
        if (woocommerce_consumer_key) payload.api_config.consumer_key = woocommerce_consumer_key;
        if (woocommerce_consumer_secret) payload.api_config.consumer_secret = woocommerce_consumer_secret;
        break;
      case "INPOST_BUY":
        if (inpost_buy_client_id) payload.api_config.client_id = inpost_buy_client_id;
        if (inpost_buy_client_secret) payload.api_config.client_secret = inpost_buy_client_secret;
        if (inpost_buy_organization_id) payload.api_config.organization_id = inpost_buy_organization_id;
        if (inpost_buy_sandbox !== undefined) payload.api_config.sandbox = inpost_buy_sandbox;
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
      case "WOOCOMMERCE":
        return <WooCommerceManageTab integrationId={integration.id} />;
      case "INPOST_BUY":
        return <InPostBuyManageTab integrationId={integration.id} />;
      case "SUUS":
        return <SuusManageTab />;
      case "GEIS":
        return <GeisManageTab />;
      case "GEODIS":
        return <GeodisManageTab />;
      case "RABEN":
        return <RabenManageTab />;
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
      <DialogContent className="max-h-[90vh] max-w-4xl flex flex-col bg-background border border-border text-foreground rounded-2xl shadow-2xl">
        <DialogHeader className="pb-4 border-b border-border flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              Zarządzaj integracją: <span className="text-primary">{integration.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Zarządzaj poświadczeniami połączenia, harmonogramem synchronizacji oraz śledź logi zdarzeń.
            </DialogDescription>
          </div>
          
          <FormProvider {...formMethods}>
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl border border-border shrink-0">
              <span className="text-xs text-muted-foreground font-semibold">Status:</span>
              <FormField
                control={formMethods.control}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Badge variant={field.value ? "success" : "destructive"} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                      {field.value ? "Aktywna" : "Nieaktywna"}
                    </Badge>
                  </div>
                )}
              />
            </div>
          </FormProvider>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 pt-4">
          <TabsList className="grid grid-cols-3 bg-muted border border-border rounded-xl p-1 mb-6 shrink-0">
            <TabsTrigger 
              value="config" 
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground transition-all"
            >
              Konfiguracja
            </TabsTrigger>
            <TabsTrigger 
              value="logs" 
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground transition-all"
            >
              Logi zdarzeń
            </TabsTrigger>
            <TabsTrigger 
              value="actions" 
              className="rounded-lg py-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground transition-all"
            >
              Akcje i konserwacja
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1 -mr-2 min-h-0">
            <TabsContent value="config" className="mt-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
              <FormProvider {...formMethods}>
                <form
                  id="manage-integration-form"
                  onSubmit={formMethods.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {renderProviderSpecificContent()}
                </form>
              </FormProvider>
            </TabsContent>

            <TabsContent value="logs" className="mt-0 focus-visible:outline-none focus-visible:ring-0 h-full flex flex-col gap-4">
              <div className="flex justify-between items-center shrink-0">
                <div className="text-xs text-muted-foreground">
                  Ostatnie 50 logów operacji synchronizacji zamówień i ERP.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadLogs}
                  disabled={loadingLogs}
                  className="h-8 rounded-lg"
                >
                  {loadingLogs ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Odśwież
                </Button>
              </div>

              {loadingLogs ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  Ładowanie logów zdarzeń...
                </div>
              ) : logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-muted-foreground/80 border border-dashed border-border rounded-xl bg-muted/20">
                  <History className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Brak zarejestrowanych logów dla tej integracji.
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {logs.map((log) => {
                    const isError = log.type === "ERROR" || (log.summary && log.summary.toLowerCase().includes("błąd")) || (log.summary && log.summary.toLowerCase().includes("nie udało się"));
                    const isSuccess = log.type === "ORDER_CREATED" || log.type === "SYNC_COMPLETE" || (log.summary && log.summary.toLowerCase().includes("pomyślnie")) || (log.summary && log.summary.toLowerCase().includes("pobrano nowe"));
                    
                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all duration-300",
                          isError 
                            ? "bg-red-500/5 border-red-500/20 hover:border-red-500/35" 
                            : isSuccess 
                              ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/35" 
                              : "bg-muted/30 border-border hover:border-border/80"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isError ? "destructive" : isSuccess ? "success" : "secondary"}
                                className="text-[9px] font-bold px-1.5 py-0.5 tracking-wider uppercase rounded-md"
                              >
                                {log.type}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground/60 font-mono">
                                {format(new Date(log.occurred_at), "yyyy-MM-dd HH:mm:ss")}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground mt-1.5 leading-relaxed">
                              {log.summary}
                            </p>
                            {log.external_order_id && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                                Zamówienie:{" "}
                                <Link 
                                  href={`/orders/${log.order_id}`} 
                                  className="text-primary hover:underline font-bold"
                                  onClick={() => setIsOpen(false)}
                                >
                                  {log.external_order_id}
                                </Link>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 uppercase font-bold font-mono tracking-wider shrink-0 bg-muted px-2 py-1 rounded-md border border-border">
                            {log.source}
                          </span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <details className="group cursor-pointer">
                              <summary className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors select-none outline-none">
                                Zobacz szczegóły techniczne
                              </summary>
                              <pre className="mt-2 text-[10px] font-mono text-foreground/90 bg-muted/60 p-3 rounded-lg overflow-x-auto border border-border leading-relaxed">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
              <section className="space-y-4 bg-muted/40 p-5 rounded-xl border border-border">
                <div>
                  <h3 className="font-semibold text-foreground">Akcje i narzędzia</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ręczne sterowanie zadaniami synchronizacji oraz autoryzacją połączenia.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {integration.provider_type === "ALLEGRO" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start h-11 text-xs font-semibold rounded-xl"
                      onClick={() => onReconnect(integration.id)}
                    >
                      <LinkIcon className="mr-2 h-4 w-4 text-primary" /> Odśwież uprawnienia Allegro
                    </Button>
                  )}
                  {integration.category === "MARKETPLACE" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start h-11 text-xs font-semibold rounded-xl"
                        onClick={() => onManualSync(integration.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4 text-primary" /> Wymuś synchronizację zamówień
                      </Button>
                      {["ALLEGRO", "EMPIK"].includes(integration.provider_type) && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start h-11 text-xs font-semibold rounded-xl"
                          onClick={() => onManualMessageSync(integration.id)}
                          disabled={!integration.sync_messages}
                        >
                          <RefreshCw className="mr-2 h-4 w-4 text-primary" /> Wymuś synchronizację wiadomości
                        </Button>
                      )}
                      {integration.provider_type === "ALLEGRO" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start h-11 text-xs font-semibold rounded-xl"
                          onClick={() => onManualReturnSync(integration.id)}
                          disabled={!integration.sync_returns}
                        >
                          <RefreshCw className="mr-2 h-4 w-4 text-primary" /> Wymuś synchronizację zwrotów
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </section>

              <section className="space-y-4 bg-red-500/5 p-5 rounded-xl border border-red-500/20">
                <div>
                  <h3 className="font-semibold text-red-400">Strefa niebezpieczna</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Operacje niszczące, których nie można cofnąć.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full justify-start h-11 text-xs font-semibold rounded-xl"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Usuń integrację
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-background border border-border rounded-2xl max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground text-lg font-bold">
                        Czy na pewno chcesz usunąć tę integrację?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-sm">
                        Tej operacji nie można cofnąć. Spowoduje to trwałe usunięcie integracji{" "}
                        <span className="font-bold text-foreground">
                          {integration.name}
                        </span>{" "}
                        wraz ze wszystkimi poświadczeniami.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">
                        Anuluj
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(integration.id)}
                        className="bg-destructive hover:bg-destructive/90 text-white rounded-xl"
                      >
                        Tak, usuń
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </section>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex-shrink-0 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => setIsOpen(false)}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            form="manage-integration-form"
            className="bg-primary text-black hover:bg-primary/95 rounded-xl font-bold"
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
