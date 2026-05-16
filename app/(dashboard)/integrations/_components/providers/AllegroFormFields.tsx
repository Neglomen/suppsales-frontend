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

export const AllegroFormFields = () => (
  <FormField
    name="name"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Nazwa własna</FormLabel>
        <FormControl>
          <Input placeholder="Moje konto Allegro" {...field} />
        </FormControl>
        <FormDescription>
          Pomoże Ci zidentyfikować tę integrację na listach.
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
);
