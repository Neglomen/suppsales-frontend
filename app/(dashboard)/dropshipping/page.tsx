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

export default function DropshippingPage() {
  const [selectedDropshippingOrderId, setSelectedDropshippingOrderId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <Tabs defaultValue="create" className="flex-1 flex flex-col w-full min-h-0">
        {/* Górny pasek zakładek */}
        <div className="w-full flex justify-center py-3 border-b bg-muted/20 shrink-0">
          <TabsList className="grid w-auto grid-cols-4 gap-0">
            <TabsTrigger value="create">Do Utworzenia</TabsTrigger>
            <TabsTrigger value="send">Robocze</TabsTrigger>
            <TabsTrigger value="mappings">Mapowania</TabsTrigger>
            <TabsTrigger value="history">Historia i ustawienia</TabsTrigger>
          </TabsList>
        </div>

        {/* === Zakładka: Do Utworzenia (split panel) === */}
        <TabsContent
          value="create"
          className="flex-1 w-full max-w-[1600px] mx-auto p-4 mt-0 border-none outline-none data-[state=inactive]:hidden min-h-0 h-full flex flex-col"
        >
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 rounded-2xl border bg-card/50 glass-dark shadow-sm overflow-hidden h-full"
          >
            <ResizablePanel defaultSize={70} minSize={40} className="bg-card/30">
              <PurchaseOrderDetailsColumn selectedOrderId={selectedDropshippingOrderId} />
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border/50" />
            <ResizablePanel defaultSize={30} minSize={25} className="bg-muted/10">
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
          className="flex-1 w-full max-w-[1600px] mx-auto p-4 mt-0 border-none outline-none data-[state=inactive]:hidden min-h-0 h-full overflow-y-auto"
        >
          <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full">
            <DraftPurchaseOrders />
          </div>
        </TabsContent>

        {/* === Zakładka: Mapowania ofert === */}
        <TabsContent
          value="mappings"
          className="flex-1 w-full max-w-[1600px] mx-auto p-4 mt-0 border-none outline-none data-[state=inactive]:hidden min-h-0 h-full overflow-y-auto"
        >
          <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full">
            <ProductSupplierMappings />
          </div>
        </TabsContent>

        {/* === Zakładka: Historia i Ustawienia === */}
        <TabsContent
          value="history"
          className="flex-1 w-full max-w-[1600px] mx-auto p-4 mt-0 border-none outline-none data-[state=inactive]:hidden min-h-0 h-full overflow-y-auto"
        >
          <div className="rounded-2xl border bg-card/50 glass-dark shadow-sm min-h-full">
            <HistoryAndSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
