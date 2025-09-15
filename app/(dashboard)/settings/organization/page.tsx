"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Book, Building, Mail, Package, Users, Waypoints } from "lucide-react";

import { TeamMembersTab } from "./_components/team-members-tab";
import { GeneralSettingsTab } from "./_components/general-settings-tab";
import { SmtpSettingsTab } from "./_components/smtp-settings-tab";
import { AddressBookTab } from "./_components/address-book-tab";
import { PackagesTab } from "./_components/packages-tab";
import { DeliveryMappingsTab } from "./_components/delivery-mappings-tab";

export default function OrganizationSettingsPage() {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ustawienia Organizacji</h1>
        <p className="text-muted-foreground">
          Zarządzaj swoją firmą, zespołem i konfiguracją wysyłek.
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        {/* === POPRAWKA TUTAJ: ZMIANA NA `grid-cols-5` === */}
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="company">
            <Building className="mr-2 h-4 w-4" /> Dane firmy
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="mr-2 h-4 w-4" /> Opakowania
          </TabsTrigger>
          <TabsTrigger value="mappings">
            <Waypoints className="mr-2 h-4 w-4" />
            Mapowanie
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" /> Członkowie
          </TabsTrigger>
          <TabsTrigger value="smtp">
            <Mail className="mr-2 h-4 w-4" /> Konta SMTP
          </TabsTrigger>
          <TabsTrigger value="address-book">
            <Book className="mr-2 h-4 w-4" /> Książka adresowa
          </TabsTrigger>
        </TabsList>

        {/* Lepsza, bardziej reużywalna struktura dla zawartości zakładek */}
        <TabsContent value="members" className="mt-4">
          {renderTabContent(
            "Członkowie Zespołu",
            "Zapraszaj nowych użytkowników i zarządzaj ich dostępem.",
            TeamMembersTab
          )}
        </TabsContent>
        <TabsContent value="company" className="mt-4">
          {renderTabContent(
            "Dane Firmy",
            "Zaktualizuj dane swojej firmy.",
            GeneralSettingsTab
          )}
        </TabsContent>
        <TabsContent value="smtp" className="mt-4">
          {renderTabContent(
            "Konta Wysyłkowe (SMTP)",
            "Skonfiguruj własne serwery do wysyłki e-maili.",
            SmtpSettingsTab
          )}
        </TabsContent>
        <TabsContent value="address-book" className="mt-4">
          {renderTabContent(
            "Książka Adresowa",
            "Zarządzaj zapisanymi kontaktami do szybkiej wysyłki e-maili.",
            AddressBookTab
          )}
        </TabsContent>
        <TabsContent value="packages" className="mt-4">
          {renderTabContent(
            "Zarządzanie Opakowaniami",
            "Dodawaj i edytuj swoje standardowe opakowania wysyłkowe.",
            PackagesTab
          )}
        </TabsContent>
        <TabsContent value="mappings" className="mt-4">
          {renderTabContent(
            "Mapowanie Metod Dostaw",
            "Powiąż metody dostawy z marketplace z Twoimi usługami kurierskimi.",
            DeliveryMappingsTab
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
