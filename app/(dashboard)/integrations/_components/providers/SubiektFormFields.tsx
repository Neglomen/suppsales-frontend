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

export const SubiektFormFields = () => (
  <>
    <FormField
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Nazwa własna</FormLabel>
          <FormControl>
            <Input placeholder="Subiekt GT (Firma)" {...field} />
          </FormControl>
          <FormDescription>
            Pomoże Ci zidentyfikować tę integrację.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="subiekt_agent_url"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Adres URL Agenta</FormLabel>
          <FormControl>
            <Input placeholder="https://....ngrok-free.app" {...field} />
          </FormControl>
          <FormDescription>
            Publiczny adres URL, pod którym działa Agent Sfery.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <FormField
      name="subiekt_api_key"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Klucz API Agenta</FormLabel>
          <FormControl>
            <Input type="password" placeholder="••••••••••••••" {...field} />
          </FormControl>
          <FormDescription>
            Klucz API skonfigurowany w agencie (X-API-Key).
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);
