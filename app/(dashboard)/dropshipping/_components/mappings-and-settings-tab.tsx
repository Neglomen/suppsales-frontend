"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductSupplierMappings } from "./product-supplier-mappings";
import { SettingsForm } from "./history-and-settings";
import { Link2, Settings } from "lucide-react";

export function MappingsAndSettingsTab() {
  return (
    <div className="space-y-4 p-2 sm:p-4">
      <Tabs defaultValue="mappings" className="w-full space-y-4">
        <TabsList className="border border-white/10 bg-slate-900/60 p-1 rounded-2xl glass shadow-md flex flex-wrap h-auto gap-1 self-start shrink-0">
          <TabsTrigger
            value="mappings"
            className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200"
          >
            <Link2 className="h-4 w-4" />
            Mapowania Produktów & Ofert
          </TabsTrigger>

          <TabsTrigger
            value="settings"
            className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
            Ustawienia Integracji & Nadawcy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="mt-0 focus:outline-none">
          <ProductSupplierMappings />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 focus:outline-none">
          <SettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
