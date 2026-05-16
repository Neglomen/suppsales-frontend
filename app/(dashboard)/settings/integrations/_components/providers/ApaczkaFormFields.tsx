import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function ApaczkaFormFields() {
  const { control } = useFormContext();

  return (
    <div className="space-y-4 pt-2">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa integracji</FormLabel>
            <FormControl>
              <Input placeholder="np. Konto Apaczka" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="apaczka_app_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>App ID</FormLabel>
            <FormControl>
              <Input placeholder="Wprowadź App ID z Web API" {...field} />
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
            <FormLabel>App Secret</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wprowadź App Secret z Web API"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
