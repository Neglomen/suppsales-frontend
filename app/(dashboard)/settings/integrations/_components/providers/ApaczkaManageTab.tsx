import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function ApaczkaManageTab() {
  const { control } = useFormContext();

  return (
    <div className="space-y-4 pt-2">
      <FormField
        control={control}
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

      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Dane dostępowe (opcjonalnie do zmiany)</h4>
        <p className="text-sm text-muted-foreground">
          Wypełnij tylko jeśli chcesz zaktualizować klucze API.
        </p>

        <FormField
          control={control}
          name="apaczka_app_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nowy App ID</FormLabel>
              <FormControl>
                <Input placeholder="Wprowadź nowy App ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="apaczka_app_secret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nowy App Secret</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Wprowadź nowy App Secret"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="apaczka_bank_account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konto bankowe COD</FormLabel>
              <FormControl>
                <Input
                  placeholder="np. 12345678901234567890123456"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                26-cyfrowy numer konta bankowego do wypłaty pobrań (wymagany dla zamówień COD).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
