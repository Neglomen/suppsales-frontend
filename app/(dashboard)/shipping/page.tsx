"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { OrderListColumn } from "./_components/order-list-column";
import { OrderDetailsColumn } from "./_components/order-details-column";
import { ShippingHistoryTable } from "./_components/shipping-history-table";
import { MarketplaceOrder } from "@/types/marketplace-order";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ShippingPage() {
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(
    null
  );
  const queryClient = useQueryClient();

  const handleShipmentCreated = (orderId: string) => {
    // Unieważnij zapytanie o kluczu 'shippingOrders', co spowoduje ponowne pobranie
    // danych dla listy zamówień (i usunięcie z niej wysłanego zamówienia).
    queryClient.invalidateQueries({ queryKey: ["shippingOrders"] });

    // Wyczyść zaznaczenie, aby pokazać widok powitalny w lewej kolumnie
    setSelectedOrder(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      <Tabs defaultValue="to-ship" className="flex-1 flex flex-col w-full items-center min-h-0">
        <div className="w-full flex justify-center py-3 border-b bg-muted/20 shrink-0">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="to-ship">Do wysłania</TabsTrigger>
            <TabsTrigger value="history">Historia wysyłek</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="to-ship" className="flex-1 w-full px-4 pb-4 mt-0 border-none outline-none data-[state=inactive]:hidden min-h-0 h-full flex flex-col">
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 rounded-2xl border bg-card/50 glass-dark shadow-sm overflow-hidden h-full"
          >
            <ResizablePanel defaultSize={70} minSize={40} className="bg-card">
              <OrderDetailsColumn
                order={selectedOrder}
                onShipmentCreated={handleShipmentCreated}
              />
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-border/50" />
            <ResizablePanel defaultSize={30} minSize={25} className="bg-muted/10">
              <OrderListColumn
                selectedOrder={selectedOrder}
                onOrderSelect={setSelectedOrder}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        <TabsContent value="history" className="flex-1 w-full px-4 pb-4 mt-0 border-none outline-none data-[state=inactive]:hidden overflow-hidden min-h-0 h-full flex flex-col">
          <div className="glass p-6 rounded-2xl border shadow-sm flex-1 overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4 shrink-0">Wygenerowane etykiety</h2>
            <div className="flex-1 overflow-y-auto">
              <ShippingHistoryTable />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
