"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Loader2,
  PlugZap,
  MessageSquareReply,
  AlertCircle,
} from "lucide-react"; // DODAJ NOWĄ IKONĘ
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationFormDialog } from "./_components/integration-form-dialog";
import { AllegroIcon, BaseLinkerIcon } from "@/components/shared/icons";
import { ManageIntegrationDialog } from "./_components/manage-integration-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { TooltipTrigger } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

// Definicja typu, który otrzymamy z API (bez zmian)
export interface Integration {
  id: number;
  name: string;
  type: "ALLEGRO" | "BASELINKER" | "EMPIK";
  is_active: boolean;
  external_user_id: string | null;
  sync_orders: boolean;
  sync_messages: boolean;
  sync_returns: boolean;
  autoresponder_enabled: boolean;
  autoresponder_message: string | null;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<Integration | null>(null);

  const openManageDialog = (integration: Integration) => {
    setEditingIntegration(integration);
  };

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Integration[]>("/integrations");
      setIntegrations(response.data);
    } catch (error) {
      toast.error("Nie udało się pobrać listy integracji.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleIntegrationUpdate = (updatedIntegration: Integration) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === updatedIntegration.id ? updatedIntegration : i))
    );
  };

  const handleManualReturnSync = async (integrationId: number) => {
    await toast.promise(
      api.post(`/integrations/${integrationId}/sync-returns`),
      {
        loading: "Zlecanie synchronizacji zwrotów...",
        success: "Synchronizacja zwrotów została pomyślnie zlecona!",
        error: (err: any) =>
          err.response?.data?.detail ||
          "Nie udało się zlecić synchronizacji zwrotów.",
      }
    );
  };

  const handleAllegroConnect = (integrationId: number) => {
    const toastId = toast.loading("Przygotowywanie połączenia...");
    api
      .get<{ authorization_url: string }>(
        `/integrations/${integrationId}/allegro/authorize`
      )
      .then((response) => {
        window.open(
          response.data.authorization_url,
          "_blank",
          "width=600,height=700"
        );
        const timer = setInterval(() => {
          if (document.hasFocus()) {
            fetchIntegrations();
            clearInterval(timer);
          }
        }, 1000);
        toast.success("Otwarto okno autoryzacji Allegro...", { id: toastId });
      })
      .catch((error) => {
        toast.error("Nie udało się rozpocząć autoryzacji.", { id: toastId });
        console.error("Nie udało się rozpocząć autoryzacji:", error);
      });
  };

  const handleManualSync = async (integrationId: number) => {
    await toast.promise(api.post(`/integrations/${integrationId}/sync`), {
      loading: "Zlecanie synchronizacji...",
      success: "Synchronizacja została pomyślnie zlecona!",
      error: (err: any) =>
        err.response?.data?.detail || "Nie udało się zlecić synchronizacji.",
    });
  };

  const handleManualMessageSync = async (integrationId: number) => {
    await toast.promise(
      api.post(`/integrations/${integrationId}/sync-messages`),
      {
        loading: "Zlecanie synchronizacji wiadomości...",
        success: "Synchronizacja wiadomości została pomyślnie zlecona!",
        error: (err: any) =>
          err.response?.data?.detail || "Nie udało się zlecić synchronizacji.",
      }
    );
  };

  const onIntegrationAdded = (newIntegration: Integration) => {
    setIntegrations([newIntegration, ...integrations]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zarządzanie Integracjami</h1>
          <p className="text-muted-foreground">
            Podłącz swoje konta marketplace i inne narzędzia.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj Integrację
        </Button>
      </div>

      {integrations.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <PlugZap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Brak integracji</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Nie masz jeszcze żadnych połączonych kont.
          </p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            Dodaj swoją pierwszą integrację
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <Card
              key={integration.id}
              className={cn(
                "flex flex-col",
                !integration.is_active &&
                  "border-destructive/50 bg-destructive/5"
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {integration.type === "ALLEGRO" && (
                    <AllegroIcon className="h-6 w-6" />
                  )}
                  {integration.type === "BASELINKER" && (
                    <BaseLinkerIcon className="h-6 w-6 rounded" />
                  )}
                  {integration.name}
                  {!integration.is_active && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Połączenie wygasło lub jest nieprawidłowe. Wymagana
                            akcja.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
                {integration.is_active && integration.external_user_id ? (
                  <CardDescription>
                    Połączono jako:{" "}
                    <span className="font-semibold text-foreground">
                      {integration.external_user_id}
                    </span>
                  </CardDescription>
                ) : (
                  <CardDescription>{integration.type}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 flex-grow">
                <p className="text-sm font-medium">
                  Ustawienia synchronizacji:
                </p>
                <div className="flex flex-wrap gap-2">
                  {integration.sync_orders && (
                    <Badge variant="outline">Zamówienia</Badge>
                  )}
                  {integration.type === "ALLEGRO" &&
                    integration.sync_messages && (
                      <Badge variant="outline">Wiadomości</Badge>
                    )}
                  {integration.type === "ALLEGRO" &&
                    integration.sync_returns && (
                      <Badge variant="outline">Zwroty</Badge>
                    )}
                  {integration.type === "ALLEGRO" &&
                    integration.autoresponder_enabled && (
                      <Badge
                        variant="default"
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        <MessageSquareReply className="mr-1 h-3 w-3" />
                        Autoresponder
                      </Badge>
                    )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center bg-muted/50 p-3 mt-4">
                <Badge
                  variant={integration.is_active ? "default" : "destructive"}
                >
                  {integration.is_active ? "Połączona" : "Wymaga uwagi"}
                </Badge>

                {integration.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openManageDialog(integration)}
                  >
                    Zarządzaj
                  </Button>
                ) : integration.type === "ALLEGRO" ? (
                  <Button
                    onClick={() => handleAllegroConnect(integration.id)}
                    size="sm"
                  >
                    Połącz ponownie
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openManageDialog(integration)}
                  >
                    Popraw konfigurację
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <IntegrationFormDialog
        isOpen={isDialogOpen}
        setIsOpen={setDialogOpen}
        onSuccess={onIntegrationAdded}
      />

      <ManageIntegrationDialog
        isOpen={!!editingIntegration}
        setIsOpen={(isOpen) => !isOpen && setEditingIntegration(null)}
        integration={editingIntegration}
        onManualSync={handleManualSync}
        onManualMessageSync={handleManualMessageSync}
        onUpdate={handleIntegrationUpdate}
        onManualReturnSync={handleManualReturnSync}
      />
    </div>
  );
}
