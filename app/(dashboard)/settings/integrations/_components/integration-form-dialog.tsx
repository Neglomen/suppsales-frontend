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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  AllegroIcon,
  BaseLinkerIcon,
  SuusIcon,
  ABIcon,
  SubiektIcon,
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
import { Package } from "lucide-react";

interface IntegrationFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: (newIntegration: ServiceIntegration) => void;
}

type ProviderType = "ALLEGRO" | "BASELINKER" | "SUUS" | "AB" | "SUBIEKT_GT" | "KSEF" | "APACZKA";

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
  <div
    onClick={onClick}
    className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:border-primary/50 hover:bg-card/40 cursor-pointer transition-all shadow-sm"
  >
    {icon}
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
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
}) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Wybierz serwis, który chcesz zintegrować.
    </p>

    <h4 className="font-semibold text-sm pt-2 text-muted-foreground">
      Marketplace
    </h4>
    <ProviderTile
      onClick={() => onSelect("ALLEGRO")}
      icon={<AllegroIcon className="w-24 h-auto" />}
      title="Allegro"
      description="Zamówienia, wiadomości, zwroty."
    />
    <ProviderTile
      onClick={() => onSelect("BASELINKER")}
      icon={<BaseLinkerIcon className="w-24 h-auto" />}
      title="BaseLinker"
      description="Synchronizuj zamówienia."
    />

    <h4 className="font-semibold text-sm pt-4 text-muted-foreground">
      Hurtownie
    </h4>
    <ProviderTile
      onClick={() => onSelect("AB")}
      icon={<ABIcon className="h-6 w-auto" />}
      title="AB S.A."
      description="Zlecenia, faktury, adresy."
    />

    <h4 className="font-semibold text-sm pt-4 text-muted-foreground">
      Systemy ERP
    </h4>
    <ProviderTile
      onClick={() => onSelect("SUBIEKT_GT")}
      icon={<SubiektIcon className="w-20 h-auto" />}
      title="Subiekt GT"
      description="Synchronizuj statusy faktur."
    />

    <h4 className="font-semibold text-sm pt-4 text-muted-foreground">
      Kurierzy
    </h4>
    <ProviderTile
      onClick={() => onSelect("SUUS")}
      icon={<SuusIcon className="w-30 h-auto" />}
      title="RÖHLIG SUUS"
      description="Nadawaj przesyłki, etykiety."
    />
    <ProviderTile
      onClick={() => onSelect("APACZKA")}
      icon={<Package className="h-10 w-10 text-primary" />}
      title="Apaczka"
      description="Tanie przesyłki kurierskie (DPD, UPS, itp.)."
    />

    <h4 className="font-semibold text-sm pt-4 text-muted-foreground">
      Administracja
    </h4>
    <ProviderTile
      onClick={() => onSelect("KSEF")}
      icon={<KsefIcon className="w-20 h-auto" />}
      title="KSeF"
      description="Pobieraj faktury zakupowe."
    />
  </div>
);

// Ten komponent pozostaje pusty, bo cała logika jest w dedykowanych plikach
const Step2EnterDetails = ({
  providerType,
}: {
  providerType: ProviderType;
}) => {
  return (
    <div className="space-y-4">
      {/* Dynamiczne renderowanie odpowiedniego zestawu pól, KTÓRY ZAWIERA JUŻ POLE 'NAME' */}
      {providerType === "ALLEGRO" && <AllegroFormFields />}
      {providerType === "BASELINKER" && <BaselinkerFormFields />}
      {providerType === "SUUS" && <SuusFormFields />}
      {providerType === "APACZKA" && <ApaczkaFormFields />}
      {providerType === "AB" && <ABFormFields />}
      {providerType === "SUBIEKT_GT" && <SubiektFormFields />}
      {providerType === "KSEF" && <KsefFormFields />}

      {["ALLEGRO", "BASELINKER"].includes(providerType) && (
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Opcje synchronizacji
          </h4>
          <SyncSwitch name="sync_orders" label="Synchronizuj zamówienia" />
          {providerType === "ALLEGRO" && (
            <>
              <SyncSwitch
                name="sync_messages"
                label="Synchronizuj wiadomości"
              />
              <SyncSwitch name="sync_returns" label="Synchronizuj zwroty" />
            </>
          )}
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

  const methods = useForm<ServiceIntegrationFormValues>({
    resolver: zodResolver(serviceIntegrationFormSchema),
    defaultValues: {
      name: "",
      sync_orders: false,
      sync_messages: false,
      sync_returns: false,
      api_token: "",
      suus_login: "",
      suus_password: "",
      ab_client_code: "",
      ab_login: "",
      ab_password: "",
      subiekt_agent_url: "",
      subiekt_api_key: "",
      nip: "",
      ksef_token: "",
      apaczka_app_id: "",
      apaczka_app_secret: "",
      // environment: undefined, // Select może być undefined
    },
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
      case "SUUS":
        defaultName = "SUUS";
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
    methods.reset({ provider_type: type, name: defaultName });
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
      ...integrationData
    } = values;

    const category =
      values.provider_type === "SUUS" || values.provider_type === "APACZKA"
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
    else if (values.provider_type === "SUUS")
      api_config = { login: suus_login, password: suus_password };
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
      sync_config = { nip: nip, environment: environment }; // Public
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj nową integrację</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Wybierz serwis, z którym chcesz się połączyć."
              : `Konfiguracja dla ${providerType}.`}
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
