"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function EmpikFormFields() {
  const { control } = useFormContext();

  return (
    <div className="space-y-4 pt-4 border-t">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa integracji</FormLabel>
            <FormControl>
              <Input placeholder="np. Empik Place (Główne konto)" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="empik_token"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Token API (Klucz API)</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="Wklej swój token API z panelu Empik Place"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
