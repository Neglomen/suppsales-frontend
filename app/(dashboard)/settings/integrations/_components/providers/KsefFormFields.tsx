import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const KsefFormFields = () => {
  const { control } = useFormContext();

  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa integracji</FormLabel>
            <FormControl>
              <Input placeholder="Np. Moja Firma KSeF" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="nip"
        render={({ field }) => (
          <FormItem>
            <FormLabel>NIP</FormLabel>
            <FormControl>
              <Input placeholder="1234567890" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="ksef_token"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token autoryzacyjny</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Token z aplikacji KSeF" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="environment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Środowisko</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz środowisko" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="test">Testowe (Demo)</SelectItem>
                <SelectItem value="prod">Produkcyjne</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
