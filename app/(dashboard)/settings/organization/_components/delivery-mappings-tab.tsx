"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MappingsSubTab } from "./mappings-sub-tab";
import { AdditionalServicesSubTab } from "./additional-services-sub-tab";

export function DeliveryMappingsTab() {
  return (
    <Tabs defaultValue="mappings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="mappings">Mapowania Metod Dostawy</TabsTrigger>
        <TabsTrigger value="additional_services">Usługi Dodatkowe</TabsTrigger>
      </TabsList>
      <TabsContent value="mappings">
        {/* Przenosimy całą logikę listy mapowań do nowego komponentu */}
        <MappingsSubTab />
      </TabsContent>
      {/* === NOWA ZAWARTOŚĆ ZAKŁADKI === */}
      <TabsContent value="additional_services">
        <AdditionalServicesSubTab />
      </TabsContent>
    </Tabs>
  );
}
