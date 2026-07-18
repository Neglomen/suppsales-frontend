"use client";

import { useState } from "react";
import { MarketplaceOrderListColumn } from "./_components/marketplace-order-list-column";
import { PurchaseOrderDetailsColumn } from "./_components/purchase-order-details-column";
import { DraftPurchaseOrders } from "./_components/draft-purchase-orders";
import { HistoryAndSettings } from "./_components/history-and-settings";
import { ProductSupplierMappings } from "./_components/product-supplier-mappings";
import { MarketplaceOrder } from "@/types/marketplace-order";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, FileText, Link2, Settings } from "lucide-react";
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
    <div className="space-y-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] flex flex-col overflow-hidden pb-4">
      {/* Szklany, premium nagłówek */}
      <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-slate-900/40 backdrop-blur-md p-6 md:p-8 shadow-xl shadow-black/10 shrink-0">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none animate-pulse" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
              Pulpit Sprzedawcy
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-none">
              Dropshipping
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Automatyzacja zamówień, śledzenie wysyłek hurtownianych i synchronizacja stanów w czasie rzeczywistym.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="create" className="flex-1 flex flex-col w-full min-h-0">
        {/* Górny pasek zakładek */}
        <div className="w-full flex justify-start pb-4 border-b border-border/10 shrink-0">
          <TabsList className="border border-border bg-muted/40 p-1 rounded-2xl glass shadow-sm flex h-auto gap-1">
            <TabsTrigger 
              value="create"
              className="rounded-xl gap-2 px-5 py-2.5 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Do Utworzenia
            </TabsTrigger>
            <TabsTrigger 
              value="send"
              className="rounded-xl gap-2 px-5 py-2.5 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
            >
              <FileText className="h-3.5 w-3.5" />
              Robocze
            </TabsTrigger>
            <TabsTrigger 
              value="mappings"
              className="rounded-xl gap-2 px-5 py-2.5 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
            >
              <Link2 className="h-3.5 w-3.5" />
              Mapowania
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="rounded-xl gap-2 px-5 py-2.5 text-xs font-semibold data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300"
            >
              <Settings className="h-3.5 w-3.5" />
              Historia i ustawienia
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Zawartość zakładek */}
        <div className="flex-1 min-h-0 w-full relative mt-4">
          {/* === Zakładka: Do Utworzenia === */}
          <TabsContent
            value="create"
            className="absolute inset-0 m-0 border-none outline-none data-[state=inactive]:hidden flex flex-col h-full"
          >
            <ResizablePanelGroup
              direction={isMobile ? "vertical" : "horizontal"}
              className="flex-1 rounded-2xl border bg-card/50 glass-dark shadow-sm overflow-hidden h-full"
            >
              <ResizablePanel defaultSize={isMobile ? 65 : 70} minSize={40} className="bg-card/30">
                <PurchaseOrderDetailsColumn selectedOrderId={selectedDropshippingOrderId} />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border/50" />
              <ResizablePanel defaultSize={isMobile ? 35 : 30} minSize={25} className="bg-muted/10">
                <MarketplaceOrderListColumn
                  selectedOrderId={selectedDropshippingOrderId}
                  onOrderSelect={(order: MarketplaceOrder) => setSelectedDropshippingOrderId(order.id)}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          {/* === Zakładka: Robocze === */}
          <TabsContent
            value="send"
            className="absolute inset-0 m-0 border-none outline-none data-[state=inactive]:hidden overflow-y-auto h-full scrollbar-thin"
          >
            <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full">
              <DraftPurchaseOrders />
            </div>
          </TabsContent>

          {/* === Zakładka: Mapowania ofert === */}
          <TabsContent
            value="mappings"
            className="absolute inset-0 m-0 border-none outline-none data-[state=inactive]:hidden overflow-y-auto h-full scrollbar-thin"
          >
            <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full">
              <ProductSupplierMappings />
            </div>
          </TabsContent>

          {/* === Zakładka: Historia i Ustawienia === */}
          <TabsContent
            value="history"
            className="absolute inset-0 m-0 border-none outline-none data-[state=inactive]:hidden overflow-y-auto h-full scrollbar-thin"
          >
            <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full">
              <HistoryAndSettings />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
