"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ServiceIntegration } from "@/types/service-integration";
import { Organization } from "@/types/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  AlertCircle,
  Receipt,
  Tag,
  Info,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralShippingSettingsSubTab } from "./general-shipping-settings-sub-tab";
import { PrintHubSettingsForm } from "./print-hub-settings-form";

export function BillingSettingsTab() {
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery<ServiceIntegration[]>({
    queryKey: ["serviceIntegrations"],
    queryFn: async () => (await api.get("/service-integrations")).data,
  });

  const { data: organization, isLoading: isOrgLoading } = useQuery<Organization>({
    queryKey: ["organization"],
    queryFn: async () => (await api.get("/organization")).data,
  });

  const subiektIntegration = integrations?.find(
    (i) => i.provider_type === "SUBIEKT_GT"
  );

  const [referenceTemplate, setReferenceTemplate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (subiektIntegration?.sync_config?.erp_sales_reference_template) {
      setReferenceTemplate(
        subiektIntegration.sync_config.erp_sales_reference_template
      );
    } else if (subiektIntegration) {
      setReferenceTemplate("{order_id}");
    }
  }, [subiektIntegration]);

  const handleSave = async () => {
    if (!subiektIntegration?.id) return;
    try {
      setIsSaving(true);
      await api.patch(`/service-integrations/${subiektIntegration.id}`, {
        sync_config: {
          ...(subiektIntegration.sync_config || {}),
          erp_sales_reference_template: referenceTemplate,
        },
      });
      toast.success("Ustawienia nabijania zostały zapisane.");
      queryClient.invalidateQueries({ queryKey: ["serviceIntegrations"] });
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Nieznany błąd";
      toast.error(`Nie udało się zapisać ustawień: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subiektIntegration) {
    return (
      <Alert className="border-amber-500/30 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">
          Brak integracji z Subiekt GT
        </AlertTitle>
        <AlertDescription className="text-amber-600 dark:text-amber-300">
          Aby skonfigurować ustawienia nabijania, najpierw dodaj i aktywuj
          integrację z Subiekt GT w sekcji{" "}
          <a
            href="/integrations"
            className="underline font-medium hover:text-amber-500"
          >
            Integracje
          </a>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs defaultValue="erp" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="erp">Dokumenty ERP</TabsTrigger>
        <TabsTrigger value="shipping">Wysyłki i Druk</TabsTrigger>
      </TabsList>
      
      <TabsContent value="erp" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
        {/* Info */}
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Ustawienia globalne</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Poniższe ustawienia dotyczą wszystkich zamówień nabijanych do systemu{" "}
            <span className="font-semibold text-foreground">Subiekt GT</span>.
            Zmiany obowiązują natychmiast po zapisaniu.
          </AlertDescription>
        </Alert>

        {/* Sekcja: Referencja dokumentu */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">Dokument sprzedaży</h3>
          </div>

          <div className="space-y-3 max-w-xl">
            <Label htmlFor="reference-template" className="text-sm font-medium">
              Szablon referencji
            </Label>
            <div className="flex gap-2">
              <Input
                id="reference-template"
                value={referenceTemplate}
                onChange={(e) => setReferenceTemplate(e.target.value)}
                placeholder="{order_id}"
                className="flex-1"
              />
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="shrink-0 gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Zapisz
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Szablon wypełniany automatycznie w polu referencji przy wystawianiu
              dokumentu sprzedaży w Subiekcie. Dostępne tagi:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { tag: "{order_id}", desc: "Numer zamówienia" },
                { tag: "{login}", desc: "Login kupującego" },
                { tag: "{name}", desc: "Imię i nazwisko" },
                { tag: "{products}", desc: "Lista produktów" },
                { tag: "{source}", desc: "Nazwa źródła (sklepu)" },
              ].map(({ tag, desc }) => (
                <div key={tag} className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
                    onClick={() =>
                      setReferenceTemplate((prev) =>
                        prev ? `${prev} ${tag}` : tag
                      )
                    }
                    title={`Kliknij, aby wstawić ${tag}`}
                  >
                    <Tag className="h-3 w-3 mr-1 text-primary" />
                    {tag}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              💡 Kliknij tag, aby wstawić go do szablonu.
            </p>
          </div>
        </div>

        {/* Placeholder na przyszłe ustawienia */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Info className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">Więcej ustawień</h3>
          </div>
          <p className="text-sm text-muted-foreground italic">
            W przyszłości pojawią się tu dodatkowe opcje nabijania, np. domyślna
            stawka VAT, seria dokumentów, drukarki fiskalne i inne.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="shipping" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
        <GeneralShippingSettingsSubTab />
        {isOrgLoading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm">Ładowanie ustawień drukowania...</span>
          </div>
        ) : organization ? (
          <PrintHubSettingsForm organization={organization} />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
