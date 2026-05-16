import { UseFormReturn } from "react-hook-form";
import { IntegrationUpdateSchemaType } from "@/lib/zod";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { KeyRound } from "lucide-react";

export function BaseLinkerManageForm({
  form,
}: {
  form: UseFormReturn<IntegrationUpdateSchemaType>;
}) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa własna</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Magazyn główny BaseLinker" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <h4 className="font-semibold pt-2 pb-1 border-b">Dane uwierzytelniające</h4>
      <div className="rounded-lg border bg-card/40 p-1">
        <FormField
          control={form.control}
          name="api_token"
          render={({ field }) => (
            <FormItem className="p-3">
              <FormLabel className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <KeyRound className="w-4 h-4" /> Token API
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••••••••••••••"
                  className="mt-1"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Wypełnij tylko, jeśli chcesz zaktualizować zapisany token API do integracji z zewnętrznym kontem. Znajdziesz go w panelu BaseLinker.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <h4 className="font-semibold pt-2 pb-1 border-b">Ustawienia synchronizacji</h4>
      <FormField
        control={form.control}
        name="sync_orders"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all">
            <div>
              <FormLabel className="text-base font-medium">Pobieranie Zamówień</FormLabel>
              <p className="text-sm text-muted-foreground mt-1">Uczestniczy w ogólnym harmonogramie importu</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
