"use client";

// Istniejące importy...
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <-- NOWY IMPORT
import { MappingsSubTab } from "./mappings-sub-tab"; // <-- NOWY IMPORT
import { GeneralShippingSettingsSubTab } from "./general-shipping-settings-sub-tab"; // <-- NOWY IMPORT
import { AdditionalServicesSubTab } from "./additional-services-sub-tab";

export function DeliveryMappingsTab() {
  return (
    <Tabs defaultValue="mappings" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="general">Ustawienia Ogólne</TabsTrigger>
        <TabsTrigger value="mappings">Mapowania Metod Dostawy</TabsTrigger>
        <TabsTrigger value="additional_services">Usługi Dodatkowe</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        {/* Tutaj umieścimy nowe ustawienia */}
        <GeneralShippingSettingsSubTab />
      </TabsContent>
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
