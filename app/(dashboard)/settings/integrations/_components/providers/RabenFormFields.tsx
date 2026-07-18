"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const RabenFormFields = () => (
  <>
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input placeholder="Kurier Raben" {...field} />
          </FormControl>
          <FormDescription>
            Pomoże Ci zidentyfikować tę integrację w systemie.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_username"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa użytkownika API</FormLabel>
          <FormControl>
            <Input placeholder="Twój login do API Raben" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Hasło API</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••••••••" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_edi_sender"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Identyfikator nadawcy EDI (Sender ID)</FormLabel>
          <FormControl>
            <Input placeholder="np. NAZWA_TWOJEJ_FIRMY" {...field} />
          </FormControl>
          <FormDescription>
            Nazwa Twojej firmy przekazana w nagłówku EDI (np. TEST_CLIENT).
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_edi_receiver"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Identyfikator odbiorcy EDI (Receiver ID)</FormLabel>
          <FormControl>
            <Input placeholder="np. Raben Poland" {...field} />
          </FormControl>
          <FormDescription>
            Nazwa podmiotu Raben odbierającego zlecenia (domyślnie: Raben Poland).
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_department"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Numer oddziału (Department ID)</FormLabel>
          <FormControl>
            <Input placeholder="np. 10" {...field} />
          </FormControl>
          <FormDescription>
            Numer oddziału obsługującego Twoje zlecenia (ustalany z Raben).
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_payer_identifier"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Identyfikator płatnika (Payer ID)</FormLabel>
          <FormControl>
            <Input placeholder="np. 90000050" {...field} />
          </FormControl>
          <FormDescription>
            Numer konta rozliczeniowego płatnika w systemie Raben.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_product_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Domyślny typ produktu (Usługi)</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value || "PROD02"}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz typ produktu" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="PROD02">Cargo Premium (Drobnicowy standardowy)</SelectItem>
              <SelectItem value="PROD01">Cargo Standard</SelectItem>
              <SelectItem value="PROD03">Cargo Express</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="raben_is_test"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">Środowisko testowe (Sandbox)</FormLabel>
            <FormDescription>
              Włącz, aby wysyłać zlecenia testowe do piaskownicy Raben Group.
            </FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value !== false} // Domyślnie włączone (true)
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  </>
);
