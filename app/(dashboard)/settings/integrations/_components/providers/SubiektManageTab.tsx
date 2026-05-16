"use client";

import { useFormContext } from "react-hook-form";
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
import { Settings, SlidersHorizontal } from "lucide-react";

import { SubiektMappingsTab } from "./SubiektMappingsTab";

// === POPRAWKA: Definiujemy propsy, które komponent będzie przyjmował ===
interface SubiektManageTabProps {
  integrationId: number;
}

export const SubiektManageTab = ({ integrationId }: SubiektManageTabProps) => {
  const form = useFormContext<IntegrationUpdateSchemaType>();
  console.log("SubiektManageTab rendered! Has tabs been removed? YES!");

  return (
    <div className="space-y-8">
      {/* SEKCJA: POŁĄCZENIE */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">Ustawienia połączenia</h3>
        </div>
        
        <FormField
          control={form.control}
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
        <FormField
          control={form.control}
          name="subiekt_agent_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres URL Agenta</FormLabel>
              <FormControl>
                <Input placeholder="https://....ngrok-free.app" {...field} />
              </FormControl>
              <FormDescription>
                Publiczny adres, pod którym działa Agent Sfery.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subiekt_api_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Klucz API Agenta</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Wprowadź, aby zmienić"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Pozostaw puste, aby nie zmieniać istniejącego klucza.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* SEKCJA: MAPOWANIA */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">Mapowania ustawień</h3>
        </div>
        
        <SubiektMappingsTab integrationId={integrationId} />
      </div>
    </div>
  );
};
