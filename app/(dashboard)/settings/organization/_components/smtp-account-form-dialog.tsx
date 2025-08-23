// src/app/(dashboard)/settings/organization/_components/smtp-account-form-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import toast from "react-hot-toast";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { SmtpAccount } from "./smtp-settings-tab";

// === OSTATECZNY, POPRAWIONY SCHEMAT ZOD ===
// `port` jest teraz walidowany jako string, co eliminuje wszystkie problemy z typowaniem.
const SmtpAccountSchema = z.object({
  name: z.string().min(2, "Nazwa musi mieć co najmniej 2 znaki."),
  host: z.string().min(1, "Host jest wymagany."),
  port: z
    .string()
    .min(1, "Port jest wymagany.")
    .regex(/^\d+$/, "Port musi być liczbą."),
  user: z.string().email("Nieprawidłowy adres e-mail."),
  password: z.string().optional(),
  // Usunięto `.default(true)` - wartość domyślna jest ustawiana tylko w `useForm`
  use_tls: z.boolean(),
});
type SmtpAccountSchemaType = z.infer<typeof SmtpAccountSchema>;

interface SmtpAccountFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess: () => void;
  account: SmtpAccount | null;
}

export function SmtpAccountFormDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  account,
}: SmtpAccountFormDialogProps) {
  const isEditMode = !!account;

  const form = useForm<SmtpAccountSchemaType>({
    resolver: zodResolver(SmtpAccountSchema),
    defaultValues: {
      name: "",
      host: "",
      port: "587", // Wartość domyślna jest teraz stringiem
      user: "",
      password: "",
      use_tls: true,
    },
  });

  useEffect(() => {
    if (isOpen && account) {
      form.reset({
        name: account.name,
        host: account.host,
        port: String(account.port), // Konwertujemy liczbę na string dla formularza
        user: account.user,
        password: "",
        use_tls: true, // TODO: To pole również powinno przyjść z API
      });
    } else if (isOpen && !account) {
      form.reset({
        name: "",
        host: "",
        port: "587",
        user: "",
        password: "",
        use_tls: true,
      });
    }
  }, [isOpen, account, form]);

  const onSubmit = async (values: SmtpAccountSchemaType) => {
    // === KLUCZOWA ZMIANA: Konwersja na `number` odbywa się tutaj ===
    const payload = {
      ...values,
      port: parseInt(values.port, 10), // Konwertujemy string na liczbę przed wysłaniem
    };

    if (isEditMode && !payload.password) {
      delete (payload as any).password;
    }

    const apiCall = isEditMode
      ? api.put(`/smtp-accounts/${account.id}`, payload)
      : api.post("/smtp-accounts", payload);

    await toast.promise(apiCall, {
      loading: isEditMode ? "Aktualizowanie konta..." : "Dodawanie konta...",
      success: () => {
        onSuccess();
        return `Konto SMTP ${
          isEditMode ? "zaktualizowane" : "dodane"
        } pomyślnie.`;
      },
      error: (err) =>
        err.response?.data?.detail ||
        `Nie udało się ${isEditMode ? "zaktualizować" : "dodać"} konta.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edytuj konto SMTP" : "Dodaj nowe konto SMTP"}
          </DialogTitle>
          <DialogDescription>
            Wprowadź dane swojego serwera pocztowego. Hasło jest bezpiecznie
            szyfrowane.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa konta</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Marketing" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nazwa, która pomoże Ci zidentyfikować to konto.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Host SMTP</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="587"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Użytkownik (e-mail)</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    {isEditMode
                      ? "Wpisz tylko, jeśli chcesz zmienić hasło."
                      : "Hasło do Twojego konta e-mail."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="use_tls"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Używaj szyfrowania TLS</FormLabel>
                    <FormDescription>
                      Zalecane dla większości serwerów.
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
                Zapisz
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
