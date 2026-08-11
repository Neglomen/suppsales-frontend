"use client";

import { useState } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import {
  ServiceIntegrationFormValues,
  serviceIntegrationFormSchema,
} from "@/lib/zod";
import { ServiceIntegration } from "@/types/service-integration";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Search, Grid, ShoppingBag, Truck, Database, Boxes, FileText } from "lucide-react";
import {
  AllegroIcon,
  BaseLinkerIcon,
  SuusIcon,
  ABIcon,
  SubiektIcon,
  EmpikIcon,
  GeisIcon,
  GeodisIcon,
  InPostIcon,
  RabenIcon,
  WooCommerceIcon,
} from "@/components/shared/icons";
import { KsefIcon } from "@/components/shared/ksef-icon";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

import { AllegroFormFields } from "./providers/AllegroFormFields";
import { BaselinkerFormFields } from "./providers/BaselinkerFormFields";
import { ABFormFields } from "./providers/ABFormFields";
import { SuusFormFields } from "./providers/SuusFormFields";
import { SubiektFormFields } from "./providers/SubiektFormFields";
import { KsefFormFields } from "./providers/KsefFormFields";
import { ApaczkaFormFields } from "./providers/ApaczkaFormFields";
import { EmpikFormFields } from "./providers/EmpikFormFields";
import { GeisFormFields } from "./providers/GeisFormFields";
import { GeodisFormFields } from "./providers/GeodisFormFields";
import { InPostBuyFormFields } from "./providers/InPostBuyFormFields";
import { RabenFormFields } from "./providers/RabenFormFields";
import { WooCommerceFormFields } from "./providers/WooCommerceFormFields";
import { Package } from "lucide-react";

interface IntegrationFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: (newIntegration: ServiceIntegration) => void;
}

type ProviderType = "ALLEGRO" | "BASELINKER" | "SUUS" | "AB" | "SUBIEKT_GT" | "KSEF" | "APACZKA" | "EMPIK" | "GEIS" | "GEODIS" | "INPOST_BUY" | "RABEN" | "WOOCOMMERCE";

const CATEGORIES = [
  { id: "ALL", name: "Wszystkie", icon: <Grid className="h-4 w-4 mr-2.5" /> },
  { id: "MARKETPLACE", name: "Marketplaces", icon: <ShoppingBag className="h-4 w-4 mr-2.5" /> },
  { id: "COURIER", name: "Kurierzy", icon: <Truck className="h-4 w-4 mr-2.5" /> },
  { id: "ERP", name: "Systemy ERP", icon: <Database className="h-4 w-4 mr-2.5" /> },
  { id: "WHOLESALE", name: "Hurtownie", icon: <Boxes className="h-4 w-4 mr-2.5" /> },
  { id: "GOVERNMENT", name: "Administracja", icon: <FileText className="h-4 w-4 mr-2.5" /> },
];

const ProviderTile = ({
  onClick,
  icon,
  title,
  description,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative flex flex-col items-start text-left gap-4 rounded-2xl border border-border/15 bg-background/20 p-5 hover:border-primary/40 hover:bg-background/30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden w-full h-[185px]"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    <div className="flex items-center justify-center p-3 rounded-xl bg-background/60 border border-border/10 shadow-inner h-14 w-full group-hover:scale-[1.03] transition-transform duration-300">
      {icon}
    </div>
    <div className="space-y-1 w-full mt-auto">
      <p className="font-bold text-sm tracking-tight text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/80 leading-normal line-clamp-2">{description}</p>
    </div>
  </button>
);

const SyncSwitch = ({ name, label }: { name: any; label: string }) => (
  <FormField
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card/20 p-3 shadow-sm">
        <FormLabel className="text-sm">{label}</FormLabel>
        <FormControl>
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        </FormControl>
      </FormItem>
    )}
  />
);

const Step1SelectType = ({
  onSelect,
}: {
  onSelect: (type: ProviderType) => void;
}) => {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const providers = [
    {
      type: "ALLEGRO" as ProviderType,
      category: "MARKETPLACE",
      title: "Allegro",
      description: "Zamówienia, wiadomości, zwroty.",
      icon: <AllegroIcon className="w-24 h-auto" />,
    },
    {
      type: "BASELINKER" as ProviderType,
      category: "MARKETPLACE",
      title: "BaseLinker",
      description: "Synchronizuj zamówienia.",
      icon: <BaseLinkerIcon className="w-24 h-auto" />,
    },
    {
      type: "EMPIK" as ProviderType,
      category: "MARKETPLACE",
      title: "Empik",
      description: "Obsługa zamówień z Empik Place.",
      icon: <EmpikIcon className="w-20 h-auto" />,
    },
    {
      type: "INPOST_BUY" as ProviderType,
      category: "MARKETPLACE",
      title: "InPost Buy",
      description: "Obsługa zamówień z aplikacji InPost Mobile.",
      icon: <InPostIcon className="w-24 h-auto" />,
    },
    {
      type: "WOOCOMMERCE" as ProviderType,
      category: "MARKETPLACE",
      title: "WooCommerce",
      description: "Zamówienia, stany magazynowe i ceny.",
      icon: <WooCommerceIcon className="w-24 h-auto" />,
    },
    {
      type: "SUUS" as ProviderType,
      category: "COURIER",
      title: "RÖHLIG SUUS",
      description: "Nadawaj przesyłki, etykiety.",
      icon: <SuusIcon className="w-30 h-auto" />,
    },
    {
      type: "GEIS" as ProviderType,
      category: "COURIER",
      title: "Geis GService",
      description: "Przesyłki przez GService API.",
      icon: <GeisIcon className="w-28 h-auto" />,
    },
    {
      type: "RABEN" as ProviderType,
      category: "COURIER",
      title: "Raben Group",
      description: "Obsługa wysyłek przez TMS Raben.",
      icon: <RabenIcon className="w-28 h-auto" />,
    },
    {
      type: "GEODIS" as ProviderType,
      category: "COURIER",
      title: "Geodis",
      description: "Przesyłki przez Geodis WMS API.",
      icon: <GeodisIcon className="w-28 h-auto" />,
    },
    {
      type: "APACZKA" as ProviderType,
      category: "COURIER",
      title: "Apaczka",
      description: "Tanie przesyłki kurierskie (DPD, UPS, itp.).",
      icon: <Package className="h-10 w-10 text-primary" />,
    },
    {
      type: "AB" as ProviderType,
      category: "WHOLESALE",
      title: "AB S.A.",
      description: "Zlecenia hurtowe, faktury, adresy.",
      icon: <ABIcon className="h-6 w-auto" />,
    },
    {
      type: "SUBIEKT_GT" as ProviderType,
      category: "ERP",
      title: "Subiekt GT",
      description: "Synchronizuj statusy faktur.",
      icon: <SubiektIcon className="w-20 h-auto" />,
    },
    {
      type: "KSEF" as ProviderType,
      category: "GOVERNMENT",
      title: "KSeF",
      description: "Pobieraj faktury zakupowe.",
      icon: <KsefIcon className="w-20 h-auto" />,
    },
  ];

  const filteredProviders = providers.filter((p) => {
    const matchesCategory = activeCategory === "ALL" || p.category === activeCategory;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCountForCategory = (catId: string) => {
    return providers.filter(
      (p) =>
        (catId === "ALL" || p.category === catId) &&
        (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    ).length;
  };

  return (
    <div className="space-y-4">
      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Wyszukaj integrację..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-background/50 border-border/40 focus-visible:ring-primary rounded-xl"
        />
      </div>

      <div className="flex gap-6 h-[480px]">
        {/* SIDEBAR */}
        <div className="w-[210px] flex-shrink-0 flex flex-col gap-1 border-r border-border/10 pr-4 overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const count = getCountForCategory(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all text-left",
                  activeCategory === cat.id
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center truncate">
                  {cat.icon}
                  <span className="truncate">{cat.name}</span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ml-2",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TILES GRID */}
        <div className="flex-grow overflow-y-auto pr-1">
          {filteredProviders.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 pb-4">
              {filteredProviders.map((p) => (
                <ProviderTile
                  key={p.type}
                  onClick={() => onSelect(p.type)}
                  icon={p.icon}
                  title={p.title}
                  description={p.description}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <p className="text-sm font-medium">Brak pasujących integracji.</p>
              <p className="text-xs text-muted-foreground/60">Spróbuj wpisać inną frazę.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Step2EnterDetails = ({
  providerType,
}: {
  providerType: ProviderType;
}) => {
  const providers = [
    {
      type: "ALLEGRO" as ProviderType,
      title: "Allegro",
      icon: <AllegroIcon className="w-24 h-auto" />,
    },
    {
      type: "BASELINKER" as ProviderType,
      title: "BaseLinker",
      icon: <BaseLinkerIcon className="w-24 h-auto" />,
    },
    {
      type: "EMPIK" as ProviderType,
      title: "Empik",
      icon: <EmpikIcon className="w-20 h-auto" />,
    },
    {
      type: "INPOST_BUY" as ProviderType,
      title: "InPost Buy",
      icon: <InPostIcon className="w-24 h-auto" />,
    },
    {
      type: "WOOCOMMERCE" as ProviderType,
      title: "WooCommerce",
      icon: <WooCommerceIcon className="w-24 h-auto" />,
    },
    {
      type: "SUUS" as ProviderType,
      title: "RÖHLIG SUUS",
      icon: <SuusIcon className="w-30 h-auto" />,
    },
    {
      type: "GEIS" as ProviderType,
      title: "Geis GService",
      icon: <GeisIcon className="w-28 h-auto" />,
    },
    {
      type: "GEODIS" as ProviderType,
      title: "Geodis",
      icon: <GeodisIcon className="w-28 h-auto" />,
    },
    {
      type: "APACZKA" as ProviderType,
      title: "Apaczka",
      icon: <Package className="h-10 w-10 text-primary" />,
    },
    {
      type: "AB" as ProviderType,
      title: "AB S.A.",
      icon: <ABIcon className="h-6 w-auto" />,
    },
    {
      type: "SUBIEKT_GT" as ProviderType,
      title: "Subiekt GT",
      icon: <SubiektIcon className="w-20 h-auto" />,
    },
    {
      type: "KSEF" as ProviderType,
      title: "KSeF",
      icon: <KsefIcon className="w-20 h-auto" />,
    },
  ];

  const provider = providers.find((p) => p.type === providerType);

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent shadow-sm">
        <div className="flex items-center justify-center p-3 rounded-xl bg-background border border-border/10 shadow-sm h-14 w-28 flex-shrink-0">
          {provider?.icon}
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">
            Konfiguracja połączenia
          </h3>
          <p className="text-sm text-muted-foreground leading-normal">
            Wprowadź dane dostępowe dla integracji z <strong>{provider?.title}</strong>.
          </p>
        </div>
      </div>

      {/* FORM WRAPPER */}
      <div className="space-y-4 rounded-2xl border border-border/15 bg-card/10 p-6 shadow-sm backdrop-blur-sm">
        {providerType === "ALLEGRO" && <AllegroFormFields />}
        {providerType === "BASELINKER" && <BaselinkerFormFields />}
        {providerType === "SUUS" && <SuusFormFields />}
        {providerType === "GEIS" && <GeisFormFields />}
        {providerType === "GEODIS" && <GeodisFormFields />}
        {providerType === "APACZKA" && <ApaczkaFormFields />}
        {providerType === "AB" && <ABFormFields />}
        {providerType === "SUBIEKT_GT" && <SubiektFormFields />}
        {providerType === "KSEF" && <KsefFormFields />}
        {providerType === "EMPIK" && <EmpikFormFields />}
        {providerType === "WOOCOMMERCE" && <WooCommerceFormFields />}
        {providerType === "INPOST_BUY" && <InPostBuyFormFields />}
        {providerType === "RABEN" && <RabenFormFields />}
      </div>

      {/* SYNC SETTINGS */}
      {["ALLEGRO", "BASELINKER", "EMPIK", "INPOST_BUY", "WOOCOMMERCE"].includes(providerType) && (
        <div className="space-y-3 rounded-2xl border border-border/15 bg-card/10 p-6 shadow-sm backdrop-blur-sm">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Synchronizacja danych
          </h4>
          <div className="space-y-2">
            <SyncSwitch name="sync_orders" label="Automatyczna synchronizacja zamówień" />
            {providerType === "ALLEGRO" && (
              <>
                <SyncSwitch name="sync_messages" label="Automatyczna synchronizacja wiadomości" />
                <SyncSwitch name="sync_returns" label="Automatyczna synchronizacja zwrotów" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export function IntegrationFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
}: IntegrationFormDialogProps) {
  const [step, setStep] = useState(1);
  const [providerType, setProviderType] = useState<ProviderType | null>(null);

  const FORM_DEFAULT_VALUES: ServiceIntegrationFormValues = {
    provider_type: undefined as unknown as ServiceIntegrationFormValues["provider_type"],
    name: "",
    sync_orders: false,
    sync_messages: false,
    sync_returns: false,
    api_token: "",
    suus_login: "",
    suus_password: "",
    suus_order_type: "B2B",
    geis_customer_code: "",
    geis_password: "",
    geis_is_test: true,
    geis_iban: "",
    geodis_client_id: "",
    geodis_client_secret: "",
    geodis_customer_id: "",
    geodis_warehouse_id: "",
    geodis_is_test: true,
    ab_client_code: "",
    ab_login: "",
    ab_password: "",
    subiekt_agent_url: "",
    subiekt_api_key: "",
    nip: "",
    ksef_token: "",
    ksef_auto_sync_enabled: false,
    ksef_sync_interval: 30,
    apaczka_app_id: "",
    apaczka_app_secret: "",
    empik_token: "",
    woocommerce_shop_url: "",
    woocommerce_consumer_key: "",
    woocommerce_consumer_secret: "",
    inpost_buy_client_id: "",
    inpost_buy_client_secret: "",
    inpost_buy_organization_id: "",
    inpost_buy_sandbox: false,
    raben_username: "",
    raben_password: "",
    raben_edi_sender: "",
    raben_edi_receiver: "",
    raben_department: "",
    raben_payer_identifier: "",
    raben_is_test: true,
    raben_product_type: "PROD02",
    raben_service_level: "",
  };

  const methods = useForm<ServiceIntegrationFormValues>({
    resolver: zodResolver(serviceIntegrationFormSchema),
    defaultValues: FORM_DEFAULT_VALUES,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleSelectType = (type: ProviderType) => {
    setProviderType(type);
    let defaultName = "";
    switch (type) {
      case "ALLEGRO":
        defaultName = "Moje konto Allegro";
        break;
      case "BASELINKER":
        defaultName = "Magazyn BaseLinker";
        break;
      case "EMPIK":
        defaultName = "Konto Empik";
        break;
      case "WOOCOMMERCE":
        defaultName = "Sklep WooCommerce";
        break;
      case "INPOST_BUY":
        defaultName = "Konto InPost Buy";
        break;
      case "SUUS":
        defaultName = "SUUS";
        break;
      case "GEIS":
        defaultName = "Geis GService";
        break;
      case "GEODIS":
        defaultName = "Geodis WMS";
        break;
      case "AB":
        defaultName = "Hurtownia AB";
        break;
      case "APACZKA":
        defaultName = "Apaczka.pl";
        break;
      case "SUBIEKT_GT":
        defaultName = "Subiekt GT";
        break;
      case "KSEF":
        defaultName = "KSeF";
        break;
    }
    methods.reset({ ...FORM_DEFAULT_VALUES, provider_type: type, name: defaultName });
    setStep(2);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        methods.reset();
        setStep(1);
        setProviderType(null);
      }, 300);
    }
    setIsOpen(open);
  };

  const handleAllegroConnect = (integrationId: number) => {
    toast.loading("Przygotowywanie połączenia z Allegro...");
    api
      .get<{ authorization_url: string }>(
        `/service-integrations/${integrationId}/allegro/authorize`
      )
      .then((response) => {
        toast.dismiss();
        window.location.href = response.data.authorization_url;
      })
      .catch(() => {
        toast.error("Nie udało się rozpocząć autoryzacji.");
      });
  };

  const onSubmit: SubmitHandler<ServiceIntegrationFormValues> = async (
    values
  ) => {
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
      ksef_token,
      apaczka_app_id,
      apaczka_app_secret,
      nip,
      environment,
      empik_token,
      woocommerce_shop_url,
      woocommerce_consumer_key,
      woocommerce_consumer_secret,
      inpost_buy_client_id,
      inpost_buy_client_secret,
      inpost_buy_organization_id,
      inpost_buy_sandbox,
      ksef_auto_sync_enabled,
      ksef_sync_interval,
      geis_customer_code,
      geis_password,
      geis_is_test,
      geis_iban,
      geodis_client_id,
      geodis_client_secret,
      geodis_customer_id,
      geodis_warehouse_id,
      geodis_is_test,
      raben_username,
      raben_password,
      raben_edi_sender,
      raben_edi_receiver,
      raben_department,
      raben_payer_identifier,
      raben_is_test,
      raben_product_type,
      raben_service_level,
      ...integrationData
    } = values;

    const category =
      values.provider_type === "SUUS" || values.provider_type === "APACZKA" || values.provider_type === "GEIS" || values.provider_type === "GEODIS" || values.provider_type === "RABEN"
        ? "COURIER"
        : values.provider_type === "AB"
        ? "WHOLESALE"
        : values.provider_type === "SUBIEKT_GT"
        ? "ERP"
        : values.provider_type === "KSEF"
        ? "GOVERNMENT"
        : "MARKETPLACE";

    let api_config;
    let sync_config;

    if (values.provider_type === "BASELINKER")
      api_config = { api_token: api_token };
    else if (values.provider_type === "EMPIK")
      api_config = { api_token: empik_token };
    else if (values.provider_type === "WOOCOMMERCE")
      api_config = {
        shop_url: woocommerce_shop_url,
        consumer_key: woocommerce_consumer_key,
        consumer_secret: woocommerce_consumer_secret,
      };
    else if (values.provider_type === "INPOST_BUY")
      api_config = {
        client_id: inpost_buy_client_id,
        client_secret: inpost_buy_client_secret,
        organization_id: inpost_buy_organization_id,
        sandbox: inpost_buy_sandbox,
      };
    else if (values.provider_type === "SUUS")
      api_config = { login: suus_login, password: suus_password, order_type: suus_order_type };
    else if (values.provider_type === "GEIS")
      api_config = { customer_code: geis_customer_code, password: geis_password, is_test: geis_is_test, iban: geis_iban };
    else if (values.provider_type === "GEODIS")
      api_config = { client_id: geodis_client_id, client_secret: geodis_client_secret, customer_id: geodis_customer_id, warehouse_id: geodis_warehouse_id, is_test: geodis_is_test };
    else if (values.provider_type === "AB")
      api_config = {
        client_code: ab_client_code,
        login: ab_login,
        password: ab_password,
      };
    else if (values.provider_type === "SUBIEKT_GT")
      api_config = { agent_url: subiekt_agent_url, api_key: subiekt_api_key };
    else if (values.provider_type === "APACZKA")
      api_config = { app_id: apaczka_app_id, app_secret: apaczka_app_secret };
    else if (values.provider_type === "KSEF") {
      api_config = { token: ksef_token }; // Encrypted
      sync_config = { 
        nip: nip, 
        environment: environment,
        ksef_auto_sync_enabled: !!ksef_auto_sync_enabled,
        ksef_sync_interval: parseInt(ksef_sync_interval as any) || 30
      }; // Public
    } else if (values.provider_type === "RABEN") {
      api_config = {
        username: raben_username,
        password: raben_password,
        edi_sender: raben_edi_sender,
        edi_receiver: raben_edi_receiver,
        raben_department: raben_department,
        payer_identifier: raben_payer_identifier,
        is_test: raben_is_test !== false,
        product_type: raben_product_type || "PROD02",
        service_level: raben_service_level || ""
      };
    }

    const payload = { ...integrationData, category, api_config, sync_config };

    try {
      const response = await api.post<ServiceIntegration>(
        "/service-integrations",
        payload
      );
      toast.success("Integracja dodana pomyślnie!");
      onSuccess(response.data);
      handleDialogChange(false);

      if (values.provider_type === "ALLEGRO") {
        handleAllegroConnect(response.data.id);
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className={cn("transition-all duration-300 bg-background/95 backdrop-blur-2xl border border-border/30 shadow-[0_0_50px_rgba(0,0,0,0.6)] rounded-[24px] p-8", step === 1 ? "sm:max-w-5xl" : "sm:max-w-3xl")}>
        <DialogHeader className="border-b border-border/10 pb-4 mb-4">
          <DialogTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Dodaj nową integrację
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 1
              ? "Wybierz serwis z katalogu dostępnych integracji, aby rozpocząć konfigurację."
              : "Skonfiguruj połączenie z wybranym dostawcą usług."}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="min-h-[300px] py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === 1 && (
                    <Step1SelectType onSelect={handleSelectType} />
                  )}
                  {step === 2 && providerType && (
                    <Step2EnterDetails providerType={providerType} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="pt-4 flex justify-between items-center border-t">
              <div>
                {step === 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Wróć
                  </Button>
                )}
              </div>
              <div>
                {step === 2 && (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {providerType === "ALLEGRO"
                      ? "Zapisz i połącz"
                      : "Zapisz i aktywuj"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
