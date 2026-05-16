"use client";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const BaselinkerFormFields = () => (
  <>
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input placeholder="Magazyn główny BaseLinker" {...field} />
          </FormControl>
          <FormDescription>
            Pomoże Ci zidentyfikować tę integrację.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="api_token"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Token API BaseLinker</FormLabel>
          <FormControl>
            <Input
              type="password"
              placeholder="••••••••••••••••••••"
              {...field}
            />
          </FormControl>
          <FormDescription>
            Token znajdziesz w panelu BaseLinker &rarr; Moje konto &rarr; API.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);
