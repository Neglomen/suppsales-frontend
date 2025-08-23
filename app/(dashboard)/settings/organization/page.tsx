// src/app/(dashboard)/settings/organization/page.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMembersTab } from "./_components/team-members-tab";
import { GeneralSettingsTab } from "./_components/general-settings-tab";
import { SmtpSettingsTab } from "./_components/smtp-settings-tab";
// === NOWY IMPORT ===
import { AddressBookTab } from "./_components/address-book-tab";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OrganizationSettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Zarządzanie Organizacją</h1>
        <p className="text-muted-foreground">
          Zarządzaj danymi swojej firmy, członkami zespołu i ustawieniami.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        {/* === ZMIANA: Dodajemy 4 kolumny do siatki zakładek === */}
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Ustawienia Ogólne</TabsTrigger>
          <TabsTrigger value="members">Członkowie</TabsTrigger>
          <TabsTrigger value="address-book">Książka Adresowa</TabsTrigger>
          <TabsTrigger value="smtp">Wysyłka (SMTP)</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Członkowie Zespołu</CardTitle>
              <CardDescription>
                Zapraszaj nowych użytkowników i zarządzaj ich dostępem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamMembersTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* === NOWA ZAKŁADKA === */}
        <TabsContent value="address-book">
          <Card>
            <CardHeader>
              <CardTitle>Książka Adresowa</CardTitle>
              <CardDescription>
                Zarządzaj zapisanymi kontaktami do szybkiej wysyłki e-maili.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddressBookTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia Ogólne</CardTitle>
              <CardDescription>Zaktualizuj dane swojej firmy.</CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>Konta Wysyłkowe (SMTP)</CardTitle>
              <CardDescription>
                Skonfiguruj własne serwery do wysyłki e-maili.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SmtpSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
