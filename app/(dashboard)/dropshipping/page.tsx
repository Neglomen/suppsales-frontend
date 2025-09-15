// src/app/(dashboard)/dropshipping/page.tsx
"use client";

import { useState } from "react";
import { MarketplaceOrder } from "@/types/marketplace-order";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { MarketplaceOrderListColumn } from "./_components/marketplace-order-list-column";
import { PurchaseOrderDetailsColumn } from "./_components/purchase-order-details-column";

// ### DODAJ NOWE IMPORTY ###
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DraftPurchaseOrders } from "./_components/draft-purchase-orders"; // Stworzymy ten komponent

export default function DropshippingPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    // ### START ZMIANY: Dodajemy zakładki do lewej kolumny ###
    <Tabs defaultValue="create" className="h-full w-full">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full max-h-[calc(100vh-3.5rem)] rounded-lg border"
      >
        <ResizablePanel defaultSize={70} minSize={40} className="flex flex-col">
          <div className="p-4 border-b">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Do Utworzenia</TabsTrigger>
              <TabsTrigger value="send">Robocze (do wysłania)</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="create" className="flex-1 overflow-y-auto">
            <PurchaseOrderDetailsColumn selectedOrderId={selectedOrderId} />
          </TabsContent>
          <TabsContent value="send" className="flex-1 overflow-y-auto">
            <DraftPurchaseOrders />
          </TabsContent>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={25}>
          {/* Prawa kolumna pozostaje bez zmian */}
          <MarketplaceOrderListColumn
            selectedOrderId={selectedOrderId}
            onOrderSelect={(order) => setSelectedOrderId(order.id)}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </Tabs>
    // ### KONIEC ZMIANY ###
  );
}
