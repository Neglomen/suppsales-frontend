// src/app/(dashboard)/integrations/_components/integration-form-dialog.tsx
"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { IntegrationSchema, IntegrationSchemaType } from "@/lib/zod";
import type { Integration } from "../page";
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
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";

interface IntegrationFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: (newIntegration: Integration) => void;
}

const Step1SelectType = ({
  onSelect,
}: {
  onSelect: (type: "ALLEGRO" | "BASELINKER") => void;
}) => (
  // Komponent bez zmian
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Wybierz serwis, który chcesz zintegrować.
    </p>
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
  </div>
);

const Step2EnterDetails = ({ type }: { type: "ALLEGRO" | "BASELINKER" }) => (
  // Komponent bez zmian
  <div className="space-y-4">
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input
              placeholder={
                type === "ALLEGRO"
                  ? "Moje konto Allegro"
                  : "Magazyn główny BaseLinker"
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
    {type === "BASELINKER" && (
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
    <p className="text-sm font-medium pt-2">Opcje synchronizacji</p>
    <FormField
      name="sync_orders"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
          <FormLabel>Synchronizuj zamówienia</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
    {type === "ALLEGRO" && (
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
  </div>
);

export function IntegrationFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
}: IntegrationFormDialogProps) {
  const [step, setStep] = useState(1);
  const [integrationType, setIntegrationType] = useState<
    "ALLEGRO" | "BASELINKER" | null
  >(null);

  const methods = useForm<IntegrationSchemaType>({
    resolver: zodResolver(IntegrationSchema),
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const handleSelectType = (type: "ALLEGRO" | "BASELINKER") => {
    setIntegrationType(type);
    if (type === "ALLEGRO") {
      methods.reset({
        type: "ALLEGRO",
        name: "",
        sync_orders: true,
        sync_messages: false,
        sync_returns: false,
      });
    } else {
      methods.reset({
        type: "BASELINKER",
        name: "",
        sync_orders: true,
        api_token: "",
      });
    }
    setStep(2);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        methods.reset();
        setStep(1);
        setIntegrationType(null);
      }, 300);
    }
    setIsOpen(open);
  };

  const onSubmit = async (values: IntegrationSchemaType) => {
    await toast.promise(api.post<Integration>("/integrations", values), {
      loading: "Zapisywanie integracji...",
      success: (response) => {
        onSuccess(response.data);
        handleDialogChange(false);
        return "Integracja dodana pomyślnie!";
      },
      error: (err) =>
        err.response?.data?.detail || "Nie udało się dodać integracji.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj nową integrację</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Wybierz serwis, z którym chcesz się połączyć."
              : `Konfiguracja dla ${integrationType}.`}
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
                {step === 2 && integrationType && (
                  <Step2EnterDetails type={integrationType} />
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
                  {integrationType === "ALLEGRO"
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
