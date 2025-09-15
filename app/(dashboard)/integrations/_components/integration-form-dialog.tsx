"use client";

import { useState } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import {
  AllegroIcon,
  BaseLinkerIcon,
  SuusIcon,
  ABIcon,
} from "@/components/shared/icons";

interface IntegrationFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: (newIntegration: ServiceIntegration) => void;
}

type ProviderType = "ALLEGRO" | "BASELINKER" | "SUUS" | "AB";

const Step1SelectType = ({
  onSelect,
}: {
  onSelect: (type: ProviderType) => void;
}) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Wybierz serwis, który chcesz zintegrować.
    </p>

    <p className="font-semibold text-sm pt-2">Marketplace</p>
    <div
      onClick={() => onSelect("ALLEGRO")}
      className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
    >
      <AllegroIcon className="h-10 w-10" />
      <div>
        <p className="font-semibold">Allegro</p>
        <p className="text-sm text-muted-foreground">
          Synchronizuj zamówienia, wiadomości i zwroty.
        </p>
      </div>
    </div>
    <div
      onClick={() => onSelect("BASELINKER")}
      className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
    >
      <BaseLinkerIcon className="h-10 w-10 rounded" />
      <div>
        <p className="font-semibold">BaseLinker</p>
        <p className="text-sm text-muted-foreground">
          Synchronizuj zamówienia ze swojego konta BaseLinker.
        </p>
      </div>
    </div>

    <p className="font-semibold text-sm pt-4">Kurierzy</p>
    <div
      onClick={() => onSelect("SUUS")}
      className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
    >
      <SuusIcon className="h-auto w-20" />
      <div>
        <p className="font-semibold">RÖHLIG SUUS</p>
        <p className="text-sm text-muted-foreground">
          Nadawaj przesyłki i generuj etykiety.
        </p>
      </div>
    </div>

    <p className="font-semibold text-sm pt-4">Hurtownie</p>
    <div
      onClick={() => onSelect("AB")}
      className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
    >
      <ABIcon className="h-10 w-auto" />
      <div>
        <p className="font-semibold">AB S.A.</p>
        <p className="text-sm text-muted-foreground">
          Dodawaj adresy wysyłkowe, pobieraj faktury.
        </p>
      </div>
    </div>
  </div>
);

const Step2EnterDetails = ({
  providerType,
}: {
  providerType: ProviderType;
}) => (
  <div className="space-y-4">
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input
              placeholder={
                providerType === "ALLEGRO"
                  ? "Moje konto Allegro"
                  : providerType === "BASELINKER"
                  ? "Magazyn główny BaseLinker"
                  : "SUUS"
              }
              {...field}
            />
          </FormControl>
          <FormDescription>
            Nazwa, która pomoże Ci zidentyfikować tę integrację.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    {providerType === "BASELINKER" && (
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
              Znajdziesz go w panelu BaseLinker &rarr; Moje konto &rarr; API.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    )}
    {providerType === "SUUS" && (
      <>
        <FormField
          name="suus_login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Login SUUS</FormLabel>
              <FormControl>
                <Input placeholder="Twój login do WebAPI" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="suus_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hasło SUUS</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••••••••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    )}

    {providerType === "AB" && (
      <>
        <FormField
          name="ab_client_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kod klienta AB</FormLabel>
              <FormControl>
                <Input placeholder="Twój kod klienta" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="ab_login"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Login do systemu AB</FormLabel>
              <FormControl>
                <Input placeholder="Login do dealer.ab.pl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="ab_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hasło do systemu AB</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••••••••••••••"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    )}

    {providerType !== "SUUS" && providerType !== "AB" && (
      <>
        <p className="text-sm font-medium pt-2">Opcje synchronizacji</p>
        <FormField
          name="sync_orders"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <FormLabel>Synchronizuj zamówienia</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {providerType === "ALLEGRO" && (
          <>
            <FormField
              name="sync_messages"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Synchronizuj wiadomości</FormLabel>
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
              name="sync_returns"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel>Synchronizuj zwroty</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}
      </>
    )}
  </div>
);

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
      sync_orders: false,
      sync_messages: false,
      sync_returns: false,
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleSelectType = (type: ProviderType) => {
    setProviderType(type);
    if (type === "ALLEGRO") {
      methods.reset({
        provider_type: "ALLEGRO",
        name: "",
        sync_orders: true,
        sync_messages: true,
        sync_returns: true,
      });
    } else if (type === "BASELINKER") {
      methods.reset({
        provider_type: "BASELINKER",
        name: "",
        sync_orders: true,
        api_token: "",
      });
    } else if (type === "SUUS") {
      // Dla SUUS nie resetujemy opcji synchronizacji, bo są ukryte
      methods.reset({
        provider_type: "SUUS",
        name: "SUUS",
        suus_login: "",
        suus_password: "",
      });
    } else if (type === "AB") {
      // ### DODAJ NOWY WARUNEK ###
      methods.reset({
        provider_type: "AB",
        name: "Hurtownia AB",
        ab_client_code: "",
        ab_login: "",
        ab_password: "",
      });
    }
    setStep(2);
  };
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        methods.reset({
          name: "",
          api_token: "",
          suus_login: "",
          suus_password: "",
          ab_client_code: "", // <-- DODAJ
          ab_login: "", // <-- DODAJ
          ab_password: "",
          sync_orders: false,
          sync_messages: false,
          sync_returns: false,
        });
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
    // ### START OSTATECZNEJ POPRAWKI ###

    // 1. Destrukturyzujemy WSZYSTKIE potencjalne pola z formularza
    const {
      api_token,
      suus_login,
      suus_password,
      ab_client_code,
      ab_login,
      ab_password,
      ...integrationData // reszta pól (name, provider_type, sync_*)
    } = values;

    // 2. Ustalamy kategorię
    const category =
      values.provider_type === "SUUS"
        ? "COURIER"
        : values.provider_type === "AB"
        ? "WHOLESALE"
        : "MARKETPLACE";

    // 3. Budujemy obiekt `api_config` w zależności od typu integracji
    let api_config;
    if (values.provider_type === "BASELINKER") {
      api_config = { api_token: api_token };
    } else if (values.provider_type === "SUUS") {
      api_config = { login: suus_login, password: suus_password };
    } else if (values.provider_type === "AB") {
      api_config = {
        client_code: ab_client_code,
        login: ab_login,
        password: ab_password,
      };
    }

    // 4. Składamy finalny payload, który jest w 100% zgodny z oczekiwaniami backendu
    const payload = {
      ...integrationData,
      category,
      api_config: api_config, // `api_config` będzie `undefined` dla Allegro, co jest OK
    };

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
      // Ta obsługa błędów jest już poprawna i teraz powinna
      // wyświetlić czytelny komunikat z błędu 422, jeśli taki wystąpi.
      let errorMessage = "Wystąpił nieoczekiwany błąd.";
      if (err.response?.data?.detail) {
        // Sprawdzamy, czy 'detail' to string, czy obiekt błędu walidacji
        if (typeof err.response.data.detail === "string") {
          errorMessage = err.response.data.detail;
        } else if (
          Array.isArray(err.response.data.detail) &&
          err.response.data.detail[0]?.msg
        ) {
          // Błąd walidacji Pydantic
          errorMessage = err.response.data.detail[0].msg;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    }
    // ### KONIEC OSTATECZNEJ POPRAWKI ###
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
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && <Step1SelectType onSelect={handleSelectType} />}
                {step === 2 && providerType && (
                  <Step2EnterDetails providerType={providerType} />
                )}
              </motion.div>
            </AnimatePresence>
            <div className="pt-6 flex justify-end gap-2">
              {step === 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                >
                  Wróć
                </Button>
              )}
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
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
