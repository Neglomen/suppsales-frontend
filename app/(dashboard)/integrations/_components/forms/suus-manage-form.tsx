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
import { Briefcase, Key } from "lucide-react";

export function SuusManageForm({
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
            <FormLabel>Nazwa własna kuriera</FormLabel>
            <FormControl>
              <Input {...field} placeholder="RÖHLIG SUUS" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <h4 className="font-semibold pt-2 pb-1 border-b">Dane logowania WebAPI</h4>
      <div className="space-y-3 rounded-lg border bg-card/40 p-3 pt-5 pb-5">
        <FormField
          control={form.control}
          name="suus_login"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <Briefcase className="w-4 h-4" /> Login SUUS
              </FormLabel>
              <FormControl>
                <Input placeholder="Wprowadź login do systemu kurierskiego" {...field} />
              </FormControl>
              <FormDescription>
                Wypełnij tylko wtedy, gdy chcesz zaktualizować login dostępowy.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="suus_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 mt-2">
                <Key className="w-4 h-4" /> Hasło SUUS
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••••••••••••••"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Wypełnij tylko wtedy, gdy chcesz zaktualizować hasło certyfikowane.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
