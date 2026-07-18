"use client";

import { useEffect, useState } from "react";
import api, { getErrorMessage } from "@/lib/api";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, PlugZap } from "lucide-react";
import { IntegrationFormDialog } from "./_components/integration-form-dialog";
import { ManageIntegrationDialog } from "./_components/manage-integration-dialog";
import { ServiceIntegration } from "@/types/service-integration";
import { IntegrationCard } from "./_components/integration-card";
import { useMobile } from "@/hooks/use-mobile";
import { MobileLock } from "@/components/shared/mobile-lock";

export default function IntegrationsPage() {
  const isMobile = useMobile(768);
  const [integrations, setIntegrations] = useState<ServiceIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<ServiceIntegration | null>(null);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<ServiceIntegration[]>(
        "/service-integrations"
      );
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

  const handleIntegrationUpdate = (updatedIntegration: ServiceIntegration) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === updatedIntegration.id ? updatedIntegration : i))
    );
  };

  const onIntegrationAdded = (newIntegration: ServiceIntegration) => {
    setIntegrations([newIntegration, ...integrations]);
  };

  const handleManualSync = async (integrationId: number) => {
    await toast.promise(
      api.post(`/service-integrations/${integrationId}/sync-orders`),
      {
        loading: "Zlecanie synchronizacji...",
        success: "Synchronizacja została pomyślnie zlecona!",
        error: (err: any) =>
          err.response?.data?.detail || "Nie udało się zlecić synchronizacji.",
      }
    );
  };

  const handleManualMessageSync = async (integrationId: number) => {
    await toast.promise(
      api.post(`/service-integrations/${integrationId}/sync-messages`),
      {
        loading: "Zlecanie synchronizacji wiadomości...",
        success: "Synchronizacja wiadomości została pomyślnie zlecona!",
        error: (err: any) =>
          err.response?.data?.detail || "Nie udało się zlecić synchronizacji.",
      }
    );
  };

  const handleManualReturnSync = async (integrationId: number) => {
    await toast.promise(
      api.post(`/service-integrations/${integrationId}/sync-returns`),
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
        `/service-integrations/${integrationId}/allegro/authorize`
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
      });
  };

  const handleIntegrationDelete = async (integrationId: number) => {
    await toast.promise(api.delete(`/service-integrations/${integrationId}`), {
      loading: "Usuwanie integracji...",
      success: () => {
        setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));
        setEditingIntegration(null);
        return "Integracja została usunięta.";
      },
      error: (err) => getErrorMessage(err),
    });
  };

  if (isMobile) {
    return (
      <MobileLock
        title="Zarządzanie Integracjami Zablokowane"
        description="Konfiguracja połączeń Allegro, Subiekt ERP oraz kurierów jest niedostępna na smartfonach ze względów bezpieczeństwa i wygody konfiguracji. Skonfiguruj te ustawienia na komputerze."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 sm:p-8 space-y-8 max-w-[1600px] mx-auto min-h-[calc(100vh-8rem)]">
      {/* Dekoracyjne, rozmyte tła wektore dla nowoczesnego wyglądu (glassmorphism/ambient light) */}
      <div className="absolute top-0 left-1/4 w-[40vw] h-[40vw] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-1/4 w-[30vw] h-[30vw] bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none opacity-50" />

      {/* Header premium */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-dark p-6 rounded-2xl border border-border/10 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Zarządzanie Integracjami
          </h1>
          <p className="text-muted-foreground mt-1.5 font-medium">
            Zarządzaj połączeniami do platform sprzedażowych, ERP i systemów wysyłkowych.
          </p>
        </div>
        <Button 
          onClick={() => setFormOpen(true)}
          size="lg"
          className="relative z-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow rounded-xl"
        >
          <PlusCircle className="mr-2.5 h-5 w-5" />
          <span className="font-semibold tracking-wide">Dodaj Integrację</span>
        </Button>
      </div>

      {integrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 glass-dark rounded-2xl border border-dashed border-border/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none" />
          <div className="relative z-10 p-5 rounded-full bg-background/50 border border-border/20 mb-6 shadow-inner">
            <PlugZap className="h-12 w-12 text-muted-foreground/50" />
          </div>
          <h3 className="relative z-10 text-xl font-bold font-heading mb-2">Brak integracji</h3>
          <p className="relative z-10 text-muted-foreground max-w-sm text-center mb-8">
            Podłącz swoje pierwsze konto marketplace lub system ERP, aby zautomatyzować procesy.
          </p>
          <Button 
            size="lg" 
            variant="outline" 
            className="relative z-10 border-primary/30 text-primary hover:bg-primary/10 rounded-xl font-medium" 
            onClick={() => setFormOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Rozpocznij Konfigurację
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onManageClick={setEditingIntegration}
              onReconnectClick={handleAllegroConnect}
            />
          ))}
        </div>
      )}

      <IntegrationFormDialog
        isOpen={isFormOpen}
        setIsOpen={setFormOpen}
        onSuccess={onIntegrationAdded}
      />

      <ManageIntegrationDialog
        isOpen={!!editingIntegration}
        setIsOpen={(isOpen: boolean) => !isOpen && setEditingIntegration(null)}
        integration={editingIntegration}
        onManualSync={handleManualSync}
        onManualMessageSync={handleManualMessageSync}
        onUpdate={handleIntegrationUpdate}
        onManualReturnSync={handleManualReturnSync}
        onDelete={handleIntegrationDelete}
        onReconnect={handleAllegroConnect}
      />
    </div>
  );
}
