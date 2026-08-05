"use client";

import { useState } from "react";
import { MarketplaceOrderListColumn } from "./_components/marketplace-order-list-column";
import { PurchaseOrderDetailsColumn } from "./_components/purchase-order-details-column";
import { OrdersAndBatchesTab } from "./_components/orders-and-batches-tab";
import { MappingsAndSettingsTab } from "./_components/mappings-and-settings-tab";
import { MarketplaceOrder } from "@/types/marketplace-order";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, FileText, Settings } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { MobileLock } from "@/components/shared/mobile-lock";

export default function DropshippingPage() {
  const [selectedDropshippingOrderId, setSelectedDropshippingOrderId] = useState<string | null>(null);
  const isMobile = useMobile(768);

  if (isMobile) {
    return (
      <MobileLock
        title="Dropshipping"
        description="Zarządzanie dropshippingiem dostępne jest wyłącznie na komputerze lub tablecie. Ta sekcja wymaga pełnego interfejsu desktopowego."
      />
    );
  }

  return (
    <div className="space-y-3 max-w-[1700px] mx-auto w-full h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-7.5rem)] flex flex-col overflow-hidden pb-2 px-2 sm:px-4">
      {/* Szklany, lekki nagłówek zoptymalizowany pod laptopy i mniejsze ekrany */}
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-slate-900/60 backdrop-blur-md p-3.5 sm:p-5 shadow-lg shrink-0">
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                Pulpit Sprzedawcy
              </span>
              <span className="text-[10px] text-muted-foreground font-mono hidden md:inline">
                • Automatyzacja Hurtowni
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
              Dropshipping
            </h1>
          </div>
          <p className="text-muted-foreground text-xs max-w-md hidden xl:block text-right leading-relaxed">
            Wysyłka hurtowniana, automatyczne zlecenia i synchronizacja stanów magazynowych.
          </p>
        </div>
      </div>

      <Tabs defaultValue="create" className="flex-1 flex flex-col w-full min-h-0">
        {/* Górny pasek 3 głównych zakładek */}
        <div className="w-full flex justify-start pb-2 border-b border-border/10 shrink-0 overflow-x-auto scrollbar-none">
          <TabsList className="border border-border bg-muted/40 p-1 rounded-2xl glass shadow-sm flex flex-nowrap h-auto gap-1">
            <TabsTrigger 
              value="create"
              className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200 shrink-0"
            >
              <ShoppingBag className="h-4 w-4" />
              Do Utworzenia
            </TabsTrigger>

            <TabsTrigger 
              value="orders_management"
              className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200 shrink-0"
            >
              <FileText className="h-4 w-4" />
              Zarządzanie Zleceniami & Partie
            </TabsTrigger>

            <TabsTrigger 
              value="mappings_and_settings"
              className="rounded-xl gap-2 px-4 py-2 text-xs font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary transition-all duration-200 shrink-0"
            >
              <Settings className="h-4 w-4" />
              Mapowania & Ustawienia Integracji
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Zawartość zakładek */}
        <div className="flex-1 min-h-0 w-full relative mt-2">
          {/* === Zakładka 1: Do Utworzenia === */}
          <TabsContent
            value="create"
            className="absolute inset-0 m-0 border-none outline-none data-[state=inactive]:hidden flex flex-col h-full"
          >
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1 rounded-2xl border bg-card/50 glass-dark shadow-sm overflow-hidden h-full"
            >
              <ResizablePanel defaultSize={62} minSize={35} className="bg-card/30">
                <PurchaseOrderDetailsColumn selectedOrderId={selectedDropshippingOrderId} />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/50 transition-colors w-1.5" />
              <ResizablePanel defaultSize={38} minSize={25} className="bg-muted/10">
                <MarketplaceOrderListColumn
                  selectedOrderId={selectedDropshippingOrderId}
                  onOrderSelect={(order: MarketplaceOrder) => setSelectedDropshippingOrderId(order.id)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          {/* === Zakładka 2: Zarządzanie Zleceniami & Partie === */}
          <TabsContent
            value="orders_management"
            className="absolute inset-0 m-0 border-none outline-none data-[state=inactive]:hidden overflow-y-auto h-full scrollbar-thin p-1"
          >
            <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full p-2 sm:p-4">
              <OrdersAndBatchesTab />
            </div>
          </TabsContent>

          {/* === Zakładka 3: Mapowania & Ustawienia Integracji === */}
          <TabsContent
            value="mappings_and_settings"
            className="absolute inset-0 m-0 border-none outline-none data-[state=inactive]:hidden overflow-y-auto h-full scrollbar-thin p-1"
          >
            <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full p-2 sm:p-4">
              <MappingsAndSettingsTab />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
