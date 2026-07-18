"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Book, Building, Link as LinkIcon, Mail, Package, Sliders, Users, Waypoints, Wand2 } from "lucide-react";

import { TeamMembersTab } from "./_components/team-members-tab";
import { GeneralSettingsTab } from "./_components/general-settings-tab";
import { SmtpSettingsTab } from "./_components/smtp-settings-tab";
import { AddressBookTab } from "./_components/address-book-tab";
import { PackagesTab } from "./_components/packages-tab";
import { SmartPackagesTab } from "./_components/smart-packages-tab";
import { DeliveryMappingsTab } from "./_components/delivery-mappings-tab";
import { MappingsDataTable } from "../product-erp-mappings/_components/mappings-data-table";
import { BillingSettingsTab } from "./_components/billing-settings-tab";
import { useMobile } from "@/hooks/use-mobile";

export default function OrganizationSettingsPage() {
  const isMobile = useMobile(768);

  const renderTabContent = (
    title: string,
    description: string,
    Component: React.ElementType
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Component />
      </CardContent>
    </Card>
  );

  if (isMobile) {
    return (
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ustawienia Zespołu</h1>
          <p className="text-muted-foreground">
            Zarządzaj zespołem i zaproszeniami na urządzeniu mobilnym.
          </p>
        </div>
        <div className="w-full">
          <TeamMembersTab />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ustawienia Organizacji</h1>
        <p className="text-muted-foreground">
          Zarządzaj swoją firmą, zespołem i konfiguracją wysyłek.
        </p>
      </div>

      <Tabs defaultValue="company" className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full">
        {/* === LEWY PANEL (Sidebar dla Ustawień) === */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 space-y-1 items-stretch">
            
            <div className="px-3 py-2 mt-2 mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Ogólne Ustawienia
            </div>
            
            <TabsTrigger value="company" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Building className="mr-3 h-4 w-4" /> Dane firmy
            </TabsTrigger>
            
            <TabsTrigger value="members" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Users className="mr-3 h-4 w-4" /> Członkowie zespołu
            </TabsTrigger>
            
            <TabsTrigger value="smtp" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Mail className="mr-3 h-4 w-4" /> Konta SMTP
            </TabsTrigger>
            
            <TabsTrigger value="address-book" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Book className="mr-3 h-4 w-4" /> Książka adresowa
            </TabsTrigger>

            <div className="px-3 py-2 mt-6 mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Mapowania i Operacje
            </div>

            <TabsTrigger value="packages" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Package className="mr-3 h-4 w-4" /> Opakowania kurierskie
            </TabsTrigger>

            <TabsTrigger value="smart-packages" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Wand2 className="mr-3 h-4 w-4" /> Inteligentne opakowania
            </TabsTrigger>
            
            <TabsTrigger value="mappings" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Waypoints className="mr-3 h-4 w-4" /> Mapowanie metod dostaw
            </TabsTrigger>

            <TabsTrigger value="erp-mappings" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <LinkIcon className="mr-3 h-4 w-4" /> Symbole ERP Aukcji
            </TabsTrigger>

            <div className="px-3 py-2 mt-6 mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              ERP i Nabijanie
            </div>

            <TabsTrigger value="billing-settings" className="justify-start px-4 h-10 w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-muted transition-colors rounded-xl">
              <Sliders className="mr-3 h-4 w-4" /> Ustawienia nabijania i druku
            </TabsTrigger>

          </TabsList>
        </div>

        {/* === PRAWY PANEL (Zawartość zakładek) === */}
        <div className="flex-1 min-w-0">

        {/* Lepsza, bardziej reużywalna struktura dla zawartości zakładek */}
        <TabsContent value="members" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <TeamMembersTab />
        </TabsContent>
        <TabsContent value="company" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {renderTabContent(
            "Dane Firmy",
            "Zaktualizuj dane swojej firmy.",
            GeneralSettingsTab
          )}
        </TabsContent>
        <TabsContent value="smtp" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {renderTabContent(
            "Konta Wysyłkowe (SMTP)",
            "Skonfiguruj własne serwery do wysyłki e-maili.",
            SmtpSettingsTab
          )}
        </TabsContent>
        <TabsContent value="address-book" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {renderTabContent(
            "Książka Adresowa",
            "Zarządzaj zapisanymi kontaktami do szybkiej wysyłki e-maili.",
            AddressBookTab
          )}
        </TabsContent>
        <TabsContent value="packages" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {renderTabContent(
            "Zarządzanie Opakowaniami",
            "Dodawaj i edytuj swoje standardowe opakowania wysyłkowe.",
            PackagesTab
          )}
        </TabsContent>
        <TabsContent value="smart-packages" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {renderTabContent(
            "Inteligentne Mapowanie Opakowań",
            "Zarządzaj regułami automatycznego dopasowywania opakowań do zamówień.",
            SmartPackagesTab
          )}
        </TabsContent>
        <TabsContent value="mappings" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {renderTabContent(
            "Mapowanie Metod Dostaw",
            "Powiąż metody dostawy z marketplace z Twoimi usługami kurierskimi.",
            DeliveryMappingsTab
          )}
        </TabsContent>
        <TabsContent value="erp-mappings" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          {renderTabContent(
            "Mapowania Produktów ERP (Aukcje)",
            "Zarządzaj powiązaniami między ofertami z marketplace a symbolami produktów w systemie ERP (np. Subiekt GT).",
            MappingsDataTable
          )}
        </TabsContent>
        <TabsContent value="billing-settings" className="m-0 focus-visible:outline-none focus-visible:ring-0">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia nabijania i druku</CardTitle>
              <CardDescription>
                Konfiguruj opcje wystawiania dokumentów w systemach ERP oraz parametry etykiet i wydruku PrintHub.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillingSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
