"use client";

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

export function WooCommerceFormFields() {
  const { control } = useFormContext();

  return (
    <div className="space-y-4 pt-4 border-t border-white/5">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nazwa integracji</FormLabel>
            <FormControl>
              <Input placeholder="np. WooCommerce (Główny sklep)" {...field} className="bg-background/80 border-border/20" />
            </FormControl>
            <FormDescription className="text-[10px] text-muted-foreground">
              Przyjazna nazwa ułatwiająca identyfikację tego konta w systemie.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="woocommerce_shop_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Adres URL sklepu</FormLabel>
            <FormControl>
              <Input placeholder="np. https://mojsklep.pl" {...field} value={field.value || ""} className="bg-background/80 border-border/20" />
            </FormControl>
            <FormDescription className="text-[10px] text-muted-foreground">
              Pełny adres URL sklepu (wraz z https://).
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="woocommerce_consumer_key"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Consumer Key</FormLabel>
            <FormControl>
              <Input
                placeholder="ck_..."
                {...field}
                value={field.value || ""}
                className="bg-background/80 border-border/20"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="woocommerce_consumer_secret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Consumer Secret</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="cs_..."
                {...field}
                value={field.value || ""}
                className="bg-background/80 border-border/20"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
